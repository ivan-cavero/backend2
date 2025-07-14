import type { Context, Next } from 'hono'
import { HTTPException } from '@/middlewares/errorHandler'

/**
 * Ownership middleware – ensures that the authenticated user is only
 * accessing their own resources (e.g. sessions, API keys, plan).
 *
 * It compares the `uuid` path parameter with the `userUuid` that the
 * `authMiddleware` stores on the context. If they differ, the request is
 * rejected with **HTTP 403 Forbidden**.
 *
 * NOTE: This middleware assumes that `authMiddleware` has already run and
 * stored `userUuid` inside the context. Therefore it **must** be mounted
 * _after_ authentication middleware on any route that contains the `:uuid`
 * path parameter.
 */
export const ownershipMiddleware = async (c: Context, next: Next) => {
  const routeUuid = c.req.param('uuid')
  const userUuid = c.get('userUuid' as unknown as keyof typeof c.var) as string | undefined

  // If for some reason auth middleware did not set the userUuid, treat as unauthenticated
  if (!userUuid) {
    throw new HTTPException(401, { message: 'Unauthorized – no authenticated user found' })
  }

  // Deny access when the user tries to act on another user's resources
  if (routeUuid && routeUuid !== userUuid) {
    throw new HTTPException(403, { message: 'Forbidden – you cannot access resources of another user' })
  }

  await next()
} 