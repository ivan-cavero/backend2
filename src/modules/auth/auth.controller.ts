import type { Context } from 'hono'
import { HTTPException } from '@/middlewares/errorHandler'
import { setCookie, getCookie } from 'hono/cookie'
import { CONFIG } from '@/config'
import { logger } from '@/utils/logger'
import { getGoogleOAuthUrl, getGoogleTokens, getGoogleUserProfile } from './providers/google'
import { issueAuthTokens } from './auth.service'
import { upsertUserFromOAuth } from '../user/user.service'
import { findRefreshToken, revokeRefreshToken, updateRefreshTokenLastUsed } from './refreshToken.service'
import { getUserByEmail, getUserById } from '../user/user.service'

const JWT_COOKIE_NAME = 'token'
const REFRESH_TOKEN_COOKIE = 'refresh_token'

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
		// Get user with internal ID
		const user = await getUserByEmail(appUser.email)
		if (!user || !user.id) {
			throw new HTTPException(500, { message: 'User not found or missing internal ID' })
		}
		await issueAuthTokens(c, user)
		return c.redirect(`${CONFIG.FRONTEND_URL}/callback`)
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

export const refreshTokenHandler = async (c: Context) => {
	const refreshToken = getCookie(c, REFRESH_TOKEN_COOKIE)
	if (!refreshToken) {
		throw new HTTPException(401, { message: 'No refresh token provided' })
	}
	const dbToken = await findRefreshToken(refreshToken)
	if (!dbToken || dbToken.revokedAt || new Date(dbToken.expiresAt) < new Date()) {
		throw new HTTPException(401, { message: 'Invalid or expired refresh token' })
	}
	// Get user
	const user = await getUserById(dbToken.userId)
	if (!user) {
		throw new HTTPException(401, { message: 'User not found for refresh token' })
	}
	// Update last used timestamp before rotating
	await updateRefreshTokenLastUsed(refreshToken)
	// Rotate refresh token
	await revokeRefreshToken(refreshToken)
	await issueAuthTokens(c, user)
	return c.json({ ok: true })
}

/**
 * Logs the user out by revoking the current session and clearing cookies.
 * For multi-session management, use the dedicated session endpoints:
 * - DELETE /api/users/{uuid}/sessions/{sessionId} (revoke specific session)
 * - DELETE /api/users/{uuid}/sessions (revoke all sessions)
 */
export const logoutHandler = async (c: Context) => {
	const refreshToken = getCookie(c, REFRESH_TOKEN_COOKIE)

	if (refreshToken) {
		try {
			// Update last used timestamp before revoking
			await updateRefreshTokenLastUsed(refreshToken)
			// Revoke the current refresh token (session)
			await revokeRefreshToken(refreshToken)
			logger.info('User session revoked successfully during logout')
		} catch (error) {
			// Log error but continue with cookie clearing
			logger.error('Error revoking refresh token during logout:', error)
		}
	} else {
		logger.warn('Logout attempted without refresh token cookie')
	}

	// Clear both authentication cookies
	setCookie(c, JWT_COOKIE_NAME, '', {
		httpOnly: true,
		secure: CONFIG.NODE_ENV === 'production',
		sameSite: 'Lax',
		path: '/',
		maxAge: 0
	})
	setCookie(c, REFRESH_TOKEN_COOKIE, '', {
		httpOnly: true,
		secure: CONFIG.NODE_ENV === 'production',
		sameSite: 'Lax',
		path: '/',
		maxAge: 0
	})

	logger.info('User logout completed - cookies cleared')
	return c.json({
		ok: true,
		message: 'Logged out successfully. Cookies cleared and session revoked.'
	})
}
