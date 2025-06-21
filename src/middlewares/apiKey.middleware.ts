/**
 * API Key authentication middleware for IDE extensions and integrations using PostgreSQL
 * 
 * - Expects header: X-API-Key: <api_key>
 * - This is the standard method for API key authentication used by IDE extensions.
 * - Validates the API key (not revoked, not deleted, user not deleted)
 * - Attaches userUuid and apiKeyUuid to context if valid
 * 
 * This middleware uses Bun's native SQL API with tagged template literals
 * for safe query execution and automatic SQL injection protection.
 */

import { postgresDb } from '@/db/postgresql'
import { HTTPException } from './errorHandler'
import type { Context, Next } from 'hono'
import { logger } from '@/utils/logger'

interface ApiKeyRow {
  api_key_uuid: string
  user_uuid: string
  api_key_hash: string
}

/**
 * API Key authentication middleware for IDE extensions and integrations.
 */
export const apiKeyAuthMiddleware = async (c: Context, next: Next) => {
  const apiKey = c.req.header('x-api-key')
  
  logger.info(`API Key middleware - Header received: ${apiKey ? 'YES' : 'NO'}`)
  
  if (!apiKey) {
    logger.warn('API Key middleware - Missing X-API-Key header')
    throw new HTTPException(401, { message: 'Missing API key header. Use X-API-Key: <api_key>' })
  }

  logger.info(`API Key middleware - Processing key: ${apiKey.substring(0, 8)}...`)

  // Find all active API keys in the database (not revoked, not deleted, user not deleted)
  const rows = await postgresDb`
    SELECT k.uuid as api_key_uuid, u.uuid as user_uuid, k.api_key_hash
    FROM api_keys k
    JOIN users u ON k.user_id = u.id
    WHERE k.revoked_at IS NULL AND k.deleted_at IS NULL AND u.deleted_at IS NULL
  ` as ApiKeyRow[]

  logger.info(`API Key middleware - Found ${rows.length} active API keys in database`)

  // Check each hash (constant time comparison for security)
  let found: { apiKeyUuid: string; userUuid: string } | null = null
  for (const row of rows) {
    logger.info(`API Key middleware - Checking against key: ${row.api_key_uuid}`)
    try {
      const isValid = await Bun.password.verify(apiKey, row.api_key_hash)
      logger.info(`API Key middleware - Key ${row.api_key_uuid} match: ${isValid}`)
      if (isValid) {
        found = { apiKeyUuid: row.api_key_uuid, userUuid: row.user_uuid }
        break
      }
    } catch (error) {
      logger.error(`API Key middleware - Error verifying key ${row.api_key_uuid}:`, error)
    }
  }

  if (!found) {
    logger.warn(`API Key middleware - No valid key found for: ${apiKey.substring(0, 8)}...`)
    throw new HTTPException(401, { message: 'Invalid or revoked API key' })
  }

  logger.info(`API Key middleware - Successfully authenticated user: ${found.userUuid}`)

  // Update last_used_at timestamp for the API key
  await postgresDb`
    UPDATE api_keys 
    SET last_used_at = CURRENT_TIMESTAMP 
    WHERE uuid = ${found.apiKeyUuid}
  `

  // Attach to context for downstream handlers
  c.set('userUuid', found.userUuid)
  c.set('apiKeyUuid', found.apiKeyUuid)
  
  logger.info(`API Key middleware - Context set with userUuid: ${found.userUuid}`)
  
  await next()
} 