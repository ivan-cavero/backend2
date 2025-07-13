import type { Context, Next } from 'hono'
import { HTTPException } from './errorHandler'
import { getClientIp } from '@/utils/ip'
import { logger } from '@/utils/logger'

// ────────────────────────────────────────────────────────────────────────────
// Internal store (in-memory) – replace with Redis/etc. for multi-node setups
// key → { count, expires, limit }
// ────────────────────────────────────────────────────────────────────────────
const hits = new Map<string, { count: number; expires: number; limit: number }>()

export const defaultKeyGenerator = (c: Context): string => {
  // Prefer authenticated user, then IP
  const uuid = c.get('userUuid' as unknown as keyof typeof c.var) as string | undefined
  return uuid ?? getClientIp(c) ?? 'unknown'
}

/**
 * Simple sliding-window rate-limiter.
 *
 * WARNING: In-memory storage – **not suitable for horizontal scaling**. Swap
 * the `hits` map for Redis or other shared store in production.
 */
export const rateLimit = ({
  windowMs,
  max,
  keyGenerator = defaultKeyGenerator,
  headers = true
}: {
  /** Time window in milliseconds */ windowMs: number
  /** Max requests allowed within the window */ max: number
  /** Custom key extractor (defaults to userUuid/IP) */ keyGenerator?: (c: Context) => string
  /** Whether to inject X-RateLimit-* headers (default true) */ headers?: boolean
}) => {
  return async (c: Context, next: Next) => {
    const now = Date.now()
    const key = keyGenerator(c)

    // Override max with user plan if available (use stricter of the two for endpoint-specific limits)
    const caps = c.get('capabilities' as unknown as keyof typeof c.var) as { rateLimit?: number } | undefined
    const planLimit = caps?.rateLimit
    const effectiveMax = planLimit ? Math.min(max, planLimit) : max

    let entry = hits.get(key)
    if (!entry || entry.expires < now) {
      // Start new window
      entry = { count: 1, expires: now + windowMs, limit: effectiveMax }
      hits.set(key, entry)
      logger.debug(`rateLimit: new window for ${key}`)
    } else {
      entry.count += 1
      if (entry.count > effectiveMax) {
        logger.warn(`rateLimit: exceeded for key ${key} – path ${c.req.path}`)

        if (headers) {
          c.header('X-RateLimit-Limit', String(effectiveMax))
          c.header('X-RateLimit-Remaining', '0')
          c.header('X-RateLimit-Reset', String(Math.ceil(entry.expires / 1000)))
        }

        throw new HTTPException(429, {
          message: `Too many requests – retry after ${Math.ceil((entry.expires - now) / 1000)} seconds`
        })
      }
    }

    const remaining = Math.max(effectiveMax - entry.count, 0)

    // Expose info to downstream handlers (e.g. /rate-limit route)
    c.set('rateLimitInfo', {
      limit: effectiveMax,
      remaining,
      reset: entry.expires
    })

    if (headers) {
      c.header('X-RateLimit-Limit', String(effectiveMax))
      c.header('X-RateLimit-Remaining', String(remaining))
      c.header('X-RateLimit-Reset', String(Math.ceil(entry.expires / 1000)))
    }

    await next()
  }
}

// Helper that external routes can use to inspect current status
export const getRateLimitStatus = (
  key: string
): { limit: number; remaining: number; reset: number } | null => {
  const entry = hits.get(key)
  if (!entry) {
    return null
  }
  const remaining = Math.max(entry.limit - entry.count, 0)
  return { limit: entry.limit, remaining, reset: entry.expires }
} 