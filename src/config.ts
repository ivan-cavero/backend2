import type { AppConfig } from '@/types/config'

// Helper to get environment variables with defaults and type casting
const getEnv = (key: string, defaultValue?: string): string | undefined => {
	return process.env[key] ?? defaultValue
}

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
	const value = process.env[key]
	if (value === undefined) {
		// Use block statement
		return defaultValue
	}
	return value === 'true'
}

const getEnvNumber = (key: string, defaultValue: number): number => {
	const value = process.env[key]
	if (value === undefined) {
		return defaultValue
	}
	const num = Number.parseInt(value, 10)
	return Number.isNaN(num) ? defaultValue : num
}

/**
 * Application configuration
 */
export const CONFIG: AppConfig = {
	NODE_ENV: getEnv('NODE_ENV', 'development') as 'development' | 'production' | 'test',
	PORT: getEnvNumber('PORT', 3000),
	BASE_URL: getEnv('BASE_URL', 'http://localhost') as string,
	DEBUG_MODE: getEnvBoolean('DEBUG_MODE', process.env.NODE_ENV === 'development'),
	ALLOWED_ORIGINS: getEnv('ALLOWED_ORIGINS'),
	GOOGLE_CLIENT_ID: getEnv('GOOGLE_CLIENT_ID', '') as string,
	GOOGLE_CLIENT_SECRET: getEnv('GOOGLE_CLIENT_SECRET', '') as string,
	JWT_SECRET: getEnv('JWT_SECRET', 'default-secret-key-for-dev') as string,
	FRONTEND_URL: getEnv('FRONTEND_URL', 'http://localhost:5173') as string // Will be undefined if not set, handled in index.ts
}
