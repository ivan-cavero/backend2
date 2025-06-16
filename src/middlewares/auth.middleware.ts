import type { Context, Next } from 'hono'
import { HTTPException } from './errorHandler'
import { verify } from 'hono/jwt'
import { getCookie, setCookie } from 'hono/cookie'
import { CONFIG } from '@/config'
import { findRefreshToken, createRefreshToken, revokeRefreshToken } from '@/modules/auth/refreshToken.service'
import { getClientIp } from '@/utils/ip'
import { getUserById } from '@/modules/user/user.service'

const ACCESS_TOKEN_COOKIE = 'token'
const REFRESH_TOKEN_COOKIE = 'refresh_token'

export const authMiddleware = async (c: Context, next: Next) => {
  let accessToken = getCookie(c, ACCESS_TOKEN_COOKIE) || c.req.header('authorization')?.replace('Bearer ', '')
  let userUuid: string | undefined

  if (accessToken) {
    try {
      const payload = await verify(accessToken, CONFIG.JWT_SECRET)
      if (typeof payload.sub === 'string') {
        userUuid = payload.sub
      }
    } catch {
      // Token invalid or expired, try refresh
      accessToken = undefined
    }
  }

  if (!userUuid) {
    // Try refresh token
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
        // Optionally rotate refresh token
        await revokeRefreshToken(refreshToken)
        const newToken = await createRefreshToken({
          userId: dbToken.userId,
          userAgent: c.req.header('user-agent'),
          ipAddress: getClientIp(c)
        })
        setCookie(c, REFRESH_TOKEN_COOKIE, newToken.token, {
          httpOnly: true,
          secure: CONFIG.NODE_ENV === 'production',
          sameSite: 'Lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60 // 30 days
        })
        // Issue new access token
        // You may want to use your own createJwt function here
        // setCookie(c, ACCESS_TOKEN_COOKIE, newAccessToken, { ... })
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