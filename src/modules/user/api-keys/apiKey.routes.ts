import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver } from 'hono-openapi/zod'
import { ApiKeyPublicSchema } from './apiKey.schema'
import {
  listUserApiKeysHandler,
  listUserActiveApiKeysHandler,

  getUserApiKeyByIdHandler,
  createUserApiKeyHandler,
  revokeUserApiKeyHandler,
  revokeAllUserApiKeysHandler,
  regenerateUserApiKeyHandler
} from './apiKey.controller'
import { ErrorSchema } from '@/schemas/error.schema'

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
                apiKey: { type: 'string', example: 'b3b3b3b3-b3b3-4b3b-b3b3-b3b3b3b3b3b3e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4' },
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
                apiKey: { type: 'string', example: 'b3b3b3b3-b3b3-4b3b-b3b3-b3b3b3b3b3b3e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4' },
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

export default apiKeyRoutes
