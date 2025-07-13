import { postgresDb } from '@/db/postgresql'
import type { PricingTier } from './pricing.types'

export interface UserPlan {
  tierName: string
  rateLimit: number
  apiKeyLimit: number
}

const DEFAULT_PLAN: UserPlan = {
  tierName: 'Free',
  rateLimit: 100,
  apiKeyLimit: 3
}

/**
 * Get the currently active pricing plan (tier) for a user by UUID.
 * Falls back to Free tier if no active subscription is found.
 */
export async function getActiveUserPlan(userUuid: string): Promise<UserPlan> {
  const rows = await postgresDb`
    SELECT pt.name as tier_name, pt.rate_limit, pt.api_key_limit
    FROM users u
    LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.is_active = TRUE AND us.deleted_at IS NULL
    LEFT JOIN pricing_plans pp ON pp.id = us.plan_id AND pp.deleted_at IS NULL
    LEFT JOIN pricing_tiers pt ON pt.id = pp.tier_id AND pt.deleted_at IS NULL
    WHERE u.uuid = ${userUuid} AND u.deleted_at IS NULL
    ORDER BY us.starts_at DESC NULLS LAST
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

export async function listPricingTiers(): Promise<PricingTier[]> {
  const rows = await postgresDb`
    SELECT * FROM pricing_tiers WHERE deleted_at IS NULL ORDER BY id ASC
  ` as Array<{
    id: number; uuid: string; name: string; description: string | null; rate_limit: number; api_key_limit: number
  }>

  return rows.map((r) => ({
    id: r.id,
    uuid: r.uuid,
    name: r.name,
    description: r.description ?? undefined,
    rateLimit: r.rate_limit,
    apiKeyLimit: r.api_key_limit
  }))
} 