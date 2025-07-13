import { z } from 'zod'
import 'zod-openapi/extend'

export const SessionPublicSchema = z.object({
  uuid: z.string().uuid().openapi({ example: 'b3b3b3b3-b3b3-4b3b-b3b3-b3b3b3b3b3b3', description: 'Session UUID' }),
  userAgent: z.string().openapi({ example: 'Mozilla/5.0', description: 'User agent string', nullable: true }).optional(),
  ipAddress: z.string().openapi({ example: '192.168.1.1', description: 'IP address', nullable: true }).optional(),
  createdAt: z.date().openapi({ example: new Date(), description: 'Session creation timestamp' }),
  expiresAt: z.date().openapi({ example: new Date(), description: 'Session expiration timestamp' }),
  revokedAt: z.date().openapi({ example: new Date(), description: 'Revocation timestamp', nullable: true }).optional(),
  lastUsedAt: z.date().openapi({ example: new Date(), description: 'Last used timestamp' }),
  deletedAt: z.date().openapi({ example: new Date(), description: 'Soft delete timestamp', nullable: true }).optional()
}).openapi({ ref: 'Session', description: 'User session object' }) 