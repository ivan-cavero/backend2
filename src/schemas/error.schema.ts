import { z } from 'zod'
import 'zod-openapi/extend'

export const ErrorDetailSchema = z.object({
  message: z.string().openapi({ example: 'Invalid authorization code.', description: 'Human-readable error message.' }),
  status: z.number().openapi({ example: 401 })
})

export const ErrorSchema = z
  .object({
    ok: z.boolean().openapi({ example: false }),
    error: ErrorDetailSchema
  })
  .openapi({ ref: 'ErrorResponse', description: 'Standard error response.' }) 