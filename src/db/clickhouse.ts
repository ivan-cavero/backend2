import { createClient } from '@clickhouse/client'
import { CONFIG } from '@/config'

export const clickhouseClient = createClient({
	url: `${CONFIG.CLICKHOUSE_HOST}:${CONFIG.CLICKHOUSE_HTTP_PORT}`,
	username: CONFIG.CLICKHOUSE_USER,
	password: CONFIG.CLICKHOUSE_PASSWORD,
	database: CONFIG.CLICKHOUSE_DATABASE
})
