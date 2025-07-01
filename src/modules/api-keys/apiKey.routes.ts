import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver } from 'hono-openapi/zod'
import { ApiKeyVerificationSchema } from '../user/api-keys/apiKey.schema'
import { verifyApiKeyHandler } from '../user/api-keys/apiKey.controller'
import { ErrorSchema } from '@/schemas/error.schema'
import { apiKeyAuthMiddleware } from '@/middlewares/apiKey.middleware'

/**
 * Standalone API Key Routes
 * 
 * These routes provide API key operations that don't require knowing the user UUID beforehand.
 * Perfect for IDE extensions and integrations that only have the API key.
 */
const standaloneApiKeyRoutes = new Hono()

/**
 * Standalone API Key Verification Route
 * 
 * This route verifies the validity of an API key provided in the X-API-Key header
 * without requiring the user UUID in the path. Perfect for IDE extensions and integrations
 * that only have the API key and need to verify it and get user information.
 * 
 * It uses the apiKeyAuthMiddleware to perform all necessary validations:
 * - API key exists and matches hash in database
 * - API key is not revoked (revoked_at IS NULL)
 * - API key is not deleted (deleted_at IS NULL)  
 * - Associated user is not deleted (user.deleted_at IS NULL)
 * - Updates last_used_at timestamp
 * 
 * Returns the validity status and associated user information.
 */
standaloneApiKeyRoutes.post(
  '/verify',
  describeRoute({
    tags: ['API Keys'],
    summary: 'Verify API key validity (standalone)',
    description: 'Verifies if the provided API key (via X-API-Key header) is valid and returns the associated user information. This endpoint does not require knowing the user UUID beforehand - perfect for IDE extensions and integrations. The endpoint validates that the API key exists, is not revoked, is not deleted, and belongs to an active user. The last_used_at timestamp is updated upon successful verification.',
    requestBody: {
      content: { 
        'application/json': { 
          schema: { 
            type: 'object', 
            properties: {}, 
            description: 'Empty request body. API key is provided via X-API-Key header.' 
          } 
        } 
      },
      required: false
    },
    parameters: [
      {
        in: 'header',
        name: 'X-API-Key',
        required: true,
        schema: { 
          type: 'string', 
          example: 'b3b3b3b3-b3b3-4b3b-b3b3-b3b3b3b3b3b3e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4' 
        },
        description: 'The API key to verify. This is the same format used by IDE extensions and integrations.'
      }
    ],
    responses: {
      200: {
        description: 'API key verification result. Returns validity status and user information if valid.',
        content: {
          'application/json': {
            schema: resolver(ApiKeyVerificationSchema)
          }
        }
      },
      401: {
        description: 'Invalid, revoked, or missing API key',
        content: {
          'application/json': {
            schema: resolver(ErrorSchema)
          }
        }
      },
      404: {
        description: 'Associated user not found',
        content: {
          'application/json': {
            schema: resolver(ErrorSchema)
          }
        }
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: resolver(ErrorSchema)
          }
        }
      }
    },
    security: [{ apiKey: [] }]
  }),
  apiKeyAuthMiddleware,
  verifyApiKeyHandler
)

export default standaloneApiKeyRoutes 