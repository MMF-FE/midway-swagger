/**
 * 参数解释
 * 支持基于 interface 的参数验证
 */
import { Context, attachClassMetadata, getClassMetadata } from 'midway'
import { openApiKey } from './enum'
import symbolName from '../../typings/api/apiSymbolName'
import * as Ajv from 'ajv'
import { getSchemaObject } from './tsSchema'
import { SchemaObject } from 'openapi3-ts'

const ajv = new Ajv()

export type ParamSourceEnum =
    | 'Query'
    | 'Querys'
    | 'Body'
    | 'Bodys'
    | 'Param'
    | 'Header'

export type ParamGetterType = (
    ctx: Context,
    name?: string,
    type?: symbolName
) => any

export interface ParamRule {
    [index: number]: ParamRuleInfo
}

export interface ParamRuleInfo {
    custom: ParamGetterType
    type: symbolName
    source: ParamSourceEnum
    options: ParamOptions
}

export interface ParamMap {
    [key: string]: ParamRule
}

/**
 * 自定义取值
 * @param custom
 * @param type
 * @param source
 * @param options
 */
function FromCustom(
    custom: ParamGetterType,
    type: symbolName,
    source: ParamSourceEnum,
    options: ParamOptions = {}
): ParameterDecorator {
    return (target, key, index) => {
        const paramMap: ParamMap[] = getClassMetadata(openApiKey.param, target)
        let params: ParamMap
        if (!paramMap || !paramMap.length) {
            params = {}
        } else {
            params = paramMap[0]
        }
        const pKey = String(key)
        if (!params[pKey]) {
            params[pKey] = {}
        }
        params[pKey][index] = {
            custom,
            type,
            source,
            options,
        }

        attachClassMetadata(openApiKey.param, params, target)
    }
}

/**
 * 自定义参数属性
 */
export interface ParamOptions {
    /**
     * 源数据上的参数名, 对 Param , Header, Query, Body 有效
     */
    name?: string
    /**
     * 参数描述
     */
    description?: string
    /**
     * 是否必须选
     */
    required?: boolean
    /**
     * 默认值
     */
    default?: any
    /**
     * 可选择的数据
     */
    enum?: string[]
    /**
     * 最小值
     */
    minimum?: number

    /**
     * 最大值
     */
    maximum?: number

    /**
     * 数组最小数量
     */
    minItems?: number

    /**
     * 数组最大数量
     */
    maxItems?: number

    /**
     * 最小长度
     */
    minLength?: number

    /**
     * 最大长度
     */
    maxLength?: number

    /**
     * 正则
     * 如: ^[A-Za-z0-9]+$
     */
    pattern?: string
}

/**
 * 生成验证规则
 * @param type
 * @param options
 * @param name
 */
function buildSchema(
    type: symbolName,
    options: ParamOptions = {},
    name?: string
) {
    let enumList: Array<string | number> = options.enum
    if (type === 'number' && enumList) {
        enumList = enumList.map(Number)
    }

    switch (type) {
        case 'boolean':
        case 'number':
        case 'string':
            // @ts-ignore
            return {
                type: 'object',
                properties: {
                    [options.name || name]: {
                        ...options,
                        name: undefined,
                        enum: enumList,
                        type,
                    },
                },
            } as SchemaObject
        case 'any':
            return
        default:
            const res = getSchemaObject(type)
            return res
    }
}

/**
 * 格式化数据
 * @param val
 * @param type
 */
function formatVal(val: string, type: 'string' | 'number' = 'string') {
    if (val === undefined) {
        return val
    }

    switch (type) {
        case 'number':
            return parseFloat(val)
        default:
            return String(val).trim()
    }
}

/**
 * 取 url 上的单个 get 参数
 * @param type
 * @param options
 */
export function Query(
    type: 'string' | 'number' = 'string',
    options: ParamOptions = {}
) {
    const schema = buildSchema(type, options, '_')
    let validate: Ajv.ValidateFunction

    if (schema) {
        validate = ajv.compile(schema)
    }

    return FromCustom(
        (ctx: Context, name?: string) => {
            const pName = options.name || name
            const val = formatVal(ctx.query[pName], type)
            if (validate) {
                if (
                    !validate({
                        _: val,
                    })
                ) {
                    const msg = (validate.errors || []).map((v) => v.message)
                    ctx.throw(400, `${pName}: ${msg.join(';')}`)
                }
            }
            return val
        },
        type,
        'Query',
        options
    )
}

/**
 * 取 url 上的所有 get 参数
 * @param type 为 any 时, 不会生成 openApi 参数
 * @param options
 */
export function Querys(type: symbolName, options: ParamOptions = {}) {
    let schema: SchemaObject
    let validate: Ajv.ValidateFunction

    return FromCustom(
        (ctx: Context) => {
            // 直接返回,不验证
            if (type === 'any') {
                return ctx.query
            }
            const val = ctx.query

            if (!validate) {
                schema = buildSchema(type, options)
                validate = ajv.compile(schema)
            }
            if (validate) {
                if (!validate(val)) {
                    const msg = (validate.errors || []).map((v) => v.message)
                    ctx.throw(400, `${msg.join(';')}`)
                }
            }
            return val
        },
        type,
        'Querys',
        options
    )
}

/**
 * 取 body 上取单个参数
 * @param type
 * @param options
 */
export function Body(type: symbolName = 'any', options: ParamOptions = {}) {
    let schema: SchemaObject
    let validate: Ajv.ValidateFunction

    return FromCustom(
        (ctx: Context, name?: string) => {
            const pName = options.name || name
            const val = (ctx.request.body || {})[pName]
            // 直接返回,不验证
            if (type === 'any') {
                return val
            }
            const isObject = !['string', 'number', 'boolean'].includes(type)

            if (!validate) {
                schema = isObject
                    ? buildSchema(type, options)
                    : buildSchema(type, options, '_')
                validate = ajv.compile(schema)
            }

            const data = isObject ? val : { _: val }
            if (validate) {
                if (!validate(data)) {
                    const msg = (validate.errors || []).map((v) => v.message)
                    ctx.throw(400, `${pName}: ${msg.join(';')}`)
                }
            }
            return val
        },
        type,
        'Body',
        options
    )
}

/**
 * 取 body 上所有参数
 * @param type
 * @param options
 */
export function Bodys(type: symbolName = 'any', options: ParamOptions = {}) {
    let schema: SchemaObject
    let validate: Ajv.ValidateFunction

    return FromCustom(
        (ctx: Context) => {
            const val = ctx.request.body
            // 直接返回,不验证
            if (type === 'any') {
                return val
            }
            if (!validate) {
                schema = buildSchema(type, options)
                validate = ajv.compile(schema)
            }
            if (validate) {
                if (!validate(val)) {
                    const msg = (validate.errors || []).map((v) => v.message)
                    ctx.throw(400, `${msg.join(';')}`)
                }
            }
            return val
        },
        type,
        'Bodys',
        options
    )
}

/**
 * 取路由上的单个 path 参数
 * @param type
 */
export function Param(
    type: 'string' | 'number' = 'string',
    options: ParamOptions = {}
) {
    const schema = buildSchema(type, options, '_')
    let validate: Ajv.ValidateFunction

    if (schema) {
        validate = ajv.compile(schema)
    }
    return FromCustom(
        (ctx: Context, name?: string) => {
            console.log(ctx)
            const pName = options.name || name
            const val = formatVal((ctx.params || {})[pName], type)
            if (validate) {
                if (
                    !validate({
                        _: val,
                    })
                ) {
                    const msg = (validate.errors || []).map((v) => v.message)
                    ctx.throw(400, `${pName}: ${msg.join(';')}`)
                }
            }
            return val
        },
        type,
        'Param',
        options
    )
}

/**
 * 取 header 上的单个参数
 * @param type
 */
export function Header(
    type: 'string' | 'number' = 'string',
    options: ParamOptions = {}
) {
    const schema = buildSchema(type, options, '_')
    let validate: Ajv.ValidateFunction

    if (schema) {
        validate = ajv.compile(schema)
    }
    return FromCustom(
        (ctx: Context, name?: string) => {
            const pName = (options.name || name).toLocaleLowerCase()
            const val = formatVal(ctx.header[pName], type)
            if (validate) {
                if (
                    !validate({
                        _: val,
                    })
                ) {
                    const msg = (validate.errors || []).map((v) => v.message)
                    ctx.throw(400, `${pName}: ${msg.join(';')}`)
                }
            }
            return val
        },
        type,
        'Header',
        options
    )
}
