# midway-swagger

OpenAPI(Swagger)规范是一种用于描述 RESTful API 的强大定义格式。 midway-swagger 提供了声明式的 api 及参数验证。

## 快速开始


```
npm i midway-init -g
midway-init --package=midway-swagger
```

进入项目目录

```
yarn
yarn dev
```

## 查看 swagger ui

访问: http://127.0.0.1:7001/swagger-ui

![](https://yzt-oss.meimeifa.com/Fpg-VhDVtq1fNtQ-7u7WDzkN7bD7)


## 配置 swagger (open api)

进入 `src/app.ts`

```ts
/**
 * open api 文档配置
 */
document
    .setTitle('midway openApi')
    .setVersion(process.env.npm_package_version)
    .setDescription('支持基于 interface 的验证')
    // api 认证方式
    .setSecuritySchemes({
        ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'authorization',
        },
    })
```

## 配置 swagger ui

进入 `src/app.ts`

```ts
await openApi(app, {
    /**
     * 是否开启 swagger ui
     */
    enable: true,
    /**
     * swagger ui 路由前缀
     */
    routerPrefix: '/swagger-ui',

    /**
     * swagger ui version
     */
    swaggerUiVersion: '3.30.2',
})
```

## 声明 API

```ts
import { provide, inject, Context } from 'midway'
import { get, Param, controller } from '../../decorator/openApi'

@provide()
@controller('/user', {
    description: '用户模块'
})
export class UserController {
    @inject()
    ctx: Context

    @get('/:id', {
        description: '用户信息',
        responses: 'API.UserRes',
    })
    async getUser(
        @Param('number', {
            minimum: 1,
            description: '用户id',
        })
        id: number
    ) {
        return {
            id,
            username: 'string',
            phone: '13800138000',
        }
    }
}

```

### 路由参数

在路由处理程序中查找所有使用的
`@Body()` ， `@Query()` 和 `@Param()` 等装饰器来生成 API 文档。该模块利用反射创建相应的模型定义。
