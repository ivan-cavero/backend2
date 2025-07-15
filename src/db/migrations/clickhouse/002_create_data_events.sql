-- migrate:up

-- ================================================================
-- TIMEFLY DATA IMPORT / EXPORT EVENTS
-- Stores lifecycle of long-running data transfer jobs (import / export)
-- ================================================================

CREATE TABLE data_events (
    id String,
    user_id String,
    event_type LowCardinality(String),  -- 'import' | 'export'
    status LowCardinality(String),       -- 'queued' | 'running' | 'done' | 'error'
    file_key String,
    created_at DateTime DEFAULT now(),
    started_at Nullable(DateTime),
    completed_at Nullable(DateTime),
    duration_seconds Nullable(Int32),
    error_msg Nullable(String)
) ENGINE = ReplacingMergeTree(created_at)
PARTITION BY toYYYYMMDD(created_at)
ORDER BY (user_id, event_type, created_at)
SETTINGS index_granularity = 8192;

-- migrate:down
DROP TABLE data_events; 