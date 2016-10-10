/**
 * 菜单信息模块
 * Created by yinfxs on 16-8-7.
 */
'use strict';

module.exports = [
    {
        "code": "preset",
        "label": "${menu_preset}",
        "icon": "bars",
        "items": [
            {
                "code": "sysmgr",
                "label": "${menu_sysmgr}",
                "icon": "users",
                "items": [
                    {
                        "code": "user",
                        "label": "${menu_user}",
                        "icon": "user",
                        "uri": "/preset/user"
                    },
                    {
                        "code": "param",
                        "label": "${menu_param}",
                        "icon": "internet-explorer",
                        "uri": "/preset/param"
                    }
                ]
            },
            {
                "code": "commdl",
                "label": "${menu_commdl}",
                "icon": "list",
                "uri": "/preset/commdl"
            },
            {
                "code": "baidu",
                "label": "百度一下",
                "icon": "list",
                "uri": "https://www.baidu.com"
            },
            {
                "code": "yinfxs",
                "label": "${menu_yinfxs}",
                "icon": "list",
                "uri": "https://github.com/yinfxs",
                "out": true
            },
            {
                "code": "defcom",
                "label": "${menu_defcom}",
                "icon": "list",
                "uri": "com:defcomponent"
            }
        ]
    },
    {
        "code": "business",//模块编码不能重复
        "label": "${menu_business}",
        "icon": "suitcase",
        "items": [
            {
                "code": "dept",//菜单编码模块内不能重复
                "label": "${menu_deptlabel}",
                "icon": "bell",
                "uri": "/business/dept"
            },
            {
                "code": "busparam",
                "label": "${menu_busparam}",
                "icon": "list",
                "uri": "/business/param",
                // "list": "busparamList",
                "form": "busparamForm"
            }
        ]
    }
];