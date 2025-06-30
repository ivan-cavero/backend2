import type { Context, Next } from 'hono'
import { HTTPException } from './errorHandler'
import { verify } from 'hono/jwt'
import { getCookie } from 'hono/cookie'
import { CONFIG } from '@/config'
import { findRefreshToken, updateRefreshTokenLastUsed } from '@/modules/auth/refreshToken.service'
import { getUserById } from '@/modules/user/user.service'

const ACCESS_TOKEN_COOKIE = 'token'
const REFRESH_TOKEN_COOKIE = 'refresh_token'

/**
 * Authentication middleware that verifies access tokens and validates refresh tokens
 * WITHOUT automatically rotating them. Token rotation should only happen in the
 * dedicated /refresh endpoint to maintain session stability.
 */
export const authMiddleware = async (c: Context, next: Next) => {
	let accessToken = getCookie(c, ACCESS_TOKEN_COOKIE) || c.req.header('authorization')?.replace('Bearer ', '')
	let userUuid: string | undefined

	// Try to verify access token first
	if (accessToken) {
		try {
			const payload = await verify(accessToken, CONFIG.JWT_SECRET)
			if (typeof payload.sub === 'string') {
				userUuid = payload.sub
			}
		} catch {
			// Token invalid or expired, fall back to refresh token validation
			accessToken = undefined
		}
	}

	// If no valid access token, validate refresh token but DON'T rotate it
	if (!userUuid) {
		const refreshToken = getCookie(c, REFRESH_TOKEN_COOKIE)
		if (refreshToken) {
			const dbToken = await findRefreshToken(refreshToken)
			if (dbToken && new Date(dbToken.expiresAt) > new Date() && !dbToken.revokedAt) {
				// Get user by internal ID
				const user = await getUserById(dbToken.userId)
				if (!user) {
					throw new HTTPException(401, { message: 'User not found for refresh token' })
				}
				userUuid = user.uuid

				// Update last used timestamp (but don't rotate the token)
				await updateRefreshTokenLastUsed(refreshToken)

				// NOTE: We don't rotate the refresh token here to maintain session stability.
				// The client should use the /refresh endpoint to get new tokens when needed.
			} else {
				throw new HTTPException(401, { message: 'Invalid or expired refresh token' })
			}
		} else {
			throw new HTTPException(401, { message: 'No valid access or refresh token' })
		}
	}

	// Attach user UUID to context for downstream handlers
	c.set('userUuid', userUuid)
	await next()
}
