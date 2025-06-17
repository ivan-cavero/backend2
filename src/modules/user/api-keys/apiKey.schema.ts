import { z } from 'zod'
import 'zod-openapi/extend'

export const ApiKeyPublicSchema = z.object({
  uuid: z.string().uuid().openapi({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'API Key UUID' }),
  label: z.string().optional().openapi({ example: 'My App Key', description: 'Friendly label for the API key' }),
  description: z.string().optional().openapi({ example: 'Key for syncing with my app', description: 'Description of the API key usage' }),
  createdAt: z.date().openapi({ example: new Date(), description: 'API key creation timestamp' }),
  lastUsedAt: z.date().openapi({ example: new Date(), description: 'Last used timestamp' }),
  revokedAt: z.date().nullable().optional().openapi({ example: null, description: 'Revocation timestamp' }),
  deletedAt: z.date().nullable().optional().openapi({ example: null, description: 'Soft delete timestamp' })
}).openapi({ ref: 'ApiKey', description: 'User API key object (public)' }) 