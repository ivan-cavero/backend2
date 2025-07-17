/*
 * TimeFly – Event-based sync types (v3)
 *
 * This replaces the previous 58-field "ActivityPulse" model with a
 * minimal "Event" payload that better reflects the smaller amount of
 * data now sent by the client.
 */

// Basic metadata bag sent by the extension – arbitrary key/value pairs.
export interface Metadata {
  [key: string]: unknown;
}

// A fine-grained activity within the event (reading, coding, etc.).
export interface EventActivity {
  /** Activity name, e.g. "reading", "coding" */
  name: string;
  /** Duration in milliseconds */
  duration_ms: number;
  /** Optional extra properties */
  properties?: Record<string, unknown>;
}

// Core event payload synchronised from the IDE.
export interface EventPayload {
  /** Unique event identifier (UUID) */
  event_id: string;
  /** The user UUID (added by backend once authenticated) */
  user_id: string;
  /** Project / workspace identifier */
  project_id: string;
  /** ISO-8601 time when the event occurred */
  event_time: string;
  /** Machine & environment metadata */
  metadata: Metadata;
  /** List of granular activities inside this event */
  activities: EventActivity[];
}

// Request body wrapper.
export interface SyncRequest {
  /** Array of events to synchronise */
  events: EventPayload[];
}

// Standard sync response.
export interface SyncResponse {
  success: boolean;
  processed_count: number;
  synced_at: string;
}

// Event stored in ClickHouse (includes user_id).
export interface StoredEvent extends EventPayload {}
