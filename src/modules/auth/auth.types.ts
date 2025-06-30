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
	hd?: string
}

/**
 * JWT payload structure for access tokens
 */
export interface JwtPayload {
	/** Subject (user UUID, public identifier) */
	sub: string
	/** User email address */
	email: string
	/** Issuer of the token */
	iss?: string
	/** Token issued at timestamp */
	iat: number
	/** Token expires at timestamp */
	exp: number
	/** Allow additional string properties for Hono JWT compatibility */
	[key: string]: string | number | undefined
}

/**
 * Represents a refresh token stored in the database.
 */
export interface RefreshToken {
	id: number
	uuid: string
	userId: number
	token: string
	userAgent?: string
	ipAddress?: string
	createdAt: Date
	expiresAt: Date
	revokedAt?: Date
	lastUsedAt?: Date
	deletedAt?: Date
}

/**
 * Refresh token JWT payload (for encoding in token)
 */
export interface RefreshTokenPayload {
	/** User UUID (public identifier) */
	userUuid: string
	/** Internal user ID (for database queries) */
	userId: number
	/** Token issued at timestamp */
	iat: number
	/** Token expires at timestamp */
	exp: number
}

/**
 * Database row interface for refresh token queries
 */
export interface RefreshTokenDbRow {
	id: number
	uuid: string
	user_id: number
	token: string
	user_agent?: string
	ip_address?: string
	created_at: Date
	expires_at: Date
	revoked_at?: Date
	last_used_at?: Date
	deleted_at?: Date
}
