/**
 * PostgreSQL Database Connection using Bun's native SQL support
 * 
 * This module provides a connection pool to PostgreSQL using Bun's built-in
 * SQL functionality with tagged template literals for safe query execution.
 * 
 * Features:
 * - Built-in SQL injection protection via tagged templates
 * - Connection pooling
 * - Transaction support
 * - BigInt handling for large numbers
 * - Automatic prepared statements for better performance
 */

import { SQL } from 'bun'
import { CONFIG } from '@/config'

/**
 * PostgreSQL connection instance using Bun's native SQL API
 * 
 * The connection is automatically configured from environment variables:
 * - POSTGRES_HOST
 * - POSTGRES_PORT  
 * - POSTGRES_USER
 * - POSTGRES_PASSWORD
 * - POSTGRES_DATABASE
 * 
 * Connection pooling and prepared statements are handled automatically.
 * All queries should use tagged template literals for safety:
 * 
 * @example
 * ```typescript
 * const users = await postgresDb`
 *   SELECT * FROM users 
 *   WHERE active = ${true} 
 *   AND age >= ${18}
 * `;
 * ```
 */
// Construct the PostgreSQL connection string with SSL disabled for development
const connectionString = `postgres://${CONFIG.POSTGRES_USER}:${CONFIG.POSTGRES_PASSWORD}@${CONFIG.POSTGRES_HOST}:${CONFIG.POSTGRES_PORT}/${CONFIG.POSTGRES_DATABASE}?sslmode=disable`

/**
 * PostgreSQL connection using Bun's native SQL API with connection string
 */  
export const postgresDb = new SQL(connectionString)

/**
 * Gracefully close all database connections
 * Should be called during application shutdown
 */
export async function closePostgresConnection(): Promise<void> {
	try {
		await postgresDb.close({ timeout: 5000 })
		console.log('PostgreSQL connections closed successfully')
	} catch (error) {
		console.error('Error closing PostgreSQL connections:', error)
		throw error
	}
}

/**
 * Health check function to verify database connectivity
 * Useful for application readiness checks
 */
export async function checkPostgresHealth(): Promise<boolean> {
	try {
		const result = await postgresDb`SELECT 1 as health_check`
		return result.length > 0 && result[0].health_check === 1
	} catch (error) {
		console.error('PostgreSQL health check failed:', error)
		return false
	}
} 