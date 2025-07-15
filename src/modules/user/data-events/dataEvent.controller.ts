import type { Context } from 'hono'
import { HTTPException } from '@/middlewares/errorHandler'
import {
  createDataEvent,
  listDataEventsForUser,
  updateDataEventStatus
} from './dataEvent.service'
import type { DataEventStatus } from './dataEvent.types'

// Utility to spawn a Bun worker for export and detach
function spawnExportWorker(eventId: string, userUuid: string) {
  // Relative path: from data-events folder to src/workers
  const workerPath = new URL('../../../workers/exportData.worker.ts', import.meta.url).href
  const worker = new Worker(workerPath, { type: 'module' })
  worker.postMessage({ userUuid, eventId })

  worker.onmessage = async (evt) => {
    const { eventId: id, status, durationSeconds, error } = evt.data as {
      eventId?: string
      status?: DataEventStatus
      durationSeconds?: number
      error?: string
    }
    if (id && status) {
      const now = new Date().toISOString().substring(0, 19).replace('T', ' ')
      await updateDataEventStatus(id, status, {
        completed_at: now,
        duration_seconds: durationSeconds,
        error_msg: error
      })
    }
    worker.terminate()
  }
  worker.onerror = (err) => {
    console.error('[ExportWorker] error', err)
    worker.terminate()
  }
}

function spawnImportWorker(eventId: string, userUuid: string, fileKey: string) {
  const workerPath = new URL('../../../workers/importData.worker.ts', import.meta.url).href
  const worker = new Worker(workerPath, { type: 'module' })
  worker.postMessage({ userUuid, eventId, fileKey })

  worker.onmessage = async (evt) => {
    const { eventId: id, status, durationSeconds, error } = evt.data as {
      eventId?: string
      status?: DataEventStatus
      durationSeconds?: number
      error?: string
    }
    if (id && status) {
      const now = new Date().toISOString().substring(0, 19).replace('T', ' ')
      await updateDataEventStatus(id, status, {
        completed_at: now,
        duration_seconds: durationSeconds,
        error_msg: error
      })
    }
    worker.terminate()
  }
  worker.onerror = (err) => {
    console.error('[ImportWorker] error', err)
    worker.terminate()
  }
}

export const listUserDataEventsHandler = async (c: Context) => {
  const userUuid = c.req.param('uuid')

  // Query params: status=queued,running  limit=10
  const statusParam = c.req.query('status')
  const limitParam = c.req.query('limit')

  const statuses = statusParam ? (statusParam.split(',') as DataEventStatus[]) : undefined
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined

  const events = await listDataEventsForUser(userUuid, { statuses, limit })
  return c.json(events)
}

// Removed /me handler per new specification

export const exportDataHandler = async (c: Context) => {
  const userUuid = c.req.param('uuid')
  const event = await createDataEvent(userUuid, 'export', '')
  spawnExportWorker(event.id, userUuid)
  return c.json({ message: 'Export job queued', eventId: event.id }, 202)
}

export const importDataHandler = async (c: Context) => {
  const userUuid = c.req.param('uuid')
  const body = await c.req.json<{ fileKey: string }>()
  if (!body?.fileKey) {
    throw new HTTPException(400, { message: 'fileKey is required' })
  }

  const event = await createDataEvent(userUuid, 'import', body.fileKey)
  spawnImportWorker(event.id, userUuid, body.fileKey)

  return c.json({ message: 'Import job queued', eventId: event.id }, 202)
} 