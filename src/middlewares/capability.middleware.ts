import type { Context, Next } from 'hono'
import { getActiveUserPlan } from '@/modules/user/plan/userPlan.service'
import { logger } from '@/utils/logger'

// In-memory cache: userUuid -> { data, ts }
const capabilityCache = new Map<string, { data: { rateLimit: number; apiKeyLimit: number; tierName: string }; ts: number }>()
const TTL_MS = 60_000

export const capabilityLoaderMiddleware = async (c: Context, next: Next) => {
  const userUuid = c.get('userUuid' as unknown as keyof typeof c.var) as string | undefined

  if (userUuid) {
    try {
      // 1. Attempt to serve from cache
      const cached = capabilityCache.get(userUuid)
      if (cached && Date.now() - cached.ts < TTL_MS) {
        c.set('capabilities', cached.data)
      } else {
        // 2. Fallback to DB
        const plan = await getActiveUserPlan(userUuid)
        const capabilities = {
          rateLimit: plan.rateLimit,
          apiKeyLimit: plan.apiKeyLimit,
          tierName: plan.tierName
        }
        capabilityCache.set(userUuid, { data: capabilities, ts: Date.now() })
        c.set('capabilities', capabilities)
      }
    } catch (err) {
      logger.error('capabilityLoader: failed', err)
    }
  }

  await next()
} 