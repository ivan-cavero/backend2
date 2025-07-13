import { postgresDb } from '@/db/postgresql'
import type { UserPlan } from '@/modules/pricing/pricing.types'

const DEFAULT_PLAN: UserPlan = {
  tierName: 'Free',
  rateLimit: 100,
  apiKeyLimit: 3
}

export async function getActiveUserPlan(userUuid: string): Promise<UserPlan> {
  const rows = await postgresDb`
    SELECT tier_name, rate_limit, api_key_limit
    FROM active_user_plan
    WHERE user_uuid = ${userUuid}
    LIMIT 1
  ` as Array<{ tier_name: string | null; rate_limit: number | null; api_key_limit: number | null }>

  const row = rows[0]
  if (!row || !row.tier_name) {
    return DEFAULT_PLAN
  }
  return {
    tierName: row.tier_name ?? DEFAULT_PLAN.tierName,
    rateLimit: row.rate_limit ?? DEFAULT_PLAN.rateLimit,
    apiKeyLimit: row.api_key_limit ?? DEFAULT_PLAN.apiKeyLimit
  }
} 