/**
 * API Key service for managing user API keys in PostgreSQL
 * 
 * This service uses Bun's native SQL API with tagged template literals
 * for safe query execution and automatic SQL injection protection.
 */

import { postgresDb } from '@/db/postgresql'
import type { UserApiKey, UserApiKeyPublic } from './apiKey.types'

// Maximum number of API keys per user (default: 1)
export const MAX_API_KEYS_PER_USER = 1

/**
 * Database row interface for API key queries
 */
interface ApiKeyDbRow {
  id: number
  uuid: string
  user_id: number
  api_key_hash: string
  label?: string
  description?: string
  created_at: Date
  last_used_at: Date
  revoked_at?: Date | null
  deleted_at?: Date | null
}

function mapDbApiKeyToUserApiKey(row: ApiKeyDbRow): UserApiKey {
  return {
    id: row.id,
    uuid: row.uuid,
    userId: row.user_id,
    apiKeyHash: row.api_key_hash,
    label: row.label,
    description: row.description,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
    deletedAt: row.deleted_at
  }
}

function toPublicApiKey(apiKey: UserApiKey): UserApiKeyPublic {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, userId: _userId, apiKeyHash: _hash, ...publicData } = apiKey
  return publicData
}

/**
 * Get all user API keys for a user by UUID
 */
export async function getUserApiKeys(userUuid: string): Promise<UserApiKeyPublic[]> {
  const rows = await postgresDb`
    SELECT k.* FROM api_keys k
    JOIN users u ON k.user_id = u.id
    WHERE u.uuid = ${userUuid} AND k.deleted_at IS NULL
    ORDER BY k.created_at DESC
  ` as ApiKeyDbRow[]
  return rows.map((row) => toPublicApiKey(mapDbApiKeyToUserApiKey(row)))
}

/**
 * Get all active (non-revoked) user API keys for a user by UUID
 */
export async function getActiveUserApiKeys(userUuid: string): Promise<UserApiKeyPublic[]> {
  const rows = await postgresDb`
    SELECT k.* FROM api_keys k
    JOIN users u ON k.user_id = u.id
    WHERE u.uuid = ${userUuid} AND k.revoked_at IS NULL AND k.deleted_at IS NULL
    ORDER BY k.created_at DESC
  ` as ApiKeyDbRow[]
  return rows.map((row) => toPublicApiKey(mapDbApiKeyToUserApiKey(row)))
}

/**
 * Get API key by user UUID and key UUID
 */
export async function getUserApiKeyById(userUuid: string, keyUuid: string): Promise<UserApiKeyPublic | null> {
  const rows = await postgresDb`
    SELECT k.* FROM api_keys k
    JOIN users u ON k.user_id = u.id
    WHERE u.uuid = ${userUuid} AND k.uuid = ${keyUuid} AND k.deleted_at IS NULL
    LIMIT 1
  ` as ApiKeyDbRow[]
  const row = rows[0]
  if (!row) {
    return null
  }
  return toPublicApiKey(mapDbApiKeyToUserApiKey(row))
}

/**
 * Revoke a user API key by user UUID and key UUID
 */
export async function revokeUserApiKey(userUuid: string, keyUuid: string): Promise<boolean> {
  const result = await postgresDb`
    UPDATE api_keys k
    SET revoked_at = CURRENT_TIMESTAMP
    FROM users u
    WHERE k.user_id = u.id 
    AND u.uuid = ${userUuid} 
    AND k.uuid = ${keyUuid} 
    AND k.revoked_at IS NULL 
    AND k.deleted_at IS NULL
  `
  return result.count > 0
}

/**
 * Revoke all user API keys by user UUID
 */
export async function revokeAllUserApiKeys(userUuid: string): Promise<number> {
  const result = await postgresDb`
    UPDATE api_keys k
    SET revoked_at = CURRENT_TIMESTAMP
    FROM users u
    WHERE k.user_id = u.id 
    AND u.uuid = ${userUuid} 
    AND k.revoked_at IS NULL 
    AND k.deleted_at IS NULL
  `
  return result.count
}

/**
 * Create a new API key for a user, enforcing the maximum limit
 */
export async function createUserApiKey(userUuid: string, hashedApiKey: string, label?: string, description?: string): Promise<UserApiKeyPublic | null> {
  // Check if user exists
  const userRows = await postgresDb`
    SELECT id FROM users 
    WHERE uuid = ${userUuid} AND deleted_at IS NULL
  ` as Array<{ id: number }>
  
  if (userRows.length === 0) {
    return null
  }

  const userId = userRows[0].id

  // Check current API key count
  const countRows = await postgresDb`
    SELECT COUNT(*) as count 
    FROM api_keys 
    WHERE user_id = ${userId} AND revoked_at IS NULL AND deleted_at IS NULL
  ` as Array<{ count: string }>

  if (Number(countRows[0].count) >= MAX_API_KEYS_PER_USER) {
    throw new Error(`Maximum of ${MAX_API_KEYS_PER_USER} API keys allowed per user`)
  }

  // Create new API key
  const uuid = Bun.randomUUIDv7()
  await postgresDb`
    INSERT INTO api_keys (uuid, user_id, api_key_hash, label, description)
    VALUES (${uuid}, ${userId}, ${hashedApiKey}, ${label}, ${description})
  `

  return getUserApiKeyById(userUuid, uuid)
} 