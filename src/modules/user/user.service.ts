import { mysqlPool } from '@/db/mysql'
import type { User, ProviderIdentity } from './user.types'
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise'

export async function getUserByUuid(uuid: string): Promise<User | null> {
	const [rows] = await mysqlPool.query<RowDataPacket[]>(`
		SELECT u.*, 
		       GROUP_CONCAT(
		           JSON_OBJECT(
		               'provider', p.name,
		               'providerUserId', i.provider_user_id
		           )
		       ) as provider_identities
		FROM users u
		LEFT JOIN identities i ON u.id = i.user_id AND i.deleted_at IS NULL
		LEFT JOIN providers p ON i.provider_id = p.id
		WHERE u.uuid = ? AND u.deleted_at IS NULL
		GROUP BY u.id
	`, [uuid])
	const user = rows[0]
	return user ? mapDbUserToUser(user) : null
}

export async function getUserByEmail(email: string): Promise<User | null> {
	const [rows] = await mysqlPool.query<RowDataPacket[]>(`
		SELECT u.*, 
		       GROUP_CONCAT(
		           JSON_OBJECT(
		               'provider', p.name,
		               'providerUserId', i.provider_user_id
		           )
		       ) as provider_identities
		FROM users u
		LEFT JOIN identities i ON u.id = i.user_id AND i.deleted_at IS NULL
		LEFT JOIN providers p ON i.provider_id = p.id
		WHERE u.email = ? AND u.deleted_at IS NULL
		GROUP BY u.id
	`, [email])
	const user = rows[0]
	return user ? mapDbUserToUser(user) : null
}

export async function listUsers(): Promise<User[]> {
	const [rows] = await mysqlPool.query<RowDataPacket[]>(`
		SELECT u.*, 
		       GROUP_CONCAT(
		           JSON_OBJECT(
		               'provider', p.name,
		               'providerUserId', i.provider_user_id
		           )
		       ) as provider_identities
		FROM users u
		LEFT JOIN identities i ON u.id = i.user_id AND i.deleted_at IS NULL
		LEFT JOIN providers p ON i.provider_id = p.id
		WHERE u.deleted_at IS NULL
		GROUP BY u.id
	`)
	return rows.map(mapDbUserToUser)
}

export async function createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<User> {
	const connection = await mysqlPool.getConnection()
	try {
		await connection.beginTransaction()

		// Create user
		const [result] = await connection.query<ResultSetHeader>(
			'INSERT INTO users (uuid, email, name, avatar_url) VALUES (?, ?, ?, ?)',
			[data.uuid, data.email, data.name, data.avatarUrl]
		)

		// If provider identities are provided, create them
		if (data.providerIdentities?.length) {
			for (const identity of data.providerIdentities) {
				const [providerResult] = await connection.query<RowDataPacket[]>(
					'SELECT id FROM providers WHERE name = ? AND deleted_at IS NULL',
					[identity.provider]
				)
				if (providerResult.length > 0) {
					await connection.query(
						'INSERT INTO identities (uuid, user_id, provider_id, provider_user_id) VALUES (?, ?, ?, ?)',
						[Bun.randomUUIDv7(), result.insertId, providerResult[0].id, identity.providerUserId]
					)
				}
			}
		}

		await connection.commit()
		return getUserByEmail(data.email) as Promise<User>
	} catch (error) {
		await connection.rollback()
		throw error
	} finally {
		connection.release()
	}
}

export async function updateUserByUuid(uuid: string, data: Partial<Omit<User, 'id' | 'uuid' | 'createdAt' | 'updatedAt' | 'deletedAt'>>): Promise<User | null> {
	const fields = []
	const values = []
	if (data.email) { fields.push('email = ?'); values.push(data.email) }
	if (data.name) { fields.push('name = ?'); values.push(data.name) }
	if (data.avatarUrl) { fields.push('avatar_url = ?'); values.push(data.avatarUrl) }
	if (fields.length === 0) { return getUserByUuid(uuid) }
	values.push(uuid)
	await mysqlPool.query<ResultSetHeader>(
		`UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE uuid = ? AND deleted_at IS NULL`,
		values
	)
	return getUserByUuid(uuid)
}

export async function softDeleteUserByUuid(uuid: string): Promise<boolean> {
	const [result] = await mysqlPool.query<ResultSetHeader>(
		'UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE uuid = ? AND deleted_at IS NULL',
		[uuid]
	)
	return result.affectedRows > 0
}

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

export async function getUserById(id: number): Promise<User | null> {
	const [rows] = await mysqlPool.query<RowDataPacket[]>(`
		SELECT u.*, 
		       GROUP_CONCAT(
		           JSON_OBJECT(
		               'provider', p.name,
		               'providerUserId', i.provider_user_id
		           )
		       ) as provider_identities
		FROM users u
		LEFT JOIN identities i ON u.id = i.user_id AND i.deleted_at IS NULL
		LEFT JOIN providers p ON i.provider_id = p.id
		WHERE u.id = ? AND u.deleted_at IS NULL
		GROUP BY u.id
	`, [id])
	const user = rows[0]
	return user ? mapDbUserToUser(user) : null
}

function mapDbUserToUser(row: RowDataPacket): User {
	const providerIdentities = row.provider_identities 
		? JSON.parse(`[${row.provider_identities}]`)
		: undefined

	return {
		id: row.id,
		uuid: row.uuid,
		email: row.email,
		name: row.name,
		avatarUrl: row.avatar_url,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at || undefined,
		providerIdentities
	}
}

/**
 * Removes the internal numeric id from a User object before sending to the frontend.
 */
export function toPublicUser(user: User): Omit<User, 'id'> {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { id, ...publicUser } = user
	return publicUser
}

/**
 * Maps an array of User objects to their public representation.
 */
export function toPublicUserArray(users: User[]): Omit<User, 'id'>[] {
	return users.map(toPublicUser)
}
