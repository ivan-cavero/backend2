import type { Context } from 'hono'
import * as sessionService from './session.service'

export const listUserSessionsHandler = async (c: Context) => {
	const uuid = c.req.param('uuid')
	const sessions = await sessionService.getUserSessions(uuid)
	return c.json(sessions)
}

export const listUserActiveSessionsHandler = async (c: Context) => {
	const uuid = c.req.param('uuid')
	const sessions = await sessionService.getActiveUserSessions(uuid)
	return c.json(sessions)
}

export const getUserSessionByIdHandler = async (c: Context) => {
	const uuid = c.req.param('uuid')
	const sessionId = c.req.param('sessionId')
	const session = await sessionService.getUserSessionById(uuid, sessionId)
	if (!session) {
		return c.json({ ok: false, error: 'Session not found' }, 404)
	}
	return c.json(session)
}

export const revokeUserSessionHandler = async (c: Context) => {
	const uuid = c.req.param('uuid')
	const sessionId = c.req.param('sessionId')
	const ok = await sessionService.revokeUserSession(uuid, sessionId)
	if (!ok) {
		return c.json({ ok: false, error: 'Session not found or already revoked' }, 404)
	}
	return c.json({ ok: true })
}

export const revokeAllUserSessionsHandler = async (c: Context) => {
	const uuid = c.req.param('uuid')
	const count = await sessionService.revokeAllUserSessions(uuid)
	return c.json({ ok: true, revoked: count })
}
