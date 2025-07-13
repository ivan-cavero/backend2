import type { Context, Next } from 'hono'
import { HTTPException } from './errorHandler'
import { verify } from 'hono/jwt'
import { getCookie } from 'hono/cookie'
import { CONFIG } from '@/config'

const ACCESS_TOKEN_COOKIE = 'token'

/**
 * Authentication middleware – **access-token only**.
 *
 * Behaviour:
 * 1. Reads JWT from the `token` cookie or an `Authorization: Bearer <jwt>` header.
 * 2. Verifies signature & expiry with `hono/jwt`.
 * 3. On success attaches `userUuid` (the JWT `sub`) to `c.var` so downstream
 *    handlers can identify the user.
 * 4. On failure (missing, expired or malformed token) immediately responds
 *    with HTTP 401. The client must then call `POST /api/auth/refresh` using
 *    its `refresh_token` cookie to obtain a new pair of tokens.
 *
 * NOTE: This middleware no longer falls back to refresh-token validation—front-
 * end clients are responsible for explicit refresh calls. This simplifies the
 * security model and makes session expiry predictable.
 */
export const authMiddleware = async (c: Context, next: Next) => {
	// 1. Attempt to retrieve the JWT from either the secure cookie or the Authorization header
	const accessToken =
		getCookie(c, ACCESS_TOKEN_COOKIE) || c.req.header('authorization')?.replace('Bearer ', '')

	// 2. Reject immediately if the token is missing
	if (!accessToken) {
		throw new HTTPException(401, { message: 'No access token provided' })
	}

	// 3. Verify and decode the JWT
		try {
			const payload = await verify(accessToken, CONFIG.JWT_SECRET)
		if (typeof payload.sub !== 'string') {
			throw new Error('Invalid JWT payload – missing subject')
	}

		// 4. Attach the user UUID to the context for downstream handlers
		c.set('userUuid', payload.sub)
		await next()
	} catch (_err) {
		// Token is expired or malformed
		throw new HTTPException(401, { message: 'Invalid or expired access token' })
		}
}
