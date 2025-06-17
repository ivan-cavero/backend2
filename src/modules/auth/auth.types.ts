/**
 * Represents a user profile returned by Google OAuth.
 */
export interface GoogleUser {
	id: string // Google user ID
	email: string // User email
	verified_email: boolean // Whether the email is verified
	name: string // Full name
	given_name: string // First name
	family_name: string // Last name
	picture?: string // URL to profile picture
	locale?: string // User locale
}

/**
 * JWT payload for access tokens.
 */
export interface JwtPayload {
	sub: string // Subject (user UUID, not internal ID)
	email: string // User email
	exp?: number // Expiration time (Unix timestamp)
	iss?: string // Issuer
	iat?: number // Issued at
	// biome-ignore lint/suspicious/noExplicitAny: false positive
	[key: string]: any // Index signature for compatibility
}

/**
 * Represents a refresh token stored in the database.
 */
export interface RefreshToken {
	id?: number // Internal DB ID
	uuid: string // Public UUID for the refresh token
	userId: number // Internal user ID
	token: string // The refresh token string
	userAgent?: string // User agent string for the session
	ipAddress?: string // IP address for the session
	createdAt: Date // Creation timestamp
	expiresAt: Date // Expiration timestamp
	revokedAt?: Date // Revocation timestamp
	lastUsedAt?: Date // Last used timestamp
}

/**
 * Payload for creating a refresh token.
 */
export interface RefreshTokenPayload {
	userId: number // Internal user ID
	token: string // The refresh token string
}
