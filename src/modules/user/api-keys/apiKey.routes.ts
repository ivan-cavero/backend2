import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver } from 'hono-openapi/zod'
import { ApiKeyPublicSchema, ApiKeyVerificationSchema } from './apiKey.schema'
import {
  listUserApiKeysHandler,
  listUserActiveApiKeysHandler,

  getUserApiKeyByIdHandler,
  createUserApiKeyHandler,
  revokeUserApiKeyHandler,
  revokeAllUserApiKeysHandler,
  regenerateUserApiKeyHandler,
  verifyApiKeyHandler
} from './apiKey.controller'
import { ErrorSchema } from '@/schemas/error.schema'
import { apiKeyAuthMiddleware } from '@/middlewares/apiKey.middleware'

const apiKeyRoutes = new Hono()

apiKeyRoutes.get(
  '/',
  describeRoute({
    tags: ['User API Keys'],
    summary: 'List all API keys for a user',
    description: 'Returns all API keys (metadata only, never the secret value) for the user. The real API key value is only shown once, at creation or regeneration. If you lose it, you must regenerate a new one.',
    responses: {
      200: { description: 'List of API keys', content: { 'application/json': { schema: resolver(ApiKeyPublicSchema.array()) } } },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
    }
  }),
  listUserApiKeysHandler
)

apiKeyRoutes.get(
  '/active',
  describeRoute({
    tags: ['User API Keys'],
    summary: 'List active API keys for a user',
    description: 'Returns only active (not revoked) API keys for the user.',
    responses: {
      200: { description: 'List of active API keys', content: { 'application/json': { schema: resolver(ApiKeyPublicSchema.array()) } } },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
    }
  }),
  listUserActiveApiKeysHandler
)



apiKeyRoutes.get(
  '/:keyUuid',
  describeRoute({
    tags: ['User API Keys'],
    summary: 'Get details of an API key',
    description: 'Returns metadata for a specific API key (never the secret value). The real API key value is only shown once, at creation or regeneration.',
    parameters: [
      { in: 'path', name: 'keyUuid', required: true, schema: { type: 'string', format: 'uuid' }, description: 'API Key UUID' }
    ],
    responses: {
      200: { description: 'API key details', content: { 'application/json': { schema: resolver(ApiKeyPublicSchema) } } },
      404: { description: 'API key not found', content: { 'application/json': { schema: resolver(ErrorSchema) } } },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
    }
  }),
  getUserApiKeyByIdHandler
)

apiKeyRoutes.post(
  '/',
  describeRoute({
    tags: ['User API Keys'],
    summary: 'Create a new API key for a user',
    description: 'Creates a new API key for the user. Use this key with the X-API-Key header for IDE extensions and integrations. The real API key value is only shown once in the response. If you lose it, you must regenerate a new one.',
    requestBody: {
      content: { 'application/json': { schema: { type: 'object', properties: { label: { type: 'string', example: 'My App Key' }, description: { type: 'string', example: 'Key for syncing with my app' } } } } }
    },
    responses: {
      201: {
        description: 'API key created. The real API key value is only shown once in this response.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                apiKey: { 
                  type: 'string', 
                  example: 'tfk_S25nIOfC_Tle6S3eE-23y5sftwzPj4aF',
                  description: 'The newly generated API key. It starts with the prefix `tfk_`. This is the only time the key is shown in plaintext.'
                },
                apiKeyPublic: { $ref: '#/components/schemas/ApiKey' }
              }
            }
          }
        }
      },
      400: { description: 'Invalid input', content: { 'application/json': { schema: resolver(ErrorSchema) } } },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
    }
  }),
  createUserApiKeyHandler
)

apiKeyRoutes.delete(
  '/:keyUuid',
  describeRoute({
    tags: ['User API Keys'],
    summary: 'Revoke a specific API key',
    description: 'Revokes (deletes) a specific API key for the user.',
    parameters: [
      { in: 'path', name: 'keyUuid', required: true, schema: { type: 'string', format: 'uuid' }, description: 'API Key UUID' }
    ],
    responses: {
      200: { description: 'API key revoked', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true } } } } } },
      404: { description: 'API key not found or already revoked', content: { 'application/json': { schema: resolver(ErrorSchema) } } },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
    }
  }),
  revokeUserApiKeyHandler
)

apiKeyRoutes.delete(
  '/',
  describeRoute({
    tags: ['User API Keys'],
    summary: 'Revoke all API keys for a user',
    description: 'Revokes (deletes) all API keys for the user.',
    responses: {
      200: { description: 'All API keys revoked', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true }, revoked: { type: 'number', example: 2 } } } } } },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
    }
  }),
  revokeAllUserApiKeysHandler
)

apiKeyRoutes.post(
  '/:keyUuid/regenerate',
  describeRoute({
    tags: ['User API Keys'],
    summary: 'Regenerate an API key',
    description: 'Revokes the old API key and creates a new one with the same label and description. Use this key with the X-API-Key header for IDE extensions and integrations. The real API key value is only shown once in the response. If you lose it, you must regenerate a new one.',
    parameters: [
      { in: 'path', name: 'keyUuid', required: true, schema: { type: 'string', format: 'uuid' }, description: 'API Key UUID' }
    ],
    responses: {
      200: {
        description: 'API key regenerated. The real API key value is only shown once in this response.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                apiKey: { 
                  type: 'string', 
                  example: 'tfk_S25nIOfC_Tle6S3eE-23y5sftwzPj4aF',
                  description: 'The newly generated API key. It starts with the prefix `tfk_`. This is the only time the key is shown in plaintext.'
                },
                apiKeyPublic: { $ref: '#/components/schemas/ApiKey' }
              }
            }
          }
        }
      },
      404: { description: 'API key not found', content: { 'application/json': { schema: resolver(ErrorSchema) } } },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
    }
  }),
  regenerateUserApiKeyHandler
)

/**
 * API Key Verification Route
 * 
 * This route verifies the validity of an API key provided in the X-API-Key header.
 * It uses the apiKeyAuthMiddleware to perform all necessary validations:
 * - API key exists and matches hash in database
 * - API key is not revoked (revoked_at IS NULL)
 * - API key is not deleted (deleted_at IS NULL)  
 * - Associated user is not deleted (user.deleted_at IS NULL)
 * - Updates last_used_at timestamp
 * 
 * Returns the validity status and associated user information.
 */
apiKeyRoutes.post(
  '/verify',
  describeRoute({
    tags: ['User API Keys'],
    summary: 'Verify API key validity',
    description: 'Verifies if the provided API key (via X-API-Key header) is valid and returns the associated user information. This endpoint validates that the API key exists, is not revoked, is not deleted, and belongs to an active user. The last_used_at timestamp is updated upon successful verification.',
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
          example: 'tfk_S25nIOfC_Tle6S3eE-23y5sftwzPj4aF',
          pattern: '^tfk\\w{32,}$',
          description: 'The API key to verify. It must start with the prefix `tfk_`.'
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
    }
  }),
  apiKeyAuthMiddleware,
  verifyApiKeyHandler
)

export default apiKeyRoutes
