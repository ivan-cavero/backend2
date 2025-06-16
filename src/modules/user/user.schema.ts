import { z } from 'zod'
import 'zod-openapi/extend'

// ProviderIdentity schema
export const ProviderIdentitySchema = z.object({
  provider: z.string().openapi({
    example: 'google',
    description: 'The name of the authentication provider (e.g., google, github, email).'
  }),
  providerUserId: z.string().openapi({
    example: '1234567890',
    description: 'The unique user ID assigned by the provider.'
  })
}).openapi({
  ref: 'ProviderIdentity',
  description: 'Represents a user identity from an external authentication provider.'
})

// Internal schema with ID (not exposed in API)
const UserInternalSchema = z.object({
  id: z.number().int().describe('Internal numeric user ID (not exposed in API)'),
  uuid: z.string().uuid().describe('Public UUID for the user'),
  email: z.string().email().describe('User email address'),
  name: z.string().describe('Full name of the user'),
  avatarUrl: z.string().url().optional().describe('URL to the user avatar image'),
  createdAt: z.date().describe('User creation date'),
  updatedAt: z.date().describe('User last update date'),
  deletedAt: z.date().optional().describe('Soft delete timestamp'),
  providerIdentities: ProviderIdentitySchema.array().optional().describe('List of linked provider identities for this user')
})

// Public schema without internal ID (exposed in API)
export const UserSchema = UserInternalSchema.omit({ id: true }).openapi({
  ref: 'User',
  description: 'User object returned by the API. Contains all public user information and linked provider identities.',
  example: {
    uuid: 'b3b3b3b3-b3b3-4b3b-b3b3-b3b3b3b3b3b3',
    email: 'user@example.com',
    name: 'John Doe',
    avatarUrl: 'https://example.com/avatar.png',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
    providerIdentities: [
      { provider: 'google', providerUserId: '1234567890' }
    ]
  }
})

export const UserCreateSchema = z.object({
  uuid: z.string().uuid().openapi({ example: 'b3b3b3b3-b3b3-4b3b-b3b3-b3b3b3b3b3b3', description: 'Public UUID for the user' }),
  email: z.string().email().openapi({ example: 'user@example.com', description: 'User email address' }),
  name: z.string().openapi({ example: 'John Doe', description: 'Full name of the user' }),
  avatarUrl: z.string().url().optional().openapi({ example: 'https://example.com/avatar.png', description: 'URL to the user avatar image' }),
  providerIdentities: ProviderIdentitySchema.array().optional().openapi({ description: 'List of linked provider identities for this user' })
}).openapi({ ref: 'UserCreate', description: 'User creation input. Used when registering a new user.' })

export const UserUpdateSchema = z.object({
  email: z.string().email().optional().openapi({ example: 'user@example.com', description: 'User email address' }),
  name: z.string().optional().openapi({ example: 'John Doe', description: 'Full name of the user' }),
  avatarUrl: z.string().url().optional().openapi({ example: 'https://example.com/avatar.png', description: 'URL to the user avatar image' })
}).openapi({ ref: 'UserUpdate', description: 'User update input. Used when updating user profile information.' }) 