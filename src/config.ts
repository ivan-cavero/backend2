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
	// Server Configuration
	NODE_ENV: getEnv('NODE_ENV', 'development') as 'development' | 'production' | 'test',
	PORT: getEnvNumber('PORT', 3000),
	BASE_URL: getEnv('BASE_URL', 'http://localhost') as string,
	DEBUG_MODE: getEnvBoolean('DEBUG_MODE', process.env.NODE_ENV === 'development'),
	ALLOWED_ORIGINS: getEnv('ALLOWED_ORIGINS'),
	GOOGLE_CLIENT_ID: getEnv('GOOGLE_CLIENT_ID', '') as string,
	GOOGLE_CLIENT_SECRET: getEnv('GOOGLE_CLIENT_SECRET', '') as string,
	JWT_SECRET: getEnv('JWT_SECRET', 'default-secret-key-for-dev') as string,
	FRONTEND_URL: getEnv('FRONTEND_URL', 'http://localhost:5173') as string,

	// PostgreSQL Configuration
	POSTGRES_HOST: getEnv('POSTGRES_HOST', 'localhost') as string,
	POSTGRES_PORT: getEnvNumber('POSTGRES_PORT', 5432),
	POSTGRES_USER: getEnv('POSTGRES_USER', 'postgres') as string,
	POSTGRES_PASSWORD: getEnv('POSTGRES_PASSWORD', '') as string,
	POSTGRES_DATABASE: getEnv('POSTGRES_DATABASE', 'timefly') as string,

	// ClickHouse Configuration
	CLICKHOUSE_HOST: getEnv('CLICKHOUSE_HOST', 'http://localhost') as string,
	CLICKHOUSE_TCP_PORT: getEnvNumber('CLICKHOUSE_TCP_PORT', 9000),
	CLICKHOUSE_HTTP_PORT: getEnvNumber('CLICKHOUSE_HTTP_PORT', 8123),
	CLICKHOUSE_USER: getEnv('CLICKHOUSE_USER', 'default') as string,
	CLICKHOUSE_PASSWORD: getEnv('CLICKHOUSE_PASSWORD', '') as string,
	CLICKHOUSE_DATABASE: getEnv('CLICKHOUSE_DATABASE', 'default') as string
}
