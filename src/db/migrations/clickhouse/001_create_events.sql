-- migrate:up

CREATE TABLE events (
    -- Core event information
    event_id String,
    user_id String,
    project_id LowCardinality(String),

    -- The moment when the event happened (ISO 8601 converted to DateTime64(3))
    event_time DateTime64(3),

    -- Arbitrary metadata sent by the client as JSON (stored as String)
    metadata String CODEC(ZSTD(3)),

    -- Array with per-event granular activities (also JSON serialised)
    activities String CODEC(ZSTD(3))
)
ENGINE = ReplacingMergeTree(event_time)
PARTITION BY toYYYYMMDD(event_time)
ORDER BY (user_id, project_id, event_time)
SETTINGS index_granularity = 8192;

-- migrate:down

DROP TABLE events; 