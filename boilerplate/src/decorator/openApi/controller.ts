import {
    ControllerOption,
    controller as controllerDecorator,
    getClassMetadata,
    attachClassMetadata,
} from 'midway'

import { Controller } from 'egg'
import { openApiKey } from './enum'
import { ParamMap, ParamRule } from './paramGetter'
import { config } from './config'
import { regController } from './document'
import symbolName from '../../typings/api/apiSymbolName'

// @ts-ignore
const midway = require('midway')


type ControllerRouterBaseOption = ControllerOption['routerOptions']

const COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm
const DEFAULT_PARAMS = /=[^,]*/gm
const FAT_ARROWS = /=>.*$/gm

/**
 * 取方法的参数名
 * @param fn
 */
export function getParameterNames(fn: any) {
    if (!fn) {
        console.warn('NO fn for getParameterNames!')
        return []
    }
    let code = typeof fn === 'function' ? fn.toString() : fn

    let right = 0
    for (let i = 0; i < code.length; i++) {
        const char = code[i]
        if (char === '(') {
            right++
        } else if (char === ')') {
            right--
            if (right === 0) {
                right = i
                break
            }
        }
    }

    code = code.substring(code.indexOf('(') + 1, right).replace(COMMENTS, '')

    const sub = code.match(/\(.*?\)/g)
    if (sub) sub.forEach((sub) => (code = code.replace(sub, '')))

    return (code
        .replace(DEFAULT_PARAMS, '')
        .replace(FAT_ARROWS, '')
        .match(/([^\s,]+)/g) || []) as string[]
}

export interface ActionInfo {
    path: string
    method: ActionMethod
    routerOptions: ActionRouterOption
    action: string
    paramRule: ParamRule
    paramNames: string[]
}

export type ActionMethod =
    | 'get'
    | 'post'
    | 'del'
    | 'put'
    | 'patch'
    | 'options'
    | 'head'
    | 'all'

/**
 * 方法装饰器
 * @param method
 */
const createRouterDecorator = (method: ActionMethod) => (
    path?: string,
    routerOptions: ActionRouterOption = { 
        middleware: [],
        responses: 'any'
    }
): MethodDecorator => {
    return (target, key, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value
        const paramMaps: ParamMap[] | undefined = getClassMetadata(
            openApiKey.param,
            target
        )
        /**
         * 取参数规则
         */
        let paramRule: ParamRule
        if (paramMaps) {
            const pKey = String(key)
            const paramMap = paramMaps.find((v) => v[pKey])
            if (paramMap && paramMap[pKey]) {
                paramRule = paramMap[pKey]
            }
        }
        const paramNames = getParameterNames(originalMethod)
        // const paramTypes = Reflect.getMetadata('design:paramtypes', target, key)
        // console.log(paramTypes)

        attachClassMetadata(
            openApiKey.action,
            {
                path,
                method,
                routerOptions,
                action: key,
                paramRule,
                paramNames,
            } as ActionInfo,
            target
        )

        descriptor.value = async function (this: Controller, ...args: any[]) {
            let res: any
            // 有自定义规则
            if (paramRule) {
                let params: any[] = []
                args.forEach((arg, index) => {
                    if (paramRule[index]) {
                        const { custom, type } = paramRule[index]
                        const name = paramNames[index]
                        // 返回自定义的值
                        params.push(custom(this.ctx, name, type))
                    } else {
                        params.push(arg)
                    }
                })
                if (args.length === 2 && typeof args[1] === 'function') {
                    params.push(args[1])
                }
                res = await originalMethod.apply(this, params)
            } else {
                res = await originalMethod.apply(this, args)
            }

            if (res !== undefined) {
                this.ctx.body = res
            }
        }

        return midway[method](path, routerOptions)(target, key, descriptor)
    }
}

export const post = createRouterDecorator('post')
export const get = createRouterDecorator('get')
export const del = createRouterDecorator('del')
export const put = createRouterDecorator('put')
export const patch = createRouterDecorator('patch')
export const options = createRouterDecorator('options')
export const head = createRouterDecorator('head')
export const all = createRouterDecorator('all')

/**
 * Controller 路由配置
 */
export interface ControllerRouterOption extends ControllerRouterBaseOption {
    name?: string
    description?: string
}

export interface ControllerInfo {
    prefix: string
    routerOptions: ControllerRouterOption
}

/**
 * Action 路由配置
 */
export interface ActionRouterOption extends ControllerRouterOption {
    name?: string
    description?: string
    responses?: symbolName
}

/**
 * Controller 装饰器
 * @param prefix
 * @param routerOptions
 */
export function controller(
    prefix: string,
    routerOptions: ControllerRouterOption = {
        middleware: [],
        sensitive: true,
    }
): ClassDecorator {
    return (target: any) => {
        attachClassMetadata(
            openApiKey.contraller,
            {
                prefix,
                routerOptions,
            } as ControllerInfo,
            target
        )
        if (config.enable) {
            regController(target)
        }
        // console.log(getClassMetadata(openApiKey.contraller, target))
        return controllerDecorator(prefix, routerOptions)(target)
    }
}
