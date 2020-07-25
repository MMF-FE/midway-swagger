import { Application } from 'midway'
import openApi, { document } from './decorator/openApi'
export default (app: Application) => {
    app.beforeStart(async () => {
        await openApi(app, {
            enable: true,
        })

        /**
         * open api 文档配置
         */
        document
            .setTitle('midway openApi')
            .setVersion(process.env.npm_package_version)
            .setDescription('支持基于 interface 的验证')
            .setSecuritySchemes({
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'authorization',
                },
            })
    })
}
