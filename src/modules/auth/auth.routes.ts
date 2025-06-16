import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { zValidator } from '@hono/zod-validator'
import { googleOAuthHandler, googleOAuthCallbackHandler, logoutHandler, refreshTokenHandler } from './auth.controller'
import { GoogleCallbackQuerySchema } from './auth.schemas'
import { ErrorSchema } from '@/schemas/error.schema'
import { resolver } from 'hono-openapi/zod'

const authRoutes = new Hono()

authRoutes.get(
	'/google',
	describeRoute({
		summary: 'Initiate Google OAuth2 Login',
		description: 'Redirects the user to the Google OAuth2 consent screen to begin the authentication process.',
		tags: ['Auth'],
		responses: {
			302: {
				description: 'Redirect to Google OAuth2 consent screen.',
				headers: {
					Location: {
						schema: { type: 'string', example: 'https://accounts.google.com/o/oauth2/v2/auth?...' }
					}
				}
			}
		}
	}),
	googleOAuthHandler
)

authRoutes.get(
	'/google/callback',
	describeRoute({
		summary: 'Handle Google OAuth2 Callback',
		description:
			'Handles the callback from Google after user authentication. Exchanges the authorization code for tokens, creates a user session by setting a secure `httpOnly` cookie, and redirects to the frontend application. On error, redirects to a frontend error page with details in the query parameters.',
		tags: ['Auth'],
		parameters: [
			{
				in: 'query',
				name: 'code',
				required: true,
				schema: resolver(GoogleCallbackQuerySchema.shape.code),
				description: 'The authorization code provided by Google.'
			},
			{
				in: 'query',
				name: 'state',
				required: false,
				schema: resolver(GoogleCallbackQuerySchema.shape.state),
				description: 'Optional state parameter for CSRF protection.'
			}
		],
		responses: {
			302: {
				description:
					'Redirects to the frontend application (on success) or an error page (on failure). Sets the `token` cookie on success.',
				headers: {
					Location: {
						schema: { type: 'string', example: 'http://localhost:3000/dashboard' }
					},
					'Set-Cookie': {
						schema: { type: 'string', example: 'token=...; Path=/; HttpOnly; Secure; SameSite=Lax' }
					}
				},
				content: {
					'application/json': {
						schema: resolver(ErrorSchema)
					}
				}
			}
		}
	}),
	zValidator('query', GoogleCallbackQuerySchema, (result, c) => {
		if (!result.success) {
			return c.json(
				{
					ok: false,
					error: {
						message: 'Validation failed.',
						status: 422,
						issues: result.error.issues.map((issue) => ({
							path: issue.path.join('.'),
							message: issue.message,
						})),
					},
				},
				422
			)
		}
	}),
	googleOAuthCallbackHandler
)

authRoutes.get(
	'/logout',
	describeRoute({
		summary: 'User Logout',
		description: 'Logs the user out by clearing the session cookie and redirecting to the frontend.',
		tags: ['Auth'],
		responses: {
			302: {
				description: 'Redirects to the frontend login page after clearing the session.',
				headers: {
					Location: {
						schema: { type: 'string', example: 'http://localhost:3000/login' }
					},
					'Set-Cookie': {
						schema: { type: 'string', example: 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT' }
					}
				}
			}
		}
	}),
	logoutHandler
)

authRoutes.post(
	'/refresh',
	describeRoute({
		summary: 'Refresh access token using a valid refresh token cookie',
		description: 'Issues a new access token and refresh token if the provided refresh token is valid. Returns both as httpOnly cookies.',
		tags: ['Auth'],
		responses: {
			200: {
				description: 'Tokens refreshed successfully',
				content: {
					'application/json': {
						schema: { type: 'object', properties: { ok: { type: 'boolean', example: true } } }
					}
				}
			},
			401: {
				description: 'Invalid or expired refresh token',
				content: {
					'application/json': {
						schema: { type: 'object', properties: { ok: { type: 'boolean', example: false }, message: { type: 'string' } } }
					}
				}
			}
		}
	}),
	refreshTokenHandler
)

export default authRoutes
