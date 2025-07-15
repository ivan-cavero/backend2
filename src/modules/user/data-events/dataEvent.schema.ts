import { z } from 'zod'

export const DataEventSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  event_type: z.enum(['import', 'export']),
  status: z.enum(['queued', 'running', 'done', 'error']),
  file_key: z.string(),
  created_at: z.string(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  duration_seconds: z.number().nullable().optional(),
  error_msg: z.string().nullable().optional()
})

export const DataEventArraySchema = DataEventSchema.array() 