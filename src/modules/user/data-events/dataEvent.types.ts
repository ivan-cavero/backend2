export type DataEventStatus = 'queued' | 'running' | 'done' | 'error'
export type DataEventType = 'import' | 'export'

export interface DataEvent {
  id: string
  user_id: string
  event_type: DataEventType
  status: DataEventStatus
  file_key: string
  created_at: string
  started_at?: string | null
  completed_at?: string | null
  duration_seconds?: number | null
  error_msg?: string | null
} 