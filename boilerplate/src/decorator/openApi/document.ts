/**
 * 文档构建
 */
import { openApiKey } from './enum'
import { getClassMetadata } from 'midway'
import { ControllerInfo, ActionInfo } from './controller'
import {
    OpenAPI3,
    OpenAPI3Paths,
    OpenAPI3Parameter,
    OpenAPI3Content,
    InType
} from './types'
import { SchemaObject } from 'openapi3-ts'
import { ParamRuleInfo } from './paramGetter'
import getInterface from './tsSchema'

/**
 * 存放注册的路由
 */
const _controller: any[] = []

export function regController(target: any) {
    if (!_controller.includes(target)) {
        _controller.push(target)
    }
}

export interface SecuritySchemes {
    [name: string] : {
        type: string
        in: InType,
        name: string
    }
}

/**
 * 文档默认配置
 */
const _docConfig = {
    title: '',
    description: '',
    version: '1.0.0',
    securitySchemes: {} as SecuritySchemes
}

/**
 * 返回配置
 */
export function getDocConfig() {
    return _docConfig
}

/**
 * 配置文档
 */
export default function() {
    return {
        /**
         * 设置文档标题
         * @param title
         */
        setTitle(title: string) {
            _docConfig.title = title
            return this
        },
        /**
         * 设置描述
         * @param desc 
         */
        setDescription(desc: string) {
            _docConfig.description = desc
            return this
        },
        /**
         * 设备版本
         * @param version 
         */
        setVersion(version: string) {
            _docConfig.version = version
            return this
        },
        /**
         * 设置验证方式
         * @param securitySchemes
         */
        setSecuritySchemes(securitySchemes: SecuritySchemes) {
            _docConfig.securitySchemes = securitySchemes
            return this
        },
        /**
         * 生成 openApi json
         */
        build() {
            return builder()
        }
    }
}

/**
 * 生成 openApi json
 */
export function builder() {
    const openApi = {
        info: {
            title: _docConfig.title,
            description: _docConfig.description,
            version: _docConfig.version
        },
        openapi: '3.0.0',
        paths: {},
        components: {
            schemas: {},
            securitySchemes: _docConfig.securitySchemes
        },
        tags: [],
    } as OpenAPI3

    for (const ctr of _controller) {
        const res = getClassMetadata(
            openApiKey.contraller,
            ctr
        ) as ControllerInfo[]
        if (res && Array.isArray(res)) {
            res.forEach((v) => {
                const res = getContrallerInfo(
                    ctr,
                    v,
                    openApi.components.schemas
                )
                openApi.tags.push(res.tag)

                res.paths.forEach((pathObj) => {
                    Object.keys(pathObj).forEach((path) => {
                        if (!openApi.paths[path]) {
                            openApi.paths[path] = pathObj[path]
                        } else {
                            openApi.paths[path] = {
                                ...openApi.paths[path],
                                ...pathObj[path],
                            }
                        }
                    })
                })
            })
        }
    }

    return openApi
}

/**
 * 取 contraller 配置
 * @param target 
 * @param info 
 * @param components 
 */
function getContrallerInfo(
    target: any,
    info: ControllerInfo,
    components: {
        [name: string]: SchemaObject
    } = {}
) {
    const name = target.name
    const paths: OpenAPI3Paths[] = []

    const actions = getClassMetadata(openApiKey.action, target) as ActionInfo[]
    if (actions && Array.isArray(actions)) {
        actions.forEach((v) =>
            paths.push(getActionInfo(target, v, info, components))
        )
    }
    return {
        tag: {
            name,
            description: info.routerOptions.description,
        },
        paths,
    }
}

/**
 * 解释路由上的参数
 * @param url
 */
function parseParamsInPath(url: string) {
    const names: string[] = []
    url.split('/').forEach((item) => {
        if (item.startsWith(':')) {
            const paramName = item.substr(1)
            names.push(paramName)
        }
    })
    return names
}

/**
 * 替换成 openapi 的url
 * @param url
 * @param names
 */
function replaceUrl(url: string, names: string[]) {
    names.forEach((n) => {
        url = url.replace(`:${n}`, `{${n}}`)
    })
    return url
}

/**
 * 解释单个参数
 * @param name
 * @param rule
 */
function parseSingleParame(
    name: string,
    rule: ParamRuleInfo,
    inType: 'path' | 'query' | 'header'
): OpenAPI3Parameter {
    return {
        name: rule.options.name || name,
        in: inType,
        required: inType === 'path' ? true : rule.options.required === true,
        description: rule.options.description,
        schema: {
            type: 'string',
            ...rule.options,
            required: undefined,
            description: undefined,
            name: undefined,
        },
    }
}

/**
 * 解释 query 的 interface 类型参数
 * 注, 只支持简单对象
 * @param name
 * @param rule
 * @param inType
 */
function parseInterfaceParameByQuery(rule: ParamRuleInfo) {
    const inter = getInterface(rule.type)

    if (!inter.components || !inter.schema || !inter.schema.$ref) {
        return []
    }

    const name = Object.keys(inter.components).shift()
    const req = inter.components[name]
    if (!name || !req || !req.properties) {
        return []
    }

    return Object.keys(req.properties).map((name) => {
        const val = req.properties[name] as SchemaObject
        return {
            name,
            description: val.description,
            in: 'query',
            required: req.required.includes(name),
            schema: {
                type: 'string',
                ...val,
                description: undefined,
            },
        } as OpenAPI3Parameter
    })
}

/**
 * 解释单个 body 参数
 * @param name
 * @param rule
 */
function parseSingleBody(name: string, rule: ParamRuleInfo) {
    const inter = getInterface(rule.type)

    return {
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        [rule.options.name || name]: inter.schema,
                    },
                },
            },
        } as OpenAPI3Content,
        components: inter.components || {},
    }
}

/**
 * 解释body 参数
 * @param rule
 */
function parseBody(rule: ParamRuleInfo) {
    const inter = getInterface(rule.type)

    return {
        content: {
            'application/json': {
                schema: inter.schema,
            },
        } as OpenAPI3Content,
        components: inter.components || {},
    }
}

/**
 * 取 action 的 open api 信息
 * @param target 
 * @param info 
 * @param ctrInfo 
 * @param components 
 */
function getActionInfo(
    target: any,
    info: ActionInfo,
    ctrInfo: ControllerInfo,
    components: {
        [name: string]: SchemaObject
    } = {}
) {
    const pathParams = parseParamsInPath(info.path)
    const fullPath = `${ctrInfo.prefix}${replaceUrl(info.path, pathParams)}`
    const parameters: OpenAPI3Parameter[] = []
    const responses = {
        default: {
            description: 'default',
            content: {
                'application/json': {
                    schema: {},
                },
            } as OpenAPI3Content,
        },
    }

    const security: {
        [name: string]: string[]
    }[] = Object.keys(_docConfig.securitySchemes).map(v => {
        return {
            [v]: []
        }
    })
    let requestBody = {
        content: {} as OpenAPI3Content,
    }

    const responsesType = info.routerOptions.responses || 'any'

    // 处理 res
    const res = getInterface(responsesType)
    responses.default.content['application/json'].schema = res.schema
    Object.keys(res.components).forEach(key => {
        components[key] = res.components[key]
    })

    // 处理 req
    info.paramNames.forEach((name, ix) => {
        const rule = info.paramRule[ix]

        if (rule.source === 'Param') {
            if (!pathParams.includes(name)) {
                throw new Error(
                    `${target.name}.${info.action} path name: ${name} not in path`
                )
            }
            parameters.push(parseSingleParame(name, rule, 'path'))
        } else if (rule.source === 'Query') {
            parameters.push(parseSingleParame(name, rule, 'query'))
            requestBody = undefined
        } else if (rule.source === 'Header') {
            parameters.push(parseSingleParame(name, rule, 'header'))
        } else if (rule.source === 'Querys') {
            const res = parseInterfaceParameByQuery(rule)
            res.forEach((v) => parameters.push(v))
        } else if (rule.source === 'Body') {
            const res = parseSingleBody(name, rule)

            Object.keys(res.content).forEach((type) => {
                if (!requestBody.content[type]) {
                    requestBody.content[type] = res.content[type]
                } else if (
                    requestBody.content[type].schema &&
                    requestBody.content[type].schema.properties
                ) {
                    requestBody.content[type].schema.properties = {
                        ...requestBody.content[type].schema.properties,
                        ...res.content[type].schema.properties,
                    }
                }
            })

            Object.keys(res.components).forEach((key) => {
                components[key] = res.components[key]
            })
        } else if (rule.source === 'Bodys') {
            const res = parseBody(rule)
            requestBody.content = res.content
            Object.keys(res.components).forEach(key => {
                components[key] = res.components[key]
            })
        }
    })

    return {
        [fullPath]: {
            [info.method]: {
                operationId: `${fullPath}:${info.method}::${info.action}`,
                tags: [target.name],
                summary: info.routerOptions.description || info.action,
                parameters,
                requestBody,
                responses,
                security: security.length ? security : undefined
            },
        },
    } as OpenAPI3Paths
}
