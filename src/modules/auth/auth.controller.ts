import type { Context } from 'hono'
import { HTTPException } from '@/middlewares/errorHandler'
import { deleteCookie, setCookie } from 'hono/cookie'
import { CONFIG } from '@/config'
import { logger } from '@/utils/logger'
import { getGoogleOAuthUrl, getGoogleTokens, getGoogleUserProfile, createJwt } from './auth.service'
import { upsertUserFromOAuth } from '../user/user.service'

const JWT_COOKIE_NAME = 'token'

/**
 * Redirects user to Google's OAuth consent screen.
 */
export const googleOAuthHandler = async (c: Context) => {
	try {
		const authUrl = getGoogleOAuthUrl()
		return c.redirect(authUrl)
	} catch (error) {
		// This error usually indicates a server configuration issue (e.g., missing env vars).
		logger.error('Critical: Could not generate Google OAuth URL.', error)
		throw new HTTPException(500, {
			message: 'Could not initiate Google login due to a server configuration error.'
		})
	}
}

/**
 * Handles the Google OAuth callback after user consent.
 * Exchanges the authorization code for tokens, gets user info, creates a JWT,
 * and sets it in a secure cookie.
 */
export const googleOAuthCallbackHandler = async (c: Context) => {
	const code = c.req.query('code')
	const errorQuery = c.req.query('error')

	if (errorQuery) {
		logger.warn('Google OAuth callback error:', { errorQuery })
		throw new HTTPException(400, { message: `Google OAuth error: ${errorQuery}` })
	}

	if (!code) {
		logger.warn('Authorization code missing in Google OAuth callback.')
		throw new HTTPException(400, { message: 'Authorization code is missing.' })
	}

	try {
		const { access_token } = await getGoogleTokens(code)

		if (!access_token) {
			logger.error('No access_token received from Google after code exchange.')
			throw new HTTPException(500, { message: 'Failed to retrieve access token from Google.' })
		}

		const googleUser = await getGoogleUserProfile(access_token)

		// Upsert user in our system corresponding to the Google user.
		const appUser = await upsertUserFromOAuth({
			provider: 'google',
			providerUserId: googleUser.id,
			email: googleUser.email,
			name: googleUser.name,
			avatarUrl: googleUser.picture
		})

		const jwtPayloadData = {
			id: appUser.uuid,
			email: appUser.email
		}

		const jwtToken = await createJwt(jwtPayloadData)

		// Set the JWT in a secure, httpOnly cookie.
		setCookie(c, JWT_COOKIE_NAME, jwtToken, {
			httpOnly: true,
			secure: CONFIG.NODE_ENV === 'production',
			sameSite: 'Lax',
			path: '/',
			maxAge: 7 * 24 * 60 * 60 // 7 days
			// domain: CONFIG.COOKIE_DOMAIN, // Set if sharing cookie across subdomains.
		})

		return c.redirect(CONFIG.FRONTEND_URL)
	} catch (error) {
		// Errors are now caught by the global error handler.
		// We just need to re-throw them if they are not already HTTPExceptions.
		if (error instanceof HTTPException) {
			throw error
		}
		// For unexpected errors, log and throw a generic 500 error.
		logger.error('Error during Google OAuth callback:', { error })
		throw new HTTPException(500, { message: 'An unexpected error occurred during sign-in.' })
	}
}

/**
 * Logs the user out by clearing the session cookie and redirecting to the frontend.
 */
export const logoutHandler = async (c: Context) => {
	deleteCookie(c, JWT_COOKIE_NAME, {
		path: '/'
		// domain: CONFIG.COOKIE_DOMAIN, // Ensure domain matches if it was set
	})
	return c.redirect(CONFIG.FRONTEND_URL)
}
