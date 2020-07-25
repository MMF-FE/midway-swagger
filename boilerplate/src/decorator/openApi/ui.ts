/**
 * 处理 swagger ui
 */
import { provide, Context } from 'midway'
import { builder, getDocConfig } from './document'
import { config } from './config'


@provide()
export class OpenApiUi {

    async index(ctx: Context) {
        const docConfig = getDocConfig()
        const swaggerUiVersion = config.swaggerUiVersion

        ctx.body = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta charset="UTF-8" />
        <title>${docConfig.title}</title>
        <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${swaggerUiVersion}/swagger-ui.css"
        />
    </head>
    <body>
        <div id="swagger-ui"></div>
        <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${swaggerUiVersion}/swagger-ui-standalone-preset.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${swaggerUiVersion}/swagger-ui-bundle.js"></script>

        <script>
            function HideTopbarPlugin() {
                // this plugin overrides the Topbar component to return nothing
                return {
                    components: {
                        Topbar: function() {
                            return null
                        }
                    }
                }
            }
            // Build a system
            const ui = SwaggerUIBundle({
                url: location.href + '/api.json',
                dom_id: '#swagger-ui',
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [HideTopbarPlugin],
                layout: 'StandaloneLayout'
            })
        </script>
    </body>
</html>`
    }

    async json(ctx: Context) {
        ctx.body = builder()
    }
}