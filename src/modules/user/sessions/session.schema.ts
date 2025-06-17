import { z } from 'zod'
import 'zod-openapi/extend'

export const SessionPublicSchema = z.object({
  uuid: z.string().uuid().openapi({ example: 'b3b3b3b3-b3b3-4b3b-b3b3-b3b3b3b3b3b3', description: 'Session UUID' }),
  userAgent: z.string().nullable().optional().openapi({ example: 'Mozilla/5.0', description: 'User agent string' }),
  ipAddress: z.string().nullable().optional().openapi({ example: '192.168.1.1', description: 'IP address' }),
  createdAt: z.date().openapi({ example: new Date(), description: 'Session creation timestamp' }),
  expiresAt: z.date().openapi({ example: new Date(), description: 'Session expiration timestamp' }),
  revokedAt: z.date().nullable().optional().openapi({ example: null, description: 'Revocation timestamp' }),
  lastUsedAt: z.date().openapi({ example: new Date(), description: 'Last used timestamp' }),
  deletedAt: z.date().nullable().optional().openapi({ example: null, description: 'Soft delete timestamp' })
}).openapi({ ref: 'Session', description: 'User session object' }) 