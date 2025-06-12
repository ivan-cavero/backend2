import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { zValidator } from '@hono/zod-validator'
import { googleOAuthHandler, googleOAuthCallbackHandler, logoutHandler } from './auth.controller'
import { GoogleCallbackQuerySchema, ErrorSchema } from './auth.schemas'

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
						schema: {
							type: 'string',
							example: 'https://accounts.google.com/o/oauth2/v2/auth?...'
						}
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
			'Handles the callback from Google after user authentication. It exchanges the authorization code for tokens, creates a user session by setting a secure `httpOnly` cookie, and redirects to the frontend application. On error, it redirects to a frontend error page with details in the query parameters.',
		tags: ['Auth'],
		parameters: [
			{
				in: 'query',
				name: 'code',
				required: true,
				schema: { type: 'string' },
				description: 'The authorization code provided by Google.'
			},
			{
				in: 'query',
				name: 'state',
				required: false,
				schema: { type: 'string' },
				description: 'An optional state parameter for CSRF protection.'
			}
		],
		responses: {
			302: {
				description:
					'Redirects to the frontend application (on success) or an error page (on failure). Sets the `token` cookie on success.',
				headers: {
					Location: {
						schema: {
							type: 'string',
							example: 'http://localhost:3000/dashboard'
						}
					},
					'Set-Cookie': {
						schema: {
							type: 'string',
							example: 'token=...; Path=/; HttpOnly; Secure; SameSite=Lax'
						}
					}
				}
			}
		}
	}),
	zValidator('query', GoogleCallbackQuerySchema),
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
						schema: {
							type: 'string',
							example: 'http://localhost:3000/login'
						}
					},
					'Set-Cookie': {
						schema: {
							type: 'string',
							example: 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
						}
					}
				}
			}
		}
	}),
	logoutHandler
)

export default authRoutes
