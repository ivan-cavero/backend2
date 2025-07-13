import type { Context } from 'hono'
import { listPricingTiers } from './pricing.service'

export const listPricingTiersHandler = async (c: Context) => {
  const tiers = await listPricingTiers()
  return c.json(tiers)
} 