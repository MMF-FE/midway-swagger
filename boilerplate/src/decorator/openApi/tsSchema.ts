import * as TJS from 'typescript-json-schema'
import { SchemaObject } from 'openapi3-ts'
import * as path from 'path'
import * as fs from 'fs'
import * as glob from 'glob'
import symbolName from '../../typings/api/apiSymbolName'

const compilerOptions: TJS.CompilerOptions = {
    strictNullChecks: false,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    allowJs: true,
    strict: false,
    downlevelIteration: true,
}

let tsSchema: TJS.JsonSchemaGenerator

export function init(rootPath: string) {
    const includeFiles = glob.sync(path.join(rootPath, '**/*.ts'))
    const program = TJS.getProgramFromFiles(
        includeFiles,
        compilerOptions,
        rootPath
    )

    tsSchema = TJS.buildGenerator(program, {
        required: true,
    })

    return tsSchema
}

export function genCode(rootPath: string) {
    if (tsSchema) {
        const types = tsSchema
            .getUserSymbols()
            .filter((v) => v.startsWith('API.'))
            .concat(['number', 'boolean', 'string', 'any'])
            .map((v) => `'${v}'`)

        const code = `type symbolName =
    | ${types.join(`
    | `)}

export default symbolName`
        const outFile = path.join(rootPath, 'apiSymbolName.d.ts')

        const oldCode = fs.readFileSync(outFile, 'utf8')
        if (oldCode !== code) {
            fs.writeFileSync(outFile, code, 'utf8')
        }
    }
}

export function getSchemaObject(name: symbolName) {
    if (!tsSchema || name === 'any') {
        return {}
    }

    let schema: SchemaObject

    switch (name) {
        case 'number':
        case 'boolean':
        case 'string':
            schema = {
                type: name,
            }
            break

        default:
            // @ts-ignore
            schema = (tsSchema.getSchemaForSymbol(name, true) ||
                {}) as SchemaObject
    }

    return schema
}

export default function get(name: symbolName) {
    if (!tsSchema || name === 'any') {
        return {
            schema: {},
            components: {},
        }
    }

    const schema = getSchemaObject(name)

    if (schema.$schema) {
        delete schema.$schema
    }

    let components: {
        [schema: string]: SchemaObject
    } = {}

    if (schema.definitions) {
        components = JSON.parse(
            JSON.stringify(schema.definitions)
                .replace(/\#\/definitions\//g, '#/components/schemas/')
                .replace(
                    /#\/components\/schemas\/API./g,
                    '#/components/schemas/'
                )
        )
        delete schema.definitions

        const data = JSON.stringify(schema)
            .replace(/\#\/definitions\//g, '#/components/schemas/')
            .replace(/#\/components\/schemas\/API./g, '#/components/schemas/')

        let schemaData = JSON.parse(data)

        if (schemaData.type === 'object') {
            const typeName = name.replace('API.', '')
            components[typeName] = schemaData
            schemaData = {
                $ref: `#/components/schemas/${typeName}`,
            }
        }

        Object.keys(components).forEach((key) => {
            if (key.indexOf('API.') === 0) {
                const newKey = key.replace('API.', '')
                components[newKey] = components[key]
                delete components[key]
            }
        })

        return {
            schema: schemaData,
            components,
        }
    } else if (name.startsWith('API.')) {
        const schemaName = name.replace('API.', '')
        const refName = `#/components/schemas/${schemaName}`

        components[schemaName] = schema

        return {
            schema: {
                $ref: refName,
            },
            components,
        }
    }

    return {
        schema,
        components,
    }
}
