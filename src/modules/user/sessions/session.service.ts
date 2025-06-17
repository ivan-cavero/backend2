import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { mysqlPool } from '@/db/mysql'
import type { UserSession, UserSessionPublic } from './session.types'

function mapDbSessionToUserSession(row: RowDataPacket): UserSession {
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
  // Elimina id, token y userId
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, token: _token, userId: _userId, ...rest } = session;
  return rest;
}

export async function listUserSessions(userUuid: string): Promise<UserSessionPublic[]> {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `SELECT s.* FROM refresh_tokens s
     JOIN users u ON s.user_id = u.id
     WHERE u.uuid = ? AND s.deleted_at IS NULL
     ORDER BY s.created_at DESC`,
    [userUuid]
  )
  return rows.map(mapDbSessionToUserSession).map(toPublicSession);
}

export async function listUserActiveSessions(userUuid: string): Promise<UserSessionPublic[]> {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `SELECT s.* FROM refresh_tokens s
     JOIN users u ON s.user_id = u.id
     WHERE u.uuid = ? AND s.revoked_at IS NULL AND s.deleted_at IS NULL AND s.expires_at > NOW()
     ORDER BY s.created_at DESC`,
    [userUuid]
  )
  return rows.map(mapDbSessionToUserSession).map(toPublicSession);
}

export async function listUserRevokedSessions(userUuid: string): Promise<UserSessionPublic[]> {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `SELECT s.* FROM refresh_tokens s
     JOIN users u ON s.user_id = u.id
     WHERE u.uuid = ? AND s.revoked_at IS NOT NULL AND s.deleted_at IS NULL
     ORDER BY s.revoked_at DESC`,
    [userUuid]
  )
  return rows.map(mapDbSessionToUserSession).map(toPublicSession);
}

export async function getUserSessionById(userUuid: string, sessionId: string): Promise<UserSessionPublic | null> {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `SELECT s.* FROM refresh_tokens s
     JOIN users u ON s.user_id = u.id
     WHERE u.uuid = ? AND s.uuid = ? AND s.deleted_at IS NULL
     LIMIT 1`,
    [userUuid, sessionId]
  )
  const row = rows[0];
  if (!row) {
    return null;
  }
  return toPublicSession(mapDbSessionToUserSession(row));
}

export async function revokeUserSession(userUuid: string, sessionId: string): Promise<boolean> {
  const [result] = await mysqlPool.query<ResultSetHeader>(
    `UPDATE refresh_tokens s
     JOIN users u ON s.user_id = u.id
     SET s.revoked_at = NOW()
     WHERE u.uuid = ? AND s.uuid = ? AND s.revoked_at IS NULL AND s.deleted_at IS NULL`,
    [userUuid, sessionId]
  )
  return result.affectedRows > 0
}

export async function revokeAllUserSessions(userUuid: string): Promise<number> {
  const [result] = await mysqlPool.query<ResultSetHeader>(
    `UPDATE refresh_tokens s
     JOIN users u ON s.user_id = u.id
     SET s.revoked_at = NOW()
     WHERE u.uuid = ? AND s.revoked_at IS NULL AND s.deleted_at IS NULL`,
    [userUuid]
  )
  return result.affectedRows
} 