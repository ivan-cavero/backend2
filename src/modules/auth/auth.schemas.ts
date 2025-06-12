import { z } from 'zod'
import { extendZodWithOpenApi } from 'zod-openapi'

extendZodWithOpenApi(z)

// Schema for the query parameters received in the Google OAuth callback.
export const GoogleCallbackQuerySchema = z.object({
	code: z.string().openapi({ example: '4/0Ad...' }),
	state: z.string().optional().openapi({ example: 'state_parameter_passthrough' })
})

// Generic error response schema.
export const ErrorSchema = z.object({
	error: z.string().openapi({ example: 'auth_failed' }),
	message: z.string().openapi({ example: 'Invalid authorization code.' })
})
