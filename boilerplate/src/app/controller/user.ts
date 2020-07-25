import { Context, inject, provide } from 'midway'
import { IUserService } from '../../interface'
import { get, Param, controller } from '../../decorator/openApi'

@provide()
@controller('/user')
export class UserController {
    @inject()
    ctx: Context

    @inject('userService')
    service: IUserService

    @get('/:id', {
        responses: 'API.UserRes',
    })
    async getUser(
        @Param('number', {
            minimum: 1,
        })
        id: number
    ) {
        const user = await this.service.getUser({ id })
        return user
    }
}
