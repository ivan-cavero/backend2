/**
 * Service for managing refresh tokens in PostgreSQL database.
 * Handles creation, validation, revocation, and cleanup of refresh tokens.
 *
 * This service uses Bun's native SQL API with tagged template literals
 * for safe query execution and automatic SQL injection protection.
 */

import { postgresDb } from '@/db/postgresql'
import { generateRefreshToken } from './auth.service'
import type { RefreshToken, RefreshTokenDbRow } from './auth.types'

const MAX_REFRESH_TOKENS_PER_USER = 5
const REFRESH_TOKEN_EXPIRY_DAYS = 30

/**
 * Creates a new refresh token for a user, enforcing a maximum of 5 active tokens per user.
 * If the user already has 5 tokens, the oldest is revoked.
 */
export async function createRefreshToken({
	userId,
	userAgent,
	ipAddress
}: {
	userId: number
	userAgent?: string
	ipAddress?: string
}): Promise<RefreshToken> {
	// Remove oldest if over limit
	const tokens = (await postgresDb`
    SELECT id FROM refresh_tokens 
    WHERE user_id = ${userId} AND revoked_at IS NULL AND deleted_at IS NULL 
    ORDER BY created_at ASC
  `) as Array<{ id: number }>

	if (tokens.length >= MAX_REFRESH_TOKENS_PER_USER) {
		const oldest = tokens[0]
		await postgresDb`
      UPDATE refresh_tokens 
      SET revoked_at = CURRENT_TIMESTAMP 
      WHERE id = ${oldest.id}
    `
	}

	const uuid = Bun.randomUUIDv7()
	const token = generateRefreshToken()
	const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

	await postgresDb`
    INSERT INTO refresh_tokens (uuid, user_id, token, user_agent, ip_address, expires_at)
    VALUES (${uuid}, ${userId}, ${token}, ${userAgent}, ${ipAddress}, ${expiresAt})
  `

	const rows = (await postgresDb`
    SELECT * FROM refresh_tokens WHERE uuid = ${uuid}
  `) as RefreshTokenDbRow[]
	return mapDbRefreshTokenToRefreshToken(rows[0])
}

/**
 * Finds a refresh token by its token string, only if it is active and not revoked.
 */
export async function findRefreshToken(token: string): Promise<RefreshToken | null> {
	const rows = (await postgresDb`
    SELECT * FROM refresh_tokens 
    WHERE token = ${token} AND revoked_at IS NULL AND deleted_at IS NULL
  `) as RefreshTokenDbRow[]
	if (!rows[0]) {
		return null
	}
	return mapDbRefreshTokenToRefreshToken(rows[0])
}

/**
 * Revokes a refresh token by its token string.
 */
export async function revokeRefreshToken(token: string): Promise<void> {
	await postgresDb`
    UPDATE refresh_tokens 
    SET revoked_at = CURRENT_TIMESTAMP 
    WHERE token = ${token}
  `
}

/**
 * Revokes all refresh tokens for a given user ID.
 */
export async function revokeAllUserRefreshTokens(userId: number): Promise<void> {
	await postgresDb`
    UPDATE refresh_tokens 
    SET revoked_at = CURRENT_TIMESTAMP 
    WHERE user_id = ${userId}
  `
}

/**
 * Updates the last_used_at timestamp for a refresh token
 */
export async function updateRefreshTokenLastUsed(token: string): Promise<void> {
	await postgresDb`
    UPDATE refresh_tokens 
    SET last_used_at = CURRENT_TIMESTAMP 
    WHERE token = ${token} AND revoked_at IS NULL AND deleted_at IS NULL
  `
}

/**
 * Maps database row to RefreshToken object
 */
function mapDbRefreshTokenToRefreshToken(row: RefreshTokenDbRow): RefreshToken {
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
