import { provide } from 'midway'
import { IUserService, IUserOptions } from '../interface'

@provide('userService')
export class UserService implements IUserService {
    async getUser(options: IUserOptions): Promise<API.UserRes> {
        return {
            id: options.id,
            username: 'mockedName',
            phone: '12345678901',
            email: 'xxx.xxx@xxx.com',
        }
    }
}
