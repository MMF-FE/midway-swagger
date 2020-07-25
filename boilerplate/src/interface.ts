/**
 * @description User-Service parameters
 */
export interface IUserOptions {
    id: number
}

/**
 * @description User-Service abstractions
 */
export interface IUserService {
    getUser(options: IUserOptions): Promise<API.UserRes>
}
