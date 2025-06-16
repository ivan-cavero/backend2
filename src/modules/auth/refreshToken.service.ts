/**
 * Service for managing refresh tokens in the database.
 * Handles creation, validation, revocation, and cleanup of refresh tokens.
 */
import { mysqlPool } from '@/db/mysql'
import { generateRefreshToken } from './auth.service'
import type { RefreshToken } from './auth.types'
import type { RowDataPacket } from 'mysql2/promise'

const MAX_REFRESH_TOKENS_PER_USER = 5
const REFRESH_TOKEN_EXPIRY_DAYS = 30

/**
 * Creates a new refresh token for a user, enforcing a maximum of 5 active tokens per user.
 * If the user already has 5 tokens, the oldest is revoked.
 */
export async function createRefreshToken({ userId, userAgent, ipAddress }: { userId: number, userAgent?: string, ipAddress?: string }): Promise<RefreshToken> {
  // Remove oldest if over limit
  const [tokens] = await mysqlPool.query<RowDataPacket[]>(
    'SELECT id FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL AND deleted_at IS NULL ORDER BY created_at ASC',
    [userId]
  )
  if (tokens.length >= MAX_REFRESH_TOKENS_PER_USER) {
    const oldest = tokens[0]
    await mysqlPool.query('UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [oldest.id])
  }

  const uuid = Bun.randomUUIDv7()
  const token = generateRefreshToken()
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await mysqlPool.query(
    'INSERT INTO refresh_tokens (uuid, user_id, token, user_agent, ip_address, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    [uuid, userId, token, userAgent, ipAddress, expiresAt]
  )

  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    'SELECT * FROM refresh_tokens WHERE uuid = ?',
    [uuid]
  )
  return mapDbRefreshTokenToRefreshToken(rows[0])
}

/**
 * Finds a refresh token by its token string, only if it is active and not revoked.
 */
export async function findRefreshToken(token: string): Promise<RefreshToken | null> {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    'SELECT * FROM refresh_tokens WHERE token = ? AND revoked_at IS NULL AND deleted_at IS NULL',
    [token]
  )
  if (!rows[0]) { return null }
  return mapDbRefreshTokenToRefreshToken(rows[0])
}

/**
 * Revokes a refresh token by its token string.
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  await mysqlPool.query(
    'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP, deleted_at = CURRENT_TIMESTAMP WHERE token = ?',
    [token]
  )
}

/**
 * Revokes all refresh tokens for a given user ID.
 */
export async function revokeAllUserRefreshTokens(userId: number): Promise<void> {
  await mysqlPool.query(
    'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP, deleted_at = CURRENT_TIMESTAMP WHERE user_id = ?',
    [userId]
  )
}

/**
 * Maps a database row to a RefreshToken object.
 */
function mapDbRefreshTokenToRefreshToken(row: RowDataPacket): RefreshToken {
  return {
    id: row.id,
    uuid: row.uuid,
    userId: row.user_id,
    token: row.token,
    userAgent: row.user_agent || undefined,
    ipAddress: row.ip_address || undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at || undefined,
    lastUsedAt: row.last_used_at || undefined,
  }
} 