/**
 * User service for managing user data in PostgreSQL
 * 
 * This service uses Bun's native SQL API with tagged template literals
 * for safe query execution and automatic SQL injection protection.
 */

import { postgresDb } from '@/db/postgresql'
import type { User } from './user.types'

/**
 * Get user by UUID with provider identities
 */
export async function getUserByUuid(uuid: string): Promise<User | null> {
	const rows = await postgresDb`
		SELECT u.*, 
		       COALESCE(
		           json_agg(
		               json_build_object(
		                   'provider', p.name,
		                   'providerUserId', i.provider_user_id
		               )
		           ) FILTER (WHERE i.id IS NOT NULL),
		           '[]'::json
		       ) as provider_identities
		FROM users u
		LEFT JOIN identities i ON u.id = i.user_id AND i.deleted_at IS NULL
		LEFT JOIN providers p ON i.provider_id = p.id
		WHERE u.uuid = ${uuid} AND u.deleted_at IS NULL
		GROUP BY u.id
	` as UserDbRow[]
	const user = rows[0]
	return user ? mapDbUserToUser(user) : null
}

/**
 * Get user by email with provider identities
 */
export async function getUserByEmail(email: string): Promise<User | null> {
	const rows = await postgresDb`
		SELECT u.*, 
		       COALESCE(
		           json_agg(
		               json_build_object(
		                   'provider', p.name,
		                   'providerUserId', i.provider_user_id
		               )
		           ) FILTER (WHERE i.id IS NOT NULL),
		           '[]'::json
		       ) as provider_identities
		FROM users u
		LEFT JOIN identities i ON u.id = i.user_id AND i.deleted_at IS NULL
		LEFT JOIN providers p ON i.provider_id = p.id
		WHERE u.email = ${email} AND u.deleted_at IS NULL
		GROUP BY u.id
	` as UserDbRow[]
	const user = rows[0]
	return user ? mapDbUserToUser(user) : null
}

/**
 * List all users with provider identities
 */
export async function listUsers(): Promise<User[]> {
	const rows = await postgresDb`
		SELECT u.*, 
		       COALESCE(
		           json_agg(
		               json_build_object(
		                   'provider', p.name,
		                   'providerUserId', i.provider_user_id
		               )
		           ) FILTER (WHERE i.id IS NOT NULL),
		           '[]'::json
		       ) as provider_identities
		FROM users u
		LEFT JOIN identities i ON u.id = i.user_id AND i.deleted_at IS NULL
		LEFT JOIN providers p ON i.provider_id = p.id
		WHERE u.deleted_at IS NULL
		GROUP BY u.id
	` as UserDbRow[]
	return rows.map(mapDbUserToUser)
}

/**
 * Create a new user with optional provider identities
 * Uses PostgreSQL transaction for atomicity
 */
export async function createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<User> {
	// Use PostgreSQL transaction with reserved connection
	using transaction = await postgresDb.reserve()

	try {
		await transaction`BEGIN`

		// Create user with RETURNING clause (PostgreSQL feature)
		const result = await transaction`
			INSERT INTO users (uuid, email, name, avatar_url)
			VALUES (${data.uuid}, ${data.email}, ${data.name}, ${data.avatarUrl})
			RETURNING id
		` as Array<{ id: number }>

		const userId = result[0].id

		// If provider identities are provided, create them
		if (data.providerIdentities?.length) {
			for (const identity of data.providerIdentities) {
				const providerRows = await transaction`
					SELECT id FROM providers 
					WHERE name = ${identity.provider} AND deleted_at IS NULL
				` as Array<{ id: number }>
				
				if (providerRows.length > 0) {
					await transaction`
						INSERT INTO identities (uuid, user_id, provider_id, provider_user_id)
						VALUES (${Bun.randomUUIDv7()}, ${userId}, ${providerRows[0].id}, ${identity.providerUserId})
					`
				}
			}
		}

		await transaction`COMMIT`
		return getUserByEmail(data.email) as Promise<User>
	} catch (error) {
		await transaction`ROLLBACK`
		throw error
	}
}

/**
 * Update user by UUID with dynamic field updates
 */
export async function updateUserByUuid(uuid: string, data: Partial<Omit<User, 'id' | 'uuid' | 'createdAt' | 'updatedAt' | 'deletedAt'>>): Promise<User | null> {
	if (Object.keys(data).length === 0) { 
		return getUserByUuid(uuid)
	}

	// Build dynamic update using PostgreSQL object syntax
	const updateData: Record<string, unknown> = {}
	if (data.email !== undefined) {
		updateData.email = data.email
	}
	if (data.name !== undefined) {
		updateData.name = data.name
	}
	if (data.avatarUrl !== undefined) {
		updateData.avatar_url = data.avatarUrl
	}

	await postgresDb`
		UPDATE users 
		SET ${postgresDb(updateData)}, updated_at = CURRENT_TIMESTAMP
		WHERE uuid = ${uuid} AND deleted_at IS NULL
	`
	
	return getUserByUuid(uuid)
}

/**
 * Create or update user from OAuth provider data
 */
export async function upsertUserFromOAuth({ provider, providerUserId, email, name, avatarUrl }: { 
	provider: string, 
	providerUserId: string, 
	email: string, 
	name: string, 
	avatarUrl?: string 
}): Promise<User> {
	const user = await getUserByEmail(email)
	if (user) {
		await updateUserByUuid(user.uuid, { name, avatarUrl })
		return getUserByUuid(user.uuid) as Promise<User>
	}
	const uuid = Bun.randomUUIDv7()
	await createUser({ 
		uuid, 
		email, 
		name, 
		avatarUrl,
		providerIdentities: [{
			provider,
			providerUserId
		}]
	})
	return getUserByEmail(email) as Promise<User>
}

/**
 * Soft delete user by UUID
 */
export async function softDeleteUserByUuid(uuid: string): Promise<boolean> {
	const result = await postgresDb`
		UPDATE users 
		SET deleted_at = CURRENT_TIMESTAMP 
		WHERE uuid = ${uuid} AND deleted_at IS NULL
	`
	return result.count > 0
}

/**
 * Get user by internal ID with provider identities
 */
export async function getUserById(id: number): Promise<User | null> {
	const rows = await postgresDb`
		SELECT u.*, 
		       COALESCE(
		           json_agg(
		               json_build_object(
		                   'provider', p.name,
		                   'providerUserId', i.provider_user_id
		               )
		           ) FILTER (WHERE i.id IS NOT NULL),
		           '[]'::json
		       ) as provider_identities
		FROM users u
		LEFT JOIN identities i ON u.id = i.user_id AND i.deleted_at IS NULL
		LEFT JOIN providers p ON i.provider_id = p.id
		WHERE u.id = ${id} AND u.deleted_at IS NULL
		GROUP BY u.id
	` as UserDbRow[]
	const user = rows[0]
	return user ? mapDbUserToUser(user) : null
}

/**
 * Database row interface for user queries
 */
interface UserDbRow {
	id: number
	uuid: string
	email: string
	name: string
	avatar_url?: string
	created_at: Date
	updated_at: Date
	deleted_at?: Date
	provider_identities?: Array<{ provider: string; providerUserId: string }>
}

/**
 * Map database row to User object
 * Handles PostgreSQL JSON aggregation and UUID generation
 */
function mapDbUserToUser(row: UserDbRow): User {
	// Parse provider identities from PostgreSQL JSON aggregation
	let providerIdentities: { provider: string; providerUserId: string }[] = []
	if (row.provider_identities && Array.isArray(row.provider_identities)) {
		providerIdentities = row.provider_identities.filter((identity) => identity.provider)
	}

	return {
		id: row.id,
		uuid: row.uuid,
		email: row.email,
		name: row.name,
		avatarUrl: row.avatar_url,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at,
		providerIdentities
	}
}

/**
 * Removes the internal numeric id from a User object before sending to the frontend.
 */
export function toPublicUser(user: User): Omit<User, 'id'> {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { id: _id, ...publicUser } = user
	return publicUser
}

/**
 * Maps an array of User objects to their public representation.
 */
export function toPublicUserArray(users: User[]): Omit<User, 'id'>[] {
	return users.map(toPublicUser)
}
