import { z } from 'zod'
import 'zod-openapi/extend'
import { UserSchema } from '../user.schema'

export const ApiKeyPublicSchema = z.object({
  uuid: z.string().uuid().openapi({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'API Key UUID' }),
  label: z.string().optional().openapi({ example: 'My App Key', description: 'Friendly label for the API key' }),
  description: z.string().optional().openapi({ example: 'Key for syncing with my app', description: 'Description of the API key usage' }),
  createdAt: z.date().openapi({ example: new Date(), description: 'API key creation timestamp' }),
  lastUsedAt: z.date().openapi({ example: new Date(), description: 'Last used timestamp' }),
  revokedAt: z.date().openapi({ nullable: true, example: new Date(), description: 'Revocation timestamp' }).optional(),
  deletedAt: z.date().openapi({ nullable: true, example: new Date(), description: 'Soft delete timestamp' }).optional()
}).openapi({ ref: 'ApiKey', description: 'User API key object (public)' })

/**
 * Schema for API key verification response
 * Returns the validity status and associated user information
 */
export const ApiKeyVerificationSchema = z.object({
  valid: z.boolean().openapi({ 
    example: true, 
    description: 'Whether the API key is valid and active' 
  }),
  user: UserSchema.openapi({ 
    description: 'User information associated with the API key' 
  }),
  apiKeyUuid: z.string().uuid().openapi({ 
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 
    description: 'UUID of the verified API key' 
  })
}).openapi({ 
  ref: 'ApiKeyVerification', 
  description: 'API key verification result with user information',
  example: {
    valid: true,
    user: {
      uuid: 'b3b3b3b3-b3b3-4b3b-b3b3-b3b3b3b3b3b3',
      email: 'user@example.com',
      name: 'John Doe',
      avatarUrl: 'https://example.com/avatar.png',
      createdAt: new Date(),
      updatedAt: new Date(),
      providerIdentities: [
        { provider: 'google', providerUserId: '1234567890' }
      ]
    },
    apiKeyUuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  }
}) 