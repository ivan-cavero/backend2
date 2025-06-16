/**
 * Types for server configuration
 */
export interface ServerConfig {
	readonly NODE_ENV: 'development' | 'production' | 'test'
	readonly PORT: number
	readonly BASE_URL: string
	readonly DEBUG_MODE: boolean;
	readonly ALLOWED_ORIGINS?: string;
	readonly GOOGLE_CLIENT_ID: string;
	readonly GOOGLE_CLIENT_SECRET: string;
	readonly JWT_SECRET: string;
	readonly FRONTEND_URL: string;

	// MySQL Configuration
	readonly MYSQL_HOST: string;
	readonly MYSQL_PORT: number;
	readonly MYSQL_USER: string;
	readonly MYSQL_PASSWORD: string;
	readonly MYSQL_DATABASE: string;

	// ClickHouse Configuration
	readonly CLICKHOUSE_HOST: string;
	readonly CLICKHOUSE_TCP_PORT: number;
	readonly CLICKHOUSE_HTTP_PORT: number;
	readonly CLICKHOUSE_USER: string;
	readonly CLICKHOUSE_PASSWORD: string;
	readonly CLICKHOUSE_DATABASE: string;
}

/**
 * Combined application configuration
 */
export interface AppConfig extends ServerConfig {}

/**
 * Environment variable types
 */
export type EnvVarType = 'string' | 'number' | 'boolean'

/**
 * Environment variable definition
 */
export interface EnvVarDefinition {
	readonly type: EnvVarType
	readonly required: boolean
	readonly default?: string | number | boolean
}

/**
 * Environment variable definitions map
 */
export type EnvVarDefinitions = {
	readonly [K in keyof AppConfig]?: EnvVarDefinition
} & {
	readonly [key: string]: EnvVarDefinition
}
