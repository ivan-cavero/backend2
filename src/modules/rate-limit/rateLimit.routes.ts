import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { defaultKeyGenerator, getRateLimitStatus } from '@/middlewares/rateLimit.middleware'

const rateLimitRoutes = new Hono()

rateLimitRoutes.get(
  '/',
  authMiddleware,
  describeRoute({
    summary: 'Get current rate-limit status',
    description:
      'Returns the number of remaining requests and the timestamp when the quota resets for the authenticated user (or IP if not authenticated).',
    tags: ['Rate Limit'],
    responses: {
      200: {
        description: 'Current rate-limit info',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                limit: { type: 'number', example: 100 },
                remaining: { type: 'number', example: 42 },
                reset: { type: 'number', example: 1714765812 }
              }
            }
          }
        }
      }
    }
  }),
  (c) => {
    const key = defaultKeyGenerator(c)
    const info = getRateLimitStatus(key)
    if (!info) {
      return c.json({ limit: 0, remaining: 0, reset: Date.now() }, 200)
    }
    return c.json(info)
  }
)

export default rateLimitRoutes 