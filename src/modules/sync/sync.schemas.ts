import { z } from 'zod';
import 'zod-openapi/extend';

// ------------------------------------------------------------------
// Event-based sync – Zod schemas (v3)
// ------------------------------------------------------------------

// Arbitrary metadata object (string → any).
export const MetadataSchema = z.record(z.any()).openapi({
  description: 'Arbitrary key/value metadata associated with an event',
  example: {
    machine_id: '27dd7982f178e4e1346e58ecc4680f2b92bc893d918448898bd11602375fa9b4',
    hostname: 'DESKTOP-B3M3ACL',
    ide_version: '1.99.3',
    os_arch: 'x64',
  },
});

// Activity inside an event.
export const ActivitySchema = z.object({
  name: z.string().min(1).max(50).openapi({
    description: 'Activity name',
    example: 'reading',
  }),
  duration_ms: z.number().int().positive().openapi({
    description: 'Duration of the activity in milliseconds',
    example: 5441,
  }),
  properties: z.record(z.any()).optional().openapi({
    description: 'Optional activity-specific properties',
  }),
});

// Core event schema.
export const EventSchema = z.object({
  event_id: z.string().uuid().openapi({ description: 'Unique event identifier' }),
  user_id: z.string().uuid().openapi({ description: 'User identifier (UUID)' }),
  project_id: z.string().min(1).max(255).openapi({ description: 'Project/workspace identifier' }),
  event_time: z.string().datetime().openapi({ description: 'Timestamp when the event occurred (ISO-8601)' }),
  metadata: MetadataSchema,
  activities: z.array(ActivitySchema).min(1).max(50).openapi({ description: 'List of granular activities' }),
});

// Wrapper for sync endpoint validation.
export const SyncValidationSchema = z.object({
  events: z.array(EventSchema).min(1).max(1000).openapi({
    description: 'Events to synchronise (max 1000 per request)',
  }),
}).openapi({
  description: 'Request body for /sync endpoint (event-based)',
});

export type SyncRequestInput = z.infer<typeof SyncValidationSchema>; 