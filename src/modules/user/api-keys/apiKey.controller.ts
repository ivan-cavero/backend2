import type { Context } from 'hono'
import * as apiKeyService from './apiKey.service'
import * as userService from '../user.service'
import { HTTPException } from '@/middlewares/errorHandler'
import { generateApiKey, hashApiKey } from '@/utils/apiKey'

export const listUserApiKeysHandler = async (c: Context) => {
  const uuid = c.req.param('uuid')
  const keys = await apiKeyService.getUserApiKeys(uuid)
  return c.json(keys)
}

export const listUserActiveApiKeysHandler = async (c: Context) => {
  const uuid = c.req.param('uuid')
  const keys = await apiKeyService.getActiveUserApiKeys(uuid)
  return c.json(keys)
}

export const getUserApiKeyByIdHandler = async (c: Context) => {
  const uuid = c.req.param('uuid')
  const keyUuid = c.req.param('keyUuid')
  const key = await apiKeyService.getUserApiKeyById(uuid, keyUuid)
  if (!key) {
    return c.json({ ok: false, error: 'API key not found' }, 404)
  }
  return c.json(key)
}

export const createUserApiKeyHandler = async (c: Context) => {
  const uuid = c.req.param('uuid')
  const { label, description } = await c.req.json().catch(() => ({}))
  
  // Generate API key and hash it
  const rawApiKey = generateApiKey()
  const hashedApiKey = await hashApiKey(rawApiKey)
  
  const caps = c.get('capabilities' as unknown as keyof typeof c.var) as { apiKeyLimit?: number } | undefined
  const apiKeyPublic = await apiKeyService.createUserApiKey(uuid, caps?.apiKeyLimit, hashedApiKey, label, description)
  if (!apiKeyPublic) {
    return c.json({ ok: false, error: 'Failed to create API key' }, 400)
  }
  
  // Solo se muestra el valor real una vez
  return c.json({ apiKey: rawApiKey, apiKeyPublic }, 201)
}

export const revokeUserApiKeyHandler = async (c: Context) => {
  const uuid = c.req.param('uuid')
  const keyUuid = c.req.param('keyUuid')
  const ok = await apiKeyService.revokeUserApiKey(uuid, keyUuid)
  if (!ok) {
    return c.json({ ok: false, error: 'API key not found or already revoked' }, 404)
  }
  return c.json({ ok: true })
}

export const revokeAllUserApiKeysHandler = async (c: Context) => {
  const uuid = c.req.param('uuid')
  const count = await apiKeyService.revokeAllUserApiKeys(uuid)
  return c.json({ ok: true, revoked: count })
}

export const regenerateUserApiKeyHandler = async (c: Context) => {
  const uuid = c.req.param('uuid')
  const keyUuid = c.req.param('keyUuid')
  // Revoca la anterior y crea una nueva con los mismos metadatos
  const oldKey = await apiKeyService.getUserApiKeyById(uuid, keyUuid)
  if (!oldKey) {
    return c.json({ ok: false, error: 'API key not found' }, 404)
  }
  await apiKeyService.revokeUserApiKey(uuid, keyUuid)
  
  // Generate new API key and hash it
  const rawApiKey = generateApiKey()
  const hashedApiKey = await hashApiKey(rawApiKey)
  
  const caps = c.get('capabilities' as unknown as keyof typeof c.var) as { apiKeyLimit?: number } | undefined
  const apiKeyPublic = await apiKeyService.createUserApiKey(uuid, caps?.apiKeyLimit, hashedApiKey, oldKey.label, oldKey.description)
  if (!apiKeyPublic) {
    return c.json({ ok: false, error: 'Failed to regenerate API key' }, 400)
  }
  
  return c.json({ apiKey: rawApiKey, apiKeyPublic })
}

/**
 * Verify API key validity and return user information
 * 
 * This handler leverages the apiKeyAuthMiddleware which:
 * - Validates the API key exists and matches a hash in the database
 * - Ensures the API key is not revoked (revoked_at IS NULL)
 * - Ensures the API key is not deleted (deleted_at IS NULL)
 * - Ensures the associated user is not deleted (user.deleted_at IS NULL)
 * - Updates the last_used_at timestamp
 * - Sets userUuid and apiKeyUuid in the context
 * 
 * If the middleware passes, we know the API key is valid and can return user info.
 */
export const verifyApiKeyHandler = async (c: Context) => {
  // At this point, the apiKeyAuthMiddleware has already validated:
  // 1. API key exists and matches hash
  // 2. API key is not revoked
  // 3. API key is not deleted  
  // 4. User is not deleted
  // 5. Context has userUuid and apiKeyUuid set
  
  const userUuid = c.get('userUuid')
  const apiKeyUuid = c.get('apiKeyUuid')
  
  if (!userUuid || !apiKeyUuid) {
    throw new HTTPException(500, { message: 'Internal error: missing context from middleware' })
  }
  
  // Get full user information
  const user = await userService.getUserByUuid(userUuid)
  if (!user) {
    throw new HTTPException(404, { message: 'User not found' })
  }
  
  // Return verification result with user information (without internal ID)
  return c.json({
    valid: true,
    user: userService.toPublicUser(user),
    apiKeyUuid
  })
} 