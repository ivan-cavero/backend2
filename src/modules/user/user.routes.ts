import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { zValidator } from '@hono/zod-validator'
import { resolver } from 'hono-openapi/zod'
import {
  getUserByIdHandler,
  listUsersHandler,
  createUserHandler,
  updateUserHandler,
  softDeleteUserHandler
} from './user.controller'
import { UserSchema, UserCreateSchema, UserUpdateSchema } from './user.schema'
import { ErrorSchema } from '@/schemas/error.schema'
import { authMiddleware } from '@/middlewares/auth.middleware'
import * as userService from './user.service'

const userRoutes = new Hono()

// Apply authentication middleware to all user routes
userRoutes.use('*', authMiddleware)

userRoutes.get(
  '/me',
  describeRoute({
    tags: ['User'],
    summary: 'Get current authenticated user',
    responses: {
      200: { description: 'Authenticated user', content: { 'application/json': { schema: resolver(UserSchema) } } },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
    }
  }),
  async (c) => {
    // userUuid is set by the authMiddleware
    // Type workaround for Hono context variable
    const uuid = c.get('userUuid' as unknown as keyof typeof c.var)
    if (!uuid) { return c.json({ ok: false, error: { message: 'Unauthorized', status: 401 } }, 401) }
    const user = await userService.getUserByUuid(uuid)
    if (!user) { return c.json({ ok: false, error: { message: 'User not found', status: 404 } }, 404) }
    return c.json(userService.toPublicUser(user))
  }
)

userRoutes.get(
  '/',
  describeRoute({
    tags: ['User'],
    summary: 'List all users',
    responses: {
      200: { description: 'List of users', content: { 'application/json': { schema: resolver(UserSchema.array()) } } },
      500: { description: 'Server error', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
    }
  }),
  listUsersHandler
)

userRoutes.get(
  '/:uuid',
  describeRoute({
    tags: ['User'],
    summary: 'Get user by UUID',
    parameters: [
      { in: 'path', name: 'uuid', required: true, schema: { type: 'string', format: 'uuid', example: 'b3b3b3b3-b3b3-4b3b-b3b3-b3b3b3b3b3b3' }, description: 'User UUID' }
    ],
    responses: {
      200: { description: 'User found', content: { 'application/json': { schema: resolver(UserSchema) } } },
      404: { description: 'User not found', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
    }
  }),
  getUserByIdHandler
)

userRoutes.post(
  '/',
  describeRoute({
    tags: ['User'],
    summary: 'Create a new user',
    requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UserCreate' } } } },
    responses: {
      201: { description: 'User created', content: { 'application/json': { schema: resolver(UserSchema) } } },
      400: { description: 'Invalid input', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
    }
  }),
  zValidator('json', UserCreateSchema),
  createUserHandler
)

userRoutes.put(
  '/:uuid',
  describeRoute({
    tags: ['User'],
    summary: 'Update user by UUID',
    parameters: [
      { in: 'path', name: 'uuid', required: true, schema: { type: 'string', format: 'uuid', example: 'b3b3b3b3-b3b3-4b3b-b3b3-b3b3b3b3b3b3' }, description: 'User UUID' }
    ],
    requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UserUpdate' } } } },
    responses: {
      200: { description: 'User updated', content: { 'application/json': { schema: resolver(UserSchema) } } },
      400: { description: 'Invalid input', content: { 'application/json': { schema: resolver(ErrorSchema) } } },
      404: { description: 'User not found', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
    }
  }),
  zValidator('json', UserUpdateSchema),
  updateUserHandler
)

userRoutes.delete(
  '/:uuid',
  describeRoute({
    tags: ['User'],
    summary: 'Soft delete user by UUID',
    parameters: [
      { in: 'path', name: 'uuid', required: true, schema: { type: 'string', format: 'uuid', example: 'b3b3b3b3-b3b3-4b3b-b3b3-b3b3b3b3b3b3' }, description: 'User UUID' }
    ],
    responses: {
      200: { description: 'User soft deleted', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true } } } } } },
      404: { description: 'User not found', content: { 'application/json': { schema: resolver(ErrorSchema) } } }
    }
  }),
  softDeleteUserHandler
)

export default userRoutes 