/**
 * open api 配置
 */
import * as path from 'path'

/**
 * open api config
 */
let _config = {
    /**
     * 类型定义存放位置
     */
    typingsPath: path.join(__dirname, '../../typings/api'),
    /**
     * 是否开记 swagger ui
     */
    enable: true,
    /**
     * swagger ui 路由前缀
     */
    routerPrefix: '/swagger-ui',


    /**
     * swagger ui version
     */
    swaggerUiVersion: '3.35.1'
}

export interface Config {
    // /**
    //  * 类型定义目录
    //  */
    // typingsPath?: string
    /**
     * open api / swagger 文档是否可访问
     */
    enable?: boolean
    /**
     * swagger ui 路由前缀
     */
    routerPrefix?: string
    /**
     * swagger ui version
     */
    swaggerUiVersion?: string
}

export function setConfig(cfg: Config) {
    _config = Object.assign(_config, cfg)
}

export const config = _config