import { CONFIG } from '@/config'
import type { GoogleUser, JwtPayload } from './auth.types' // Use 'import type'
import { sign } from 'hono/jwt'
import { logger } from '@/utils/logger'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

/**
 * Builds the Google OAuth2 authorization URL.
 * @returns The full URL for the Google authentication redirect.
 */
export const getGoogleOAuthUrl = (): string => {
	const params = new URLSearchParams({
		client_id: CONFIG.GOOGLE_CLIENT_ID,
		redirect_uri: `${CONFIG.BASE_URL}:${CONFIG.PORT}/api/auth/google/callback`,
		response_type: 'code',
		scope: 'openid email profile',
		access_type: 'offline', // Request a refresh token.
		prompt: 'consent' // Force consent screen to ensure refresh token is granted.
	})
	return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Exchanges an authorization code for Google access, ID, and refresh tokens.
 * @param code The authorization code from the Google callback.
 * @returns A promise resolving to the token object.
 * @throws Throws an error if the request to Google fails.
 */
export const getGoogleTokens = async (code: string): Promise<{ access_token: string; id_token: string; refresh_token?: string }> => {
	const params = new URLSearchParams({
		code,
		client_id: CONFIG.GOOGLE_CLIENT_ID,
		client_secret: CONFIG.GOOGLE_CLIENT_SECRET,
		redirect_uri: `${CONFIG.BASE_URL}:${CONFIG.PORT}/api/auth/google/callback`,
		grant_type: 'authorization_code'
	})

	const response = await fetch(GOOGLE_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: params.toString()
	})

	if (!response.ok) {
		const errorBody = await response.text()
		logger.error('Failed to fetch Google tokens:', errorBody)
		throw new Error('Failed to fetch Google tokens')
	}
	return response.json() as Promise<{ access_token: string; id_token: string; refresh_token?: string }>
}

/**
 * Fetches the Google user's profile using an access token.
 * @param accessToken The access token from Google.
 * @returns A promise resolving to the `GoogleUser` profile object.
 * @throws Throws an error if the request to Google fails.
 */
export const getGoogleUserProfile = async (accessToken: string): Promise<GoogleUser> => {
	const response = await fetch(GOOGLE_USERINFO_URL, {
		headers: { Authorization: `Bearer ${accessToken}` }
	})

	if (!response.ok) {
		const errorBody = await response.text()
		logger.error('Failed to fetch Google user profile:', errorBody)
		throw new Error('Failed to fetch Google user profile')
	}
	return response.json() as Promise<GoogleUser>
}

/**
 * Creates a JSON Web Token (JWT) for the application session.
 * @param user An object containing the user's UUID and email.
 * @returns A promise resolving to the signed JWT string.
 */
export const createJwt = async (user: { id: string; email: string }): Promise<string> => {
	const sevenDaysInSeconds = 7 * 24 * 60 * 60
	const expirationTime = Math.floor(Date.now() / 1000) + sevenDaysInSeconds

	const payload: JwtPayload = {
		sub: user.id, // Subject (user UUID)
		email: user.email,
		iss: 'TimeFlyAPI', // Issuer
		iat: Math.floor(Date.now() / 1000), // Issued at
		exp: expirationTime // Expiration time
	}

	return sign(payload, CONFIG.JWT_SECRET)
}
