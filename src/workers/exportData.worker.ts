/// <reference lib="webworker" />
export {}

import { updateDataEventStatus } from '@/modules/user/data-events/dataEvent.service'

// This worker handles long-running data export tasks for a single user.
// It runs in a separate thread so the main Hono request can return immediately.

declare const self: DedicatedWorkerGlobalScope

interface ExportDataMessage {
  userUuid: string
  eventId: string
}

self.onmessage = async (event: MessageEvent<ExportDataMessage>) => {
  const { userUuid, eventId } = event.data
  const start = Date.now()

  await updateDataEventStatus(eventId, 'running', {
    started_at: new Date().toISOString().substring(0, 19).replace('T', ' ')
  })

  console.log(`[ExportDataWorker] Starting export for user ${userUuid}`)

  // TODO: Implement actual export logic -> generate archive and upload to S3
  await new Promise((resolve) => setTimeout(resolve, 5000))

  const duration = Math.round((Date.now() - start) / 1000)
  await updateDataEventStatus(eventId, 'done', { duration_seconds: duration })

  console.log(`[ExportDataWorker] Finished export for user ${userUuid}`)
  self.postMessage({ status: 'done', userUuid, eventId, durationSeconds: duration })
} 