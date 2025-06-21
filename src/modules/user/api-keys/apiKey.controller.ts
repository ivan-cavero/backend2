import type { Context } from 'hono'
import * as apiKeyService from './apiKey.service'

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
  const rawApiKey = Bun.randomUUIDv7() + Bun.hash(Bun.randomUUIDv7() + Date.now().toString()).toString(16)
  const hashedApiKey = await Bun.password.hash(rawApiKey, { algorithm: 'argon2id' })
  
  const apiKeyPublic = await apiKeyService.createUserApiKey(uuid, hashedApiKey, label, description)
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
  const rawApiKey = Bun.randomUUIDv7() + Bun.hash(Bun.randomUUIDv7() + Date.now().toString()).toString(16)
  const hashedApiKey = await Bun.password.hash(rawApiKey, { algorithm: 'argon2id' })
  
  const apiKeyPublic = await apiKeyService.createUserApiKey(uuid, hashedApiKey, oldKey.label, oldKey.description)
  if (!apiKeyPublic) {
    return c.json({ ok: false, error: 'Failed to regenerate API key' }, 400)
  }
  
  return c.json({ apiKey: rawApiKey, apiKeyPublic })
} 