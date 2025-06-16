import { z } from 'zod'
import 'zod-openapi/extend'

// Internal schema with ID (not exposed in API)
const UserInternalSchema = z.object({
  id: z.number().int(),
  uuid: z.string().uuid(),
  googleId: z.string().optional(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().url().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional()
})

// Public schema without internal ID (exposed in API)
export const UserSchema = UserInternalSchema.omit({ id: true }).openapi({
  ref: 'User',
  description: 'User object',
  example: {
    uuid: 'b3b3b3b3-b3b3-4b3b-b3b3-b3b3b3b3b3b3',
    googleId: '1234567890',
    email: 'user@example.com',
    name: 'John Doe',
    avatarUrl: 'https://example.com/avatar.png',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined
  }
})

export const UserCreateSchema = z.object({
  uuid: z.string().uuid().openapi({ example: 'b3b3b3b3-b3b3-4b3b-b3b3-b3b3b3b3b3b3' }),
  email: z.string().email().openapi({ example: 'user@example.com' }),
  name: z.string().openapi({ example: 'John Doe' }),
  avatarUrl: z.string().url().optional().openapi({ example: 'https://example.com/avatar.png' })
}).openapi({ ref: 'UserCreate', description: 'User creation input' })

export const UserUpdateSchema = z.object({
  email: z.string().email().optional().openapi({ example: 'user@example.com' }),
  name: z.string().optional().openapi({ example: 'John Doe' }),
  avatarUrl: z.string().url().optional().openapi({ example: 'https://example.com/avatar.png' })
}).openapi({ ref: 'UserUpdate', description: 'User update input' }) 