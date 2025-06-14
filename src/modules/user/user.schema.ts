import { z } from 'zod'
import 'zod-openapi/extend'

export const UserSchema = z.object({
  id: z.number().int().openapi({ example: 1, description: 'Internal user ID' }),
  uuid: z.string().uuid().openapi({ example: 'b3b3b3b3-b3b3-4b3b-b3b3-b3b3b3b3b3b3', description: 'User UUID' }),
  googleId: z.string().optional().openapi({ example: '1234567890', description: 'Google user ID' }),
  email: z.string().email().openapi({ example: 'user@example.com', description: 'User email' }),
  name: z.string().openapi({ example: 'John Doe', description: 'User name' }),
  avatarUrl: z.string().url().optional().openapi({ example: 'https://example.com/avatar.png', description: 'Avatar URL' }),
  createdAt: z.date().openapi({ example: new Date().toISOString(), description: 'Creation timestamp' }),
  updatedAt: z.date().openapi({ example: new Date().toISOString(), description: 'Update timestamp' }),
  deletedAt: z.date().optional().openapi({ example: undefined, description: 'Soft delete timestamp' })
}).openapi({ ref: 'User', description: 'User object' })

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