/**
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
 * @pattern 正则 如: ^[A-Za-z0-9]+$
 *
 * @default 默认值
 *
 */
declare module API {
    interface ErrorRes {
        message: string
    }

    /**
     * @description User-Service response
     */
    interface UserRes {
        id: number
        username: string
        phone: string
        email?: string
    }
}
