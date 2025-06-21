import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver } from 'hono-openapi/zod'
import { SessionPublicSchema } from './session.schema'
import {
	getUserSessionByIdHandler,
	listUserActiveSessionsHandler,
	
	listUserSessionsHandler,
	revokeAllUserSessionsHandler, 
	revokeUserSessionHandler
} from './session.controller'
import { ErrorSchema } from '@/schemas/error.schema'

const sessionRoutes = new Hono()

sessionRoutes.get(
	'/',
	describeRoute({
		tags: ['User Sessions'],
		summary: 'List all sessions for a user',
		responses: {
			200: { description: 'List of sessions', content: { 'application/json': { schema: resolver(SessionPublicSchema.array()) } } },
			401: { description: 'Unauthorized', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
		}
	}),
	listUserSessionsHandler
)

sessionRoutes.get(
	'/active',
	describeRoute({
		tags: ['User Sessions'],
		summary: 'List active sessions for a user',
		responses: {
			200: { description: 'List of active sessions', content: { 'application/json': { schema: resolver(SessionPublicSchema.array()) } } },
			401: { description: 'Unauthorized', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
		}
	}),
	listUserActiveSessionsHandler
)



sessionRoutes.get(
	'/:sessionId',
	describeRoute({
		tags: ['User Sessions'],
		summary: 'Get details of a session',
		parameters: [
			{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Session UUID' }
		],
		responses: {
			200: { description: 'Session details', content: { 'application/json': { schema: resolver(SessionPublicSchema) } } },
			404: { description: 'Session not found', content: { 'application/json': { schema: resolver(ErrorSchema) } } },
			401: { description: 'Unauthorized', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
		}
	}),
	getUserSessionByIdHandler
)

sessionRoutes.delete(
	'/:sessionId',
	describeRoute({
		tags: ['User Sessions'],
		summary: 'Revoke a specific session',
		parameters: [
			{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Session UUID' }
		],
		responses: {
			200: { description: 'Session revoked', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true } } } } } },
			404: { description: 'Session not found or already revoked', content: { 'application/json': { schema: resolver(ErrorSchema) } } },
			401: { description: 'Unauthorized', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
		}
	}),
	revokeUserSessionHandler
)

sessionRoutes.delete(
	'/',
	describeRoute({
		tags: ['User Sessions'],
		summary: 'Revoke all sessions for a user',
		responses: {
			200: { description: 'All sessions revoked', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true }, revoked: { type: 'number', example: 3 } } } } } },
			401: { description: 'Unauthorized', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
		}
	}),
	revokeAllUserSessionsHandler
)

export default sessionRoutes
