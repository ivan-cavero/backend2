/// <reference lib="webworker" />
export {}

import { updateDataEventStatus } from '@/modules/user/data-events/dataEvent.service'

interface ImportDataMessage {
  userUuid: string
  eventId: string
  fileKey: string
}

declare const self: DedicatedWorkerGlobalScope

self.onmessage = async (event: MessageEvent<ImportDataMessage>) => {
  const { userUuid, eventId, fileKey } = event.data
  const start = Date.now()

  await updateDataEventStatus(eventId, 'running', {
    started_at: new Date().toISOString().substring(0, 19).replace('T', ' ')
  })

  console.log(`[ImportDataWorker] Starting import for user ${userUuid} – fileKey: ${fileKey}`)

  try {
    // TODO: Implement: download from S3 using Bun.s3, stream unzip/parse and insert into ClickHouse
    // Placeholder implementation
    await new Promise((resolve) => setTimeout(resolve, 5000))

    const duration = Math.round((Date.now() - start) / 1000)
    await updateDataEventStatus(eventId, 'done', { duration_seconds: duration })

    console.log(`[ImportDataWorker] Finished import for user ${userUuid}`)
    self.postMessage({ status: 'done', eventId, durationSeconds: duration })
  } catch (err) {
    console.error('[ImportDataWorker] Error', err)
    await updateDataEventStatus(eventId, 'error', { error_msg: String(err) })
    self.postMessage({ status: 'error', eventId, error: String(err) })
  }
} 