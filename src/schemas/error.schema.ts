import { z } from 'zod'
import 'zod-openapi/extend'

export const ErrorSchema = z
  .object({
    error: z.string().openapi({ example: 'auth_failed', description: 'Error code.' }),
    message: z.string().openapi({ example: 'Invalid authorization code.', description: 'Human-readable error message.' })
  })
  .openapi({ ref: 'ErrorResponse', description: 'Standard error response.' }) 