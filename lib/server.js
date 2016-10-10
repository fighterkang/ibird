/**
 * ibird
 * Created by yinfxs on 16-5-30.
 */

'use strict';

const _ = require('underscore');
const assign = require('object-assign');
const path = require('path');
const fs = require('fs');
const express = require('express');
const moment = require('moment');
moment.locale('zh-cn');
const multipart = require('connect-multiparty');
// const multipartmdl = multipart({uploadDir: path.resolve(__dirname, '../public')});

const app = require('./express');
const model = require('./model/adapter');
const modelRoute = require('./route/adapter');
const moduleRoute = require('./route/module');
const Redis = require('./utils/redis');
const mongodb = require('./utils/mongodb');
const mssql = require('./utils/mssql');
const mysql = require('./utils/mysql');
const utility = require('./utils/utility');
const i18n = require('./utils/i18n');
const log = require('./utils/log');
const docs = require('./utils/docs');
const tasks = require('./utils/tasks');

exports.app = app;
exports.auth = require('./utils/auth');
exports.authmdl = require('./middleware/authmdl');
exports.configs = {};
exports.redis = {};
exports.models = {};//模型搜集器
exports.mssql = mssql;
exports.hooks = {};
exports.hooksdata = {};


/**
 * 初始化配置
 *
 * @returns {string}
 */
exports.initialize = function (configs) {
    //国际化设置
    configs.i18n = i18n(configs.i18n);
    if (configsValidate(configs)) return exports;
    //导出配置
    exports.configs = configs;
    //初始化
    log(module, configs.config.logpath);

    const ds = configs.config.ds ? configs.config.ds.toLowerCase() : 'mongodb';//默认MongoDB
    //初始化数据源
    switch (ds) {
        case 'mongodb':
            //MongoDB
            mongodb(configs.config.mongodb);
            break;
        case 'mssql':
            //SQLServer
            mssql.getConnection(configs.config.mssql);
            break;
        case 'mysql':
            //MySQL
            mysql(configs.config.mysql);
            break;
    }
    exports.redis = Redis(configs.config.redis);//Redis连接初始化
    exports.auth.initialize(configs.config.auth);//授权初始化
    docs(configs, configs.config.ruprefix);//文档初始化
    //挂载自定义express中间件
    if (configs.middlewares) configs.middlewares(app);
    //设置public目录，用于存储上传文件
    app.use('/public', express.static(configs.public));
    //如果存在客户端目录的话，挂载客户端目录
    if (configs.config.client) {
        const route = configs.config.route || '/admin';
        const client = configs.config.client;
        app.use(route, express.static(client));
    }
    //跨域调用
    if (exports.configs.config['cross-domain']) {
        app.use(function (req, res, next) {
            res.set('Access-Control-Allow-Origin', '*');
            res.set('Access-Control-Allow-Credentials', 'true');
            res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
            res.set('Access-Control-Allow-Headers', 'Content-Type,Accept,access_token');
            next();
        });
    }
    //提取模块配置部分
    const modules = _.pick(configs, 'modules').modules;
    const hooks = exports.hooks = configs.hooks, hooksdata = exports.hooksdata = {};
    //注册数据模型
    utility.execHooks(hooks, 'pre-model', app, configs, hooksdata);
    model(ds, modules, exports.models, function () {
        utility.execHooks(hooks, 'post-model', app, configs, hooksdata);
    });
    //注册模块声明路由，顺序先于模型路由是为了允许用户自定义重写默认的模型路由
    utility.execHooks(hooks, 'pre-module-route', app, configs, hooksdata);
    moduleRoute(app, modules, configs.config.ruprefix, function () {
        utility.execHooks(hooks, 'post-module-route', app, configs, hooksdata);
    });
    //注册模型默认路由
    utility.execHooks(hooks, 'pre-model-route', app, configs, hooksdata);
    modelRoute(app, modules, exports.models, configs.config.ruprefix, function () {
        utility.execHooks(hooks, 'post-model-route', app, configs, hooksdata);
    });
    //加载框架默认路由
    defaultRoutes(configs.config.ruprefix);
    //加载调度任务
    tasks.init(configs.tasks);
    //返回导出对象
    return exports;
};

/**
 * 配置验证
 */
function configsValidate(configs) {
    if (!configs.public) return console.log(i18n.value('configs_public'));
}
/**
 * 服务端默认路由设置
 */
function defaultRoutes(ruprefix = '') {
    app.get('/', function (req, res) {
        res.end('Hello ibird-server!');
    });

    app.post(ruprefix + '/i18n', function (req, res) {
        const lang = req.query.lang || req.body.lang;
        const result = i18n.set(lang);
        if (result == false) return res.json({err: {message: i18n.value('invalid_i18n_setting')}});
        return res.json({lang: lang, i18n: result});
    });

    app.get(ruprefix + '/configs', function (req, res) {
        const flag = req.query.flag || 'public';
        const access_token = req.get('access_token');
        const i18nConfig = {lang: i18n.selected(), i18n: i18n.object()};
        const result = {};
        switch (flag) {
            case 'public':
                assign(result, i18nConfig, utility.pick(exports.configs, ['name']));
                const json = i18n.format(utility.deepClone(result));
                return res.json(json);
            case 'private':
                exports.auth.authentication(access_token, function (err, r) {
                    if (err || !r) return res.json({err: {message: i18n.value('unauthorized_operation')}});
                    const modules = [];
                    exports.configs.modules.forEach(function (module) {
                        if (!module) return;
                        modules.push(utility.pick(module, ['code', 'label', 'schemas']))
                    });
                    assign(result, i18nConfig, {modules: modules}, utility.pick(exports.configs, ['name', 'menu']));
                    const json = i18n.format(utility.deepClone(result));
                    return res.json(json);
                });
                break;
        }
    });

    app.post(ruprefix + '/upload', multipart({uploadDir: exports.configs.public}), function (req, res) {
        const files = req.files ? req.files.files : [];
        const resultArray = [];
        files.forEach(function (file) {
            if (!file) return;
            const filePath = file.path;
            resultArray.push('/public/' + filePath.substring(file.path.lastIndexOf('/') + 1));
        });
        return res.json(resultArray);
    });
}

/**
 * 路由
 */
exports.start = function () {
    const port = exports.configs.config.port || 3000;
    utility.execHooks(exports.hooks, 'pre-start', app, exports.configs, exports.hooksdata);
    app.listen(port, function () {
        console.log(i18n.value('ibird_running', [port, 'http://127.0.0.1:' + port]));
        utility.execHooks(exports.hooks, 'post-start', app, exports.configs, exports.hooksdata);
    });
};