import { Hono } from 'hono'
import { prettyJSON } from 'hono/pretty-json'
import { logger as honoLogger } from 'hono/logger'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { openAPISpecs } from 'hono-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { serveStatic } from 'hono/bun'

import { logger } from '@/utils/logger'
import { CONFIG } from '@/config'
import authRoutes from './modules/auth/auth.routes'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler'

const app = new Hono()

// Middlewares
app.use('*', prettyJSON())
app.use(
	'*',
	honoLogger((message, ...rest) => {
		logger.info(message, ...rest) // Use our custom logger
	})
)

// CORS Configuration
const defaultAllowedOrigins = ['http://localhost:5173']
const configuredOrigins = CONFIG.ALLOWED_ORIGINS ? CONFIG.ALLOWED_ORIGINS.split(',') : defaultAllowedOrigins

app.use(
	'*',
	cors({
		origin: (origin, _c) => {
			if (!origin || configuredOrigins.includes(origin)) {
				return origin
			}

			logger.warn(`CORS: Request from origin '${origin}' was blocked.`)
			return undefined
		},
		credentials: true,
		allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
		exposeHeaders: ['Content-Length']
	})
)
app.use('*', secureHeaders())

app.use('/favicon.svg', serveStatic({ path: './static/favicon.svg' }))

// Mount authentication routes
app.route('/api/auth', authRoutes);

// Error handler
app.onError(errorHandler)

// Custom Not Found handler
app.notFound(notFoundHandler);

// Health check endpoint
app.get('/health', (c) => c.text('OK'))

// OpenAPI documentation
app.get(
	'/openapi',
	openAPISpecs(app, {
		documentation: {
			info: {
				title: 'TimeFly API',
				version: '1.0.0',
				description: 'API for TimeFly'
			},
			servers: [{ url: `${CONFIG.BASE_URL}:${CONFIG.PORT}`, description: 'Server URL' }],
			components: {
				securitySchemes: {
					bearerAuth: {
						type: 'http',
						scheme: 'bearer',
						bearerFormat: 'JWT'
					},
					apiKeyAuth: {
						type: 'apiKey',
						in: 'header',
						name: 'X-API-Key'
					}
				}
			}
		}
	})
)

// Scalar API Reference UI at root '/'
app.get(
	'/',
	Scalar({
		url: '/openapi',
		theme: 'default',
		pageTitle: 'TimeFly API • Docs',
		favicon: '/favicon.svg',
		hideDownloadButton: true,
		metaData: {
			title: 'TimeFly API • Docs',
			description: 'API for TimeFly',
			ogTitle: 'TimeFly API • Docs',
			ogDescription: 'API for TimeFly',
			ogImage: 'https://timefly.dev/favicon.svg',
			ogUrl: CONFIG.BASE_URL,
			ogType: 'website',
			twitterTitle: 'TimeFly API • Docs',
			twitterDescription: 'API for TimeFly',
			twitterCard: 'https://timefly.dev/favicon.svg',
			twitterSite: CONFIG.BASE_URL,
			twitterImage: 'https://timefly.dev/favicon.svg'
		}
	})
)

logger.info(`API Documentation available at ${CONFIG.BASE_URL}:${CONFIG.PORT}`)

export default {
	port: CONFIG.PORT,
	fetch: app.fetch
}
