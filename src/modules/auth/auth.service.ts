import { CONFIG } from '@/config'
import type { JwtPayload } from './auth.types'
import { sign } from 'hono/jwt'
import { setCookie } from 'hono/cookie'
import type { Context } from 'hono'
import type { User } from '../user/user.types'
import { createRefreshToken } from './refreshToken.service'
import { getClientIp } from '@/utils/ip'

/**
 * Creates a JSON Web Token (JWT) for the application session.
 * @param user An object containing the user's UUID and email.
 * @param expiresInSeconds Expiration time in seconds (default: 15 min)
 * @returns A promise resolving to the signed JWT string.
 */
export const createJwt = async (
	user: { id: string; email: string },
	expiresInSeconds: number = 15 * 60
): Promise<string> => {
	const now = Math.floor(Date.now() / 1000)
	const payload: JwtPayload = {
		sub: user.id, // Subject (user UUID)
		email: user.email,
		iss: 'TimeFlyAPI', // Issuer
		iat: now, // Issued at
		exp: now + expiresInSeconds // Expiration time
	}
	return sign(payload, CONFIG.JWT_SECRET)
}

/**
 * Generates a secure random refresh token string.
 */
export function generateRefreshToken(): string {
	const arr = new Uint8Array(32)
	globalThis.crypto.getRandomValues(arr)
	const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
	return Bun.randomUUIDv7() + hex
}

/**
 * Issues both access and refresh tokens as httpOnly cookies for a user.
 * Used by all login flows (Google, email, GitHub, etc).
 */
export async function issueAuthTokens(c: Context, user: User) {
	if (!user.id) { throw new Error('User must have internal id') }
	const jwtToken = await createJwt({ id: user.uuid, email: user.email }, 15 * 60)
	const refreshToken = await createRefreshToken({
		userId: user.id,
		userAgent: c.req.header('user-agent'),
		ipAddress: getClientIp(c)
	})
	setCookie(c, 'token', jwtToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'Lax',
		path: '/',
		maxAge: 15 * 60 // 15 min
	})
	setCookie(c, 'refresh_token', refreshToken.token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'Lax',
		path: '/',
		maxAge: 30 * 24 * 60 * 60 // 30 días
	})
}
