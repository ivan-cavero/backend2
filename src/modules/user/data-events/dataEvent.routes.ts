import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver } from 'hono-openapi/zod'
import { exportDataHandler, importDataHandler, listUserDataEventsHandler } from './dataEvent.controller'
import { DataEventArraySchema } from './dataEvent.schema'

const dataEventsRoutes = new Hono()

/**
 * GET /users/:uuid/data-events
 * List import/export events for a user.
 */
dataEventsRoutes.get(
  '/',
  describeRoute({
    tags: ['Data Events'],
    summary: 'List data transfer events for user',
    parameters: [
      {
        in: 'query',
        name: 'status',
        required: false,
        schema: { type: 'string', example: 'queued,running' },
        description: 'Filter by statuses (comma-separated). Allowed values: queued,running,done,error'
      },
      {
        in: 'query',
        name: 'limit',
        required: false,
        schema: { type: 'integer', minimum: 1, maximum: 100, example: 10 },
        description: 'Maximum number of records to return (default: 100)'
      }
    ],
    responses: {
      200: {
        description: 'List of events',
        content: {
          'application/json': {
            schema: resolver(DataEventArraySchema)
          }
        }
      }
    }
  }),
  listUserDataEventsHandler
)

/**
 * POST /users/:uuid/data-events/export
 * Queues an export job.
 */
dataEventsRoutes.post(
  '/export',
  describeRoute({
    tags: ['Data Events'],
    summary: 'Export user data (queued job)',
    responses: {
      202: {
        description: 'Export job queued',
        content: {
          'application/json': {
            schema: { type: 'object', properties: { eventId: { type: 'string' } } }
          }
        }
      }
    }
  }),
  exportDataHandler
)

// Import
dataEventsRoutes.post(
  '/import',
  describeRoute({
    tags: ['Data Events'],
    summary: 'Import user data (queued job)',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              fileKey: { type: 'string', description: 'Key of the archive previously uploaded to S3' }
            },
            required: ['fileKey']
          }
        }
      }
    },
    responses: {
      202: {
        description: 'Import job queued',
        content: {
          'application/json': {
            schema: { type: 'object', properties: { eventId: { type: 'string' } } }
          }
        }
      },
      400: {
        description: 'Missing fileKey',
        content: { 'application/json': { schema: { type: 'object' } } }
      }
    }
  }),
  importDataHandler
)

export default dataEventsRoutes 