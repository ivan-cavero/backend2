import type { Context } from 'hono'
import { HTTPException } from '@/middlewares/errorHandler'
import * as userService from './user.service'

export const getUserByIdHandler = async (c: Context) => {
	const uuid = c.req.param('uuid')
	if (!uuid) { throw new HTTPException(400, { message: 'Missing user UUID' }) }
	const user = await userService.getUserByUuid(uuid)
	if (!user) { throw new HTTPException(404, { message: 'User not found' }) }
	return c.json(user)
}

export const listUsersHandler = async (c: Context) => {
	const users = await userService.listUsers()
	return c.json(users)
}

export const createUserHandler = async (c: Context) => {
	const body = await c.req.json()
	// Assume validation is done by middleware
	const user = await userService.createUser(body)
	return c.json(user, 201)
}

export const updateUserHandler = async (c: Context) => {
	const uuid = c.req.param('uuid')
	if (!uuid) { throw new HTTPException(400, { message: 'Missing user UUID' }) }
	const body = await c.req.json()
	const user = await userService.updateUserByUuid(uuid, body)
	if (!user) { throw new HTTPException(404, { message: 'User not found' }) }
	return c.json(user)
}

export const softDeleteUserHandler = async (c: Context) => {
	const uuid = c.req.param('uuid')
	if (!uuid) { throw new HTTPException(400, { message: 'Missing user UUID' }) }
	const ok = await userService.softDeleteUserByUuid(uuid)
	if (!ok) { throw new HTTPException(404, { message: 'User not found or already deleted' }) }
	return c.json({ ok: true })
}
