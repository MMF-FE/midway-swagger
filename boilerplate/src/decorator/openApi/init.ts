/**
 * 初始化
 */
import { config } from './config'
import * as fs from 'fs-extra'
import * as path from 'path'
import { init, genCode } from './tsSchema'
import { Application } from 'midway'

const symbolNames = `
type symbolName =
    | 'number'
    | 'boolean'
    | 'string'
    | 'any'

export default symbolName
`

const baseType = `/**
 * 注释说明
 * @minimum 最小值
 * @maximum 最大值
 *
 * @minItems 数组最小数量
 * @maxItems 数组最大数量
 *
 * @minLength 最小长度
 * @maxLength 最大长度
 *
 * @pattern 正则, 如: ^[A-Za-z0-9]+$
 *
 * @default 默认值
 *
 */
declare module API {
    interface ErrorRes {
        message: string
    }
}
`
/**
 * 初始化
 * @param config 
 * @param app 
 */
export default function (app: Application) {
    /**
     * 生成 API typings 目录
     */
    fs.ensureDirSync(config.typingsPath)
    const apiSymbolNameFile = path.join(
        app.getConfig('baseDir'),
        'typings',
        'api',
        'apiSymbolName.d.ts'
    )
    /**
     * 本地开发模式, 动态生成 symbolName(type) 的类型
     */
    const watch = app.getConfig('env') === 'local'

    /**
     * 生成 API namespace
     */
    const baseTypeFile = path.join(config.typingsPath, 'base.d.ts')
    if (!fs.pathExistsSync(baseTypeFile)) {
        fs.writeFileSync(baseTypeFile, baseType, 'utf8')
    }
    /**
     * 初始化 symbolName 类型 文件, 主要用于 symbolName(type)  变量名自动完成
     */
    if (!fs.pathExistsSync(apiSymbolNameFile)) {
        fs.writeFileSync(apiSymbolNameFile, symbolNames, 'utf8')
    }

    init(config.typingsPath)

    /**
     * 动态生成 symbolName(type)  变量名
     */
    if (watch) {
        genCode(config.typingsPath)
    }
}
