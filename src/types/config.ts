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

	// PostgreSQL Configuration
	readonly POSTGRES_HOST: string;
	readonly POSTGRES_PORT: number;
	readonly POSTGRES_USER: string;
	readonly POSTGRES_PASSWORD: string;
	readonly POSTGRES_DATABASE: string;

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
