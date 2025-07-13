import { z } from 'zod'
import 'zod-openapi/extend'

export const PricingTierSchema = z.object({
  name: z.string().openapi({ example: 'Pro' }),
  description: z.string().nullable().openapi({ example: 'Professional tier with all features' }),
  rateLimit: z.number().openapi({ example: 1000 }),
  apiKeyLimit: z.number().openapi({ example: 20 })
}).openapi({ ref: 'PricingTier' })

export const PricingTierListSchema = z.array(PricingTierSchema).openapi({ ref: 'PricingTierList' }) 