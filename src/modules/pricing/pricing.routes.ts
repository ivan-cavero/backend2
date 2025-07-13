import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver } from 'hono-openapi/zod'
import { listPricingTiersHandler } from './pricing.controller'
import { PricingTierListSchema } from './pricing.schemas'

const pricingRoutes = new Hono()

pricingRoutes.get(
  '/',
  describeRoute({
    summary: 'List pricing tiers',
    tags: ['Pricing'],
    responses: {
      200: { description: 'List of tiers', content: { 'application/json': { schema: resolver(PricingTierListSchema) } } }
    }
  }),
  listPricingTiersHandler
)

export default pricingRoutes 