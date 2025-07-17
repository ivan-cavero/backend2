import type { Context } from 'hono'
import { HTTPException } from '@/middlewares/errorHandler'
import * as syncService from './sync.service'
import type { SyncRequestInput } from './sync.schemas'
import * as userService from '@/modules/user/user.service'
import { logger } from '@/utils/logger'

/**
 * POST /sync – event ingestion endpoint.
 */
export const syncEventsHandler = async (c: Context) => {
  const userUuid = c.get('userUuid' as unknown as keyof typeof c.var)
  if (!userUuid) { throw new HTTPException(401, { message: 'Authentication required.' }) }

  const body: SyncRequestInput = await c.req.json()
  const { events } = body

  const result = await syncService.syncEvents(userUuid, events)
  return c.json(result, 200)
}

/**
 * GET /sync/health – simple health-check.
 */
export const syncHealthCheckHandler = async (c: Context) => {
  try {
    await syncService.testClickHouseConnection()
    return c.json({ status: 'healthy', service: 'events-sync', clickhouse: 'connected', timestamp: new Date().toISOString() })
  } catch (err) {
    logger.error('Sync health-check failed', err)
    return c.json({ status: 'unhealthy', service: 'events-sync', clickhouse: 'disconnected', timestamp: new Date().toISOString() }, 503)
  }
}

/**
 * GET /sync/me – verify auth & basic info.
 */
export const syncMeHandler = async (c: Context) => {
  const userUuid = c.get('userUuid' as unknown as keyof typeof c.var)
  if (!userUuid) { throw new HTTPException(401, { message: 'Authentication required.' }) }

  const user = await userService.getUserByUuid(userUuid)
  if (!user) { throw new HTTPException(404, { message: 'User not found' }) }

  return c.json({
    user: { uuid: user.uuid, email: user.email, name: user.name },
    service_status: { authenticated: true, sync_service: 'healthy', clickhouse: 'connected', timestamp: new Date().toISOString() },
  })
} 