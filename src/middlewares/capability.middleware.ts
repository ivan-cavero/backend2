import type { Context, Next } from 'hono'
import { getActiveUserPlan } from '@/modules/user/plan/userPlan.service'
import { logger } from '@/utils/logger'

export const capabilityLoaderMiddleware = async (c: Context, next: Next) => {
  const userUuid = c.get('userUuid' as unknown as keyof typeof c.var) as string | undefined

  if (userUuid) {
    try {
      const plan = await getActiveUserPlan(userUuid)
      c.set('capabilities', {
        rateLimit: plan.rateLimit,
        apiKeyLimit: plan.apiKeyLimit,
        tierName: plan.tierName
      })
    } catch (err) {
      logger.error('capabilityLoader: failed', err)
    }
  }

  await next()
} 