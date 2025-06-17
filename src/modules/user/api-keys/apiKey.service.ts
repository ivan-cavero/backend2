import { mysqlPool } from '@/db/mysql'
import type { UserApiKey, UserApiKeyPublic } from './apiKey.types'
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise'

// Maximum number of API keys per user (default: 1)
export const MAX_API_KEYS_PER_USER = 1

function mapDbApiKeyToUserApiKey(row: RowDataPacket): UserApiKey {
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
  // Do not expose id, userId or apiKeyHash
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, userId: _userId, apiKeyHash: _hash, ...rest } = apiKey
  return rest
}

export async function listUserApiKeys(userUuid: string): Promise<UserApiKeyPublic[]> {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `SELECT k.* FROM api_keys k
     JOIN users u ON k.user_id = u.id
     WHERE u.uuid = ? AND k.deleted_at IS NULL
     ORDER BY k.created_at DESC`,
    [userUuid]
  )
  return rows.map(mapDbApiKeyToUserApiKey).map(toPublicApiKey)
}

export async function listUserActiveApiKeys(userUuid: string): Promise<UserApiKeyPublic[]> {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `SELECT k.* FROM api_keys k
     JOIN users u ON k.user_id = u.id
     WHERE u.uuid = ? AND k.revoked_at IS NULL AND k.deleted_at IS NULL
     ORDER BY k.created_at DESC`,
    [userUuid]
  )
  return rows.map(mapDbApiKeyToUserApiKey).map(toPublicApiKey)
}

export async function listUserRevokedApiKeys(userUuid: string): Promise<UserApiKeyPublic[]> {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `SELECT k.* FROM api_keys k
     JOIN users u ON k.user_id = u.id
     WHERE u.uuid = ? AND k.revoked_at IS NOT NULL AND k.deleted_at IS NULL
     ORDER BY k.revoked_at DESC`,
    [userUuid]
  )
  return rows.map(mapDbApiKeyToUserApiKey).map(toPublicApiKey)
}

export async function getUserApiKeyById(userUuid: string, keyUuid: string): Promise<UserApiKeyPublic | null> {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `SELECT k.* FROM api_keys k
     JOIN users u ON k.user_id = u.id
     WHERE u.uuid = ? AND k.uuid = ? AND k.deleted_at IS NULL
     LIMIT 1`,
    [userUuid, keyUuid]
  )
  const row = rows[0]
  if (!row) {
    return null
  }
  return toPublicApiKey(mapDbApiKeyToUserApiKey(row))
}

export async function revokeUserApiKey(userUuid: string, keyUuid: string): Promise<boolean> {
  const [result] = await mysqlPool.query<ResultSetHeader>(
    `UPDATE api_keys k
     JOIN users u ON k.user_id = u.id
     SET k.revoked_at = NOW()
     WHERE u.uuid = ? AND k.uuid = ? AND k.revoked_at IS NULL AND k.deleted_at IS NULL`,
    [userUuid, keyUuid]
  )
  return result.affectedRows > 0
}

export async function revokeAllUserApiKeys(userUuid: string): Promise<number> {
  const [result] = await mysqlPool.query<ResultSetHeader>(
    `UPDATE api_keys k
     JOIN users u ON k.user_id = u.id
     SET k.revoked_at = NOW()
     WHERE u.uuid = ? AND k.revoked_at IS NULL AND k.deleted_at IS NULL`,
    [userUuid]
  )
  return result.affectedRows
}

export async function createUserApiKey({
  userUuid,
  label,
  description
}: {
  userUuid: string
  label?: string
  description?: string
}): Promise<{ apiKey: string; apiKeyPublic: UserApiKeyPublic }> {
  // 1. Find user_id
  const [userRows] = await mysqlPool.query<RowDataPacket[]>(
    'SELECT id FROM users WHERE uuid = ? AND deleted_at IS NULL LIMIT 1',
    [userUuid]
  )
  const user = userRows[0]
  if (!user) {
    throw new Error('User not found')
  }
  // 2. Enforce API key limit
  const [countRows] = await mysqlPool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM api_keys WHERE user_id = ? AND revoked_at IS NULL AND deleted_at IS NULL',
    [user.id]
  )
  if (countRows[0].count >= MAX_API_KEYS_PER_USER) {
    throw new Error('API key limit reached for this user')
  }
  // 3. Generate secure API key
  const rawKey = Bun.randomUUIDv7() + Bun.hash(Bun.randomUUIDv7() + Date.now().toString()).toString(16)
  const apiKeyHash = await Bun.password.hash(rawKey, { algorithm: 'argon2id' })
  const keyUuid = Bun.randomUUIDv7()
  // 4. Insert into database
  await mysqlPool.query<ResultSetHeader>(
    'INSERT INTO api_keys (uuid, user_id, api_key_hash, label, description) VALUES (?, ?, ?, ?, ?)',
    [keyUuid, user.id, apiKeyHash, label, description]
  )
  // 5. Only show the real value once
  const apiKeyPublic: UserApiKeyPublic = {
    uuid: keyUuid,
    label,
    description,
    createdAt: new Date(),
    lastUsedAt: new Date(),
    revokedAt: null,
    deletedAt: null
  }
  return { apiKey: rawKey, apiKeyPublic }
} 