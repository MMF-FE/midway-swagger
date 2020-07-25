import { SchemaObject } from 'openapi3-ts'

export interface OpenAPI3 {
    openapi: string
    components: {
        schemas: { [key: string]: OpenAPI3SchemaObject | OpenAPI3Reference }
    }
    paths: OpenAPI3Paths
    tags?: OpenAPI3Tag[]
    [key: string]: any // handle other properties beyond swagger-to-ts’ concern
}

export interface OpenAPI3Tag {
    name: string
    description?: string
}

export interface OpenAPI3Paths {
    [path: string]: {
        [method: string]: OpenAPI3Path
    }
}

export interface OpenAPI3Path {
    operationId: string
    tags: string[]
    summary?: string
    requestBody?: {
        content: OpenAPI3Content
    }
    responses?: {
        [type: string]: {
            description?: string
            content: OpenAPI3Content
        }
    }
    parameters?: OpenAPI3Parameter[]
    security?: {
        [name: string]: string[]
    }[]
}

export type InType = 'query' | 'body' | 'path' | 'header'

export interface OpenAPI3Parameter {
    name: string
    in: InType
    required?: boolean
    description?: string
    schema: OpenAPI3SchemaObject
}

export interface OpenAPI3Content {
    [type: string]: {
        schema: OpenAPI3SchemaObject
    }
}

export type OpenAPI3Type =
    | 'array'
    | 'boolean'
    | 'integer'
    | 'number'
    | 'object'
    | 'string'

export type OpenAPI3Reference =
    | { $ref: string }
    | { anyOf: (OpenAPI3SchemaObject | OpenAPI3Reference)[] }
    | { oneOf: (OpenAPI3SchemaObject | OpenAPI3Reference)[] }

export interface OpenAPI3SchemaObject extends SchemaObject {}
