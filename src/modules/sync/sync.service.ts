import { clickhouseClient } from '@/db/clickhouse'
import { logger } from '@/utils/logger'
import type { EventPayload, StoredEvent, SyncResponse } from './sync.types'

/**
 * Persist IDE events into ClickHouse.
 */
export async function syncEvents(userId: string, events: EventPayload[]): Promise<SyncResponse> {
  logger.info(`Syncing ${events.length} events for user ${userId}`)

  if (events.length === 0) {
    return { success: true, processed_count: 0, synced_at: new Date().toISOString() }
  }

  const rows: StoredEvent[] = events.map(e => ({ ...e, user_id: userId }))

  await clickhouseClient.insert({
    table: 'events',
    values: rows,
    format: 'JSONEachRow',
    clickhouse_settings: { async_insert: 1, wait_for_async_insert: 1 },
  })

  return { success: true, processed_count: rows.length, synced_at: new Date().toISOString() }
}

/** Health-check helper. */
export async function testClickHouseConnection(): Promise<void> {
  await clickhouseClient.query({ query: 'SELECT 1' })
}

 