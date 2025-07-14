/**
 * Session service for managing user refresh tokens in PostgreSQL
 * 
 * This service uses Bun's native SQL API with tagged template literals
 * for safe query execution and automatic SQL injection protection.
 */

import { postgresDb } from '@/db/postgresql'
import type { UserSession, UserSessionPublic, SessionDbRow } from './session.types'



function mapDbSessionToUserSession(row: SessionDbRow): UserSession {
  return {
    id: row.id,
    uuid: row.uuid,
    userId: row.user_id,
    token: row.token,
    userAgent: row.user_agent,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    lastUsedAt: row.last_used_at,
    deletedAt: row.deleted_at
  }
}

function toPublicSession(session: UserSession): UserSessionPublic {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, token: _token, userId: _userId, ...publicData } = session
  return publicData
}

/**
 * Get all user sessions (refresh tokens) for a user by UUID
 */
export async function getUserSessions(userUuid: string): Promise<UserSessionPublic[]> {
  const rows = await postgresDb`
    SELECT s.* FROM refresh_tokens s
    JOIN users u ON s.user_id = u.id
    WHERE u.uuid = ${userUuid} AND s.deleted_at IS NULL
    ORDER BY s.created_at DESC
  ` as SessionDbRow[]
  return rows.map((row) => toPublicSession(mapDbSessionToUserSession(row)))
}

/**
 * Get all active (non-revoked) user sessions for a user by UUID
 */
export async function getActiveUserSessions(userUuid: string): Promise<UserSessionPublic[]> {
  const rows = await postgresDb`
    SELECT s.* FROM refresh_tokens s
    JOIN users u ON s.user_id = u.id
    WHERE u.uuid = ${userUuid} AND s.revoked_at IS NULL AND s.deleted_at IS NULL
    ORDER BY s.created_at DESC
  ` as SessionDbRow[]
  return rows.map((row) => toPublicSession(mapDbSessionToUserSession(row)))
}

/**
 * Get session by user UUID and session UUID
 */
export async function getUserSessionById(userUuid: string, sessionId: string): Promise<UserSessionPublic | null> {
  const rows = await postgresDb`
    SELECT s.* FROM refresh_tokens s
    JOIN users u ON s.user_id = u.id
    WHERE u.uuid = ${userUuid} AND s.uuid = ${sessionId} AND s.deleted_at IS NULL
    LIMIT 1
  ` as SessionDbRow[]
  const row = rows[0]
  if (!row) {
    return null
  }
  return toPublicSession(mapDbSessionToUserSession(row))
}

/**
 * Revoke a specific user session by user UUID and session UUID
 */
export async function revokeUserSession(userUuid: string, sessionId: string): Promise<boolean> {
  const result = await postgresDb`
    UPDATE refresh_tokens s
    SET revoked_at = CURRENT_TIMESTAMP
    FROM users u
    WHERE s.user_id = u.id 
    AND u.uuid = ${userUuid} 
    AND s.uuid = ${sessionId} 
    AND s.revoked_at IS NULL 
    AND s.deleted_at IS NULL
    RETURNING s.id
  ` as Array<{ id: number }>
  return result.length > 0
}

/**
 * Revoke all user sessions by user UUID
 */
export async function revokeAllUserSessions(userUuid: string): Promise<number> {
  const result = await postgresDb`
    UPDATE refresh_tokens s
    SET revoked_at = CURRENT_TIMESTAMP
    FROM users u
    WHERE s.user_id = u.id 
    AND u.uuid = ${userUuid} 
    AND s.revoked_at IS NULL 
    AND s.deleted_at IS NULL
    RETURNING s.id
  ` as Array<{ id: number }>
  return result.length
} 