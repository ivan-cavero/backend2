import type { Context } from 'hono'
import * as apiKeyService from './apiKey.service'

export const listUserApiKeysHandler = async (c: Context) => {
  const uuid = c.req.param('uuid')
  const keys = await apiKeyService.listUserApiKeys(uuid)
  return c.json(keys)
}

export const listUserActiveApiKeysHandler = async (c: Context) => {
  const uuid = c.req.param('uuid')
  const keys = await apiKeyService.listUserActiveApiKeys(uuid)
  return c.json(keys)
}

export const listUserRevokedApiKeysHandler = async (c: Context) => {
  const uuid = c.req.param('uuid')
  const keys = await apiKeyService.listUserRevokedApiKeys(uuid)
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
  const { apiKey, apiKeyPublic } = await apiKeyService.createUserApiKey({ userUuid: uuid, label, description })
  // Solo se muestra el valor real una vez
  return c.json({ apiKey, apiKeyPublic }, 201)
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
  const { apiKey, apiKeyPublic } = await apiKeyService.createUserApiKey({
    userUuid: uuid,
    label: oldKey.label,
    description: oldKey.description
  })
  return c.json({ apiKey, apiKeyPublic })
} 