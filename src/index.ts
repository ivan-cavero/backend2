import { Hono } from 'hono'
import { prettyJSON } from 'hono/pretty-json'
import { logger as honoLogger } from 'hono/logger'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { capabilityLoaderMiddleware } from '@/middlewares/capability.middleware'
import { rateLimit } from '@/middlewares/rateLimit.middleware'
import { openAPISpecs } from 'hono-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { serveStatic } from 'hono/bun'
import { csrfMiddleware } from '@/middlewares/csrf.middleware'

import { logger } from '@/utils/logger'
import { CONFIG } from '@/config'
import authRoutes from './modules/auth/auth.routes'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler'
import userRoutes from './modules/user/user.routes'
import syncRoutes from './modules/sync/sync.routes'
import standaloneApiKeyRoutes from './modules/api-keys/apiKey.routes'
import rateLimitRoutes from './modules/rate-limit/rateLimit.routes'
import pricingRoutes from './modules/pricing/pricing.routes'

const app = new Hono()

// Middlewares
app.use('*', prettyJSON())
app.use(
	'*',
	honoLogger((message, ...rest) => {
		logger.info(message, ...rest) // Use our custom logger
	})
)

// Carga de plan/capabilities (debe ir antes del limitador global)
app.use('*', capabilityLoaderMiddleware)
// Global rate limit – 100 requests per minute (customise as needed)
app.use('*', rateLimit({ windowMs: 60 * 1000, max: 100 }))

// CORS Configuration
const defaultAllowedOrigins = ['http://localhost:3000']
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
		allowHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-API-Key'],
		exposeHeaders: ['Content-Length']
	})
)

app.use('*', secureHeaders())
// Custom Content-Security-Policy header
app.use('*', async (c, next) => {
  c.header('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https://cdn.jsdelivr.net; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https: data:")
  await next()
})

// CSRF protection
app.use('*', csrfMiddleware)

app.use('/favicon.svg', serveStatic({ path: './static/favicon.svg' }))
// Serve .ico for browsers that expect it
app.use('/favicon.ico', serveStatic({ path: './static/favicon.svg' }))

// Mount authentication routes
app.route('/api/auth', authRoutes);

// Mount user routes
app.route('/api/users', userRoutes)

// Mount sync routes
app.route('/api/sync', syncRoutes)

// Mount standalone API key routes (no user UUID required)
app.route('/api/api-keys', standaloneApiKeyRoutes)

// Rate-limit info route
app.route('/api/rate-limit', rateLimitRoutes)

// Pricing tiers
app.route('/api/pricing', pricingRoutes)

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
				description:
					'TimeFly is a platform for developers to automatically and accurately track and analyze programming time.\n\n' +
					'This API serves as the backend for our VS Code extension integration, allowing users to sign in with Google, manage sessions, and query productivity statistics.\n\n' +
					'**Authentication:**\n' +
					'- Web users authenticate via secure cookie (token) after Google login.\n' +
					'- IDE extensions and integrations authenticate using an API key via the X-API-Key header.\n\n' +
					'**Rate-Limiting:**\n' +
					'- Global quota: **100 requests per minute** per user/IP.\n' +
					'- Sensitive endpoints (e.g., `/api/auth/refresh`) have stricter limits (5 req/min).\n' +
					'- On exceeding the limit the API returns **HTTP 429** and sets `X-RateLimit-*` headers.\n' +
					'- Check your current quota with **GET /api/rate-limit**.\n\n' +
					'**Key Features:**\n' +
					'- Direct integration with VS Code via extension\n' +
					'- Real-time activity tracking and synchronization\n' +
					'- High-performance time-series analytics with ClickHouse\n' +
					'- Secure authentication with Google OAuth2\n' +
					'- User and session management\n' +
					'- Well-documented and easy-to-consume API\n' +
					'- Designed for teams and individual developers\n\n' +
					'**Who is it for?**\n' +
					'- Developers who want to understand and optimize their programming time\n' +
					'- Teams seeking objective productivity metrics\n' +
					'- Anyone interested in quantifying their workflow in the editor.\n\n' +
					'Visit [timefly.dev](https://timefly.dev) for more information.'
			},
			servers: [{ url: `${CONFIG.BASE_URL}:${CONFIG.PORT}`, description: 'Server URL' }],
			components: {
				securitySchemes: {
					apiKey: {
						type: 'apiKey',
						in: 'header',
						name: 'X-API-Key',
						description: 'Use X-API-Key: <api_key> for IDE extensions and integrations'
					}
				},
				responses: {
					TooManyRequests: {
						description: 'Too many requests – client is rate limited',
						headers: {
							'X-RateLimit-Limit': { schema: { type: 'string' }, description: 'Total requests allowed in the current window' },
							'X-RateLimit-Remaining': { schema: { type: 'string' }, description: 'Requests remaining in the current window' },
							'X-RateLimit-Reset': { schema: { type: 'string' }, description: 'Unix timestamp (seconds) when the window resets' }
						},
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										message: { type: 'string', example: 'Too many requests – retry after 57 seconds' }
									}
								}
							}
						}
					}
				}
			},
			tags: [
				{
					name: 'Auth',
					description: 'Authentication endpoints for login, logout, and OAuth2 integration with Google.'
				},
				{
					name: 'User',
					description: 'User management endpoints: create, read, update, and soft delete users by UUID.'
				},
				{
					name: 'User API Keys',
					description: 'User-specific API key management: create, list, revoke, and verify API keys for authenticated users.'
				},
				{
					name: 'API Keys',
					description: 'Standalone API key operations that don\'t require user UUID. Perfect for IDE extensions and integrations.'
				},
				{
					name: 'Activity Sync',
					description: 'Core endpoints for synchronizing developer activity data from IDE extensions. Handles high-volume time-series data storage in ClickHouse.'
				},
				{
					name: 'Rate Limit',
					description: 'Endpoints and policy related to API rate limiting.'
				},
				{
					name: 'Pricing',
					description: 'Endpoints to query available pricing tiers and their quotas.'
				}
			]
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

// Temporary debug endpoint (REMOVE IN PRODUCTION LATER)
app.get('/debug/config', (c) => {
	return c.json({
		NODE_ENV: CONFIG.NODE_ENV,
		BASE_URL: CONFIG.BASE_URL,
		PORT: CONFIG.PORT,
		google_redirect_uri_dev: `${CONFIG.BASE_URL}:${CONFIG.PORT}/api/auth/google/callback`,
		google_redirect_uri_prod: `${CONFIG.BASE_URL}/api/auth/google/callback`,
		will_use: CONFIG.NODE_ENV === 'production' 
			? `${CONFIG.BASE_URL}/api/auth/google/callback`
			: `${CONFIG.BASE_URL}:${CONFIG.PORT}/api/auth/google/callback`
	})
})

logger.info(`API Documentation available at ${CONFIG.BASE_URL}:${CONFIG.PORT}`)

export default {
	port: CONFIG.PORT,
	fetch: app.fetch
}
