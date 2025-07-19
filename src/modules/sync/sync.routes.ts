import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { zValidator } from '@hono/zod-validator'
import { syncEventsHandler } from './sync.controller'
import { SyncValidationSchema } from './sync.schemas'
import { apiKeyAuthMiddleware } from '@/middlewares/apiKey.middleware'

// Example events payload for docs
const exampleEventsBody = {
  events: [
    {
      event_id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '01980554-3ab2-7000-8a2e-9965fab4a1b2',
      project_id: 'Dev',
      event_time: '2025-07-17T16:17:40.752Z',
      metadata: {
        machine_id: '27dd7982f178e4e1346e58ecc4680f2b92bc893d918448898bd11602375fa9b4',
        ide_version: '1.99.3',
        os_arch: 'x64',
        platform: 'win32'
      },
      activities: [
        {
          name: 'reading',
          duration_ms: 5441,
          properties: {
            event: 'hover',
            tabs_opened: 1
          }
        }
      ]
    }
  ]
} as const

const syncRoutes = new Hono()

// POST /sync – ingest events
syncRoutes.post(
  '/',
  describeRoute({
    tags: ['Events Sync'],
    summary: 'Synchronise IDE events',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['events'],
            properties: {
              events: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['event_id', 'user_id', 'project_id', 'event_time', 'metadata', 'activities'],
                  properties: {
                    event_id: { type: 'string', format: 'uuid' },
                    user_id: { type: 'string', format: 'uuid' },
                    project_id: { type: 'string' },
                    event_time: { type: 'string', format: 'date-time' },
                    metadata: { type: 'object', additionalProperties: true },
                    activities: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['name', 'duration_ms'],
                        properties: {
                          name: { type: 'string' },
                          duration_ms: { type: 'integer', minimum: 1 },
                          properties: { type: 'object', additionalProperties: true }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          examples: {
            default: {
              summary: 'Batch of IDE events',
              value: exampleEventsBody
            }
          }
        }
      },
    },
    responses: {
      200: { description: 'Events synced' },
    },
    security: [{ apiKey: [] }],
  }),
  apiKeyAuthMiddleware,
  zValidator('json', SyncValidationSchema),
  syncEventsHandler,
)

export default syncRoutes 