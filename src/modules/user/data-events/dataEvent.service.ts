import { randomUUID } from 'node:crypto'
import { clickhouseClient } from '@/db/clickhouse'
import type { DataEvent, DataEventStatus, DataEventType } from './dataEvent.types'

// Insert a new event in ClickHouse – initial status queued
export const createDataEvent = async (
  userId: string,
  eventType: DataEventType,
  fileKey: string,
  status: DataEventStatus = 'queued'
): Promise<DataEvent> => {
  const id = randomUUID()
  const created_at = new Date().toISOString().substring(0, 19).replace('T', ' ')

  await clickhouseClient.insert({
    table: 'data_events',
    values: [
      {
        id,
        user_id: userId,
        event_type: eventType,
        status,
        file_key: fileKey,
        created_at
      }
    ],
    format: 'JSONEachRow'
  })

  return { id, user_id: userId, event_type: eventType, status, file_key: fileKey, created_at }
}

// Update status/progress of an existing event (also uses INSERT to leverage ReplacingMergeTree)
export const updateDataEventStatus = async (
  id: string,
  status: DataEventStatus,
  extra: Partial<Pick<DataEvent, 'started_at' | 'completed_at' | 'duration_seconds' | 'error_msg'>> = {}
): Promise<void> => {
  const row: Partial<DataEvent> & { id: string } = { id, status, ...extra }
  await clickhouseClient.insert({ table: 'data_events', values: [row], format: 'JSONEachRow' })
}

interface ListOptions {
  statuses?: DataEventStatus[]
  limit?: number
}

export const listDataEventsForUser = async (
  userId: string,
  { statuses, limit }: ListOptions = {}
): Promise<DataEvent[]> => {
  let query =
    'SELECT id, event_type, status, file_key, created_at, started_at, completed_at, duration_seconds, error_msg FROM data_events WHERE user_id = {userId:String}'

  if (statuses && statuses.length > 0) {
    const inClause = statuses.map((_, i) => `{status${i}:String}`).join(', ')
    query += ` AND status IN (${inClause})`
  }

  query += ' ORDER BY created_at DESC'

  if (limit && limit > 0) {
    query += ' LIMIT {limit:UInt64}'
  }

  const query_params: Record<string, unknown> = { userId }
  if (statuses) {
    statuses.forEach((s, i) => {
      query_params[`status${i}`] = s
    })
  }
  if (limit) {
    query_params['limit'] = limit
  }

  const resultSet = await clickhouseClient.query({ query, format: 'JSONEachRow', query_params })
  return (await resultSet.json()) as unknown as DataEvent[]
} 