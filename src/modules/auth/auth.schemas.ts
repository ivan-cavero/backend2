import { z } from 'zod'
import 'zod-openapi/extend'

// Schema for the query parameters received in the Google OAuth callback.
export const GoogleCallbackQuerySchema = z
	.object({
		code: z.string().openapi({
			example: '4/0Ad...',
			description: 'Authorization code returned by Google after user consent.'
		}),
		state: z.string().optional().openapi({
			example: 'state_parameter_passthrough',
			description: 'Optional state for CSRF protection, passed through the OAuth flow.'
		})
	})
	.openapi({ ref: 'GoogleCallbackQuery', description: 'Query parameters for Google OAuth2 callback.' })
