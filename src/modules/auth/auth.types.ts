export interface GoogleUser {
	id: string
	email: string
	verified_email: boolean
	name: string
	given_name: string
	family_name: string
	picture?: string // Added picture as it's commonly available
	locale?: string
}

export interface JwtPayload {
	sub: string // Subject (user ID)
	email: string
	exp?: number // Expiration time (Unix timestamp)
	// Add any other claims you want in your JWT
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	[key: string]: any // Index signature for compatibility
}
