import { mysqlPool } from '@/db/mysql'
import type { User } from './user.types'
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise'

export async function getUserByUuid(uuid: string): Promise<User | null> {
	const [rows] = await mysqlPool.query<RowDataPacket[]>('SELECT * FROM users WHERE uuid = ? AND deleted_at IS NULL', [uuid])
	const user = rows[0]
	return user ? mapDbUserToUser(user) : null
}

export async function getUserByEmail(email: string): Promise<User | null> {
	const [rows] = await mysqlPool.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL', [email])
	const user = rows[0]
	return user ? mapDbUserToUser(user) : null
}

export async function listUsers(): Promise<User[]> {
	const [rows] = await mysqlPool.query<RowDataPacket[]>('SELECT * FROM users WHERE deleted_at IS NULL')
	return rows.map(mapDbUserToUser)
}

export async function createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<User> {
	await mysqlPool.query<ResultSetHeader>(
		'INSERT INTO users (uuid, email, name, avatar_url) VALUES (?, ?, ?, ?)',
		[data.uuid, data.email, data.name, data.avatarUrl]
	)
	return getUserByEmail(data.email) as Promise<User>
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

export async function upsertUserFromOAuth({ email, name, avatarUrl }: { googleId: string, email: string, name: string, avatarUrl?: string }): Promise<User> {
	const user = await getUserByEmail(email)
	if (user) {
		await updateUserByUuid(user.uuid, { name, avatarUrl })
		return getUserByUuid(user.uuid) as Promise<User>
	}
	const uuid = Bun.randomUUIDv7()
	await createUser({ uuid, email, name, avatarUrl })
	return getUserByEmail(email) as Promise<User>
}

function mapDbUserToUser(row: RowDataPacket): User {
	return {
		uuid: row.uuid,
		googleId: row.google_id,
		email: row.email,
		name: row.name,
		avatarUrl: row.avatar_url,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at || undefined
	}
}
