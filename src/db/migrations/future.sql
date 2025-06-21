-- ================================================================
-- TIMEFLY DEVELOPER ACTIVITY TRACKER - CLICKHOUSE SCHEMA V2.0
-- Complete analytics schema supporting 58+ metrics fields
-- ================================================================

CREATE TABLE pulses (
    -- ===============================
    -- BASE PULSE INFORMATION (8 fields)
    -- ===============================
    timestamp DateTime64(3), -- Converted from ISO 8601 by backend for optimal performance
    user_id String, -- Added by backend during synchronization
    ide_instance_id String,
    ide_type LowCardinality(String), -- 'vscode', 'cursor', 'intellij', etc.
    ide_version String,
    project_name LowCardinality(String), -- Project names are repeated often
    git_branch LowCardinality(String), -- Branch names are repeated often
    activity_type LowCardinality(String), -- 'coding', 'debugging', 'reading', 'ai_usage', 'idle', 'inactive'
    duration_seconds Int32,

    -- ===============================
    -- CORE ACTIVITY METRICS (6 fields)
    -- ===============================
    line_additions Int32,
    line_deletions Int32,
    cursor_position Int64, -- Can be large for big files
    file_path String,
    language_id LowCardinality(String), -- 'typescript', 'javascript', 'python', etc.
    window_focused Bool,

    -- ===============================
    -- AI USAGE METRICS (8 fields)
    -- ===============================
    ai_chat_active Bool,
    ai_queries_count Int32,
    ai_response_received Bool,
    ai_suggestions_shown Int32,
    ai_suggestions_accepted Int32,
    ai_time_spent_seconds Int32,
    ai_model_used LowCardinality(String), -- 'claude', 'copilot', 'gpt-4', etc.
    ai_conversation_length Int32,

    -- ===============================
    -- WORKSPACE METRICS (7 fields)
    -- ===============================
    open_files_count Int32,
    terminal_active Bool,
    debugger_active Bool,
    extensions_count Int32,
    workspace_files_count Int32,
    active_panel LowCardinality(String), -- 'editor', 'explorer', 'search', etc.
    split_editors_count Int32,

    -- ===============================
    -- PRODUCTIVITY METRICS (10 fields)
    -- ===============================
    keystroke_frequency Float32, -- Keystrokes per minute
    file_switches_count Int32,
    scroll_distance Int64, -- Can be very large
    error_count Int32,
    warning_count Int32,
    uninterrupted_duration Int32, -- Seconds of uninterrupted work
    pause_duration_avg Float32, -- Average pause duration in seconds
    typing_speed_wpm Float32, -- Words per minute
    deep_work_indicator Bool, -- Flow state detection
    focus_session_count Int32,

    -- ===============================
    -- GIT METRICS (6 fields)
    -- ===============================
    git_commits_today Int32,
    git_branches_switched Int32,
    git_files_staged Int32,
    git_merge_conflicts Int32,
    git_last_commit_time String, -- ISO 8601 timestamp
    git_repo_status LowCardinality(String), -- 'clean', 'dirty', 'ahead', 'behind', etc.

    -- ===============================
    -- DEBUG METRICS (7 fields)
    -- ===============================
    debug_session_active Bool,
    debug_sessions_today Int32,
    debug_time_today_seconds Int32,
    debug_breakpoints_set Int32,
    debug_commands_executed Int32,
    debug_session_duration Int32, -- Current session duration in seconds
    debug_session_type LowCardinality(String), -- 'node', 'python', 'dotnet', etc.

    -- ===============================
    -- IDE METRICS (6 fields)
    -- ===============================
    command_palette_used Int32,
    shortcuts_used Int32,
    search_operations Int32,
    find_replace_operations Int32,
    quick_open_used Int32,
    intellisense_triggered Int32

) ENGINE = ReplacingMergeTree(timestamp)
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (user_id, timestamp, activity_type, ide_type, project_name, git_branch)
SETTINGS index_granularity = 8192;

-- ================================================================
-- MATERIALIZED VIEWS FOR COMMON ANALYTICS QUERIES
-- ================================================================

-- Daily activity summary by user and project
CREATE MATERIALIZED VIEW daily_activity_summary
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (user_id, project_name, date, activity_type)
AS SELECT
    user_id,
    project_name,
    toDate(timestamp) as date,
    activity_type,
    sum(duration_seconds) as total_duration,
    sum(line_additions) as total_line_additions,
    sum(line_deletions) as total_line_deletions,
    avg(typing_speed_wpm) as avg_typing_speed,
    sum(ai_queries_count) as total_ai_queries,
    sum(debug_sessions_today) as total_debug_sessions,
    count() as pulse_count
FROM pulses
GROUP BY user_id, project_name, date, activity_type;

-- AI usage patterns
CREATE MATERIALIZED VIEW ai_usage_patterns
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (user_id, ai_model_used, date)
AS SELECT
    user_id,
    ai_model_used,
    toDate(timestamp) as date,
    sum(ai_time_spent_seconds) as total_ai_time,
    sum(ai_queries_count) as total_queries,
    sum(ai_suggestions_shown) as total_suggestions_shown,
    sum(ai_suggestions_accepted) as total_suggestions_accepted,
    avg(ai_conversation_length) as avg_conversation_length,
    count() as ai_sessions
FROM pulses
WHERE activity_type = 'ai_usage'
GROUP BY user_id, ai_model_used, date;

-- Productivity insights
CREATE MATERIALIZED VIEW productivity_insights
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (user_id, project_name, date)
AS SELECT
    user_id,
    project_name,
    toDate(timestamp) as date,
    sum(if(deep_work_indicator, duration_seconds, 0)) as deep_work_time,
    avg(typing_speed_wpm) as avg_typing_speed,
    sum(focus_session_count) as total_focus_sessions,
    sum(uninterrupted_duration) as total_uninterrupted_time,
    avg(keystroke_frequency) as avg_keystroke_frequency,
    sum(error_count) as total_errors,
    count() as total_pulses
FROM pulses
WHERE activity_type IN ('coding', 'debugging')
GROUP BY user_id, project_name, date;

-- ================================================================
-- INDEXES FOR OPTIMAL QUERY PERFORMANCE
-- ================================================================

-- Index for time-based queries
ALTER TABLE pulses ADD INDEX idx_timestamp (timestamp) TYPE minmax GRANULARITY 1;

-- Index for user-based queries
ALTER TABLE pulses ADD INDEX idx_user_activity (user_id, activity_type) TYPE set(100) GRANULARITY 1;

-- Index for AI queries
ALTER TABLE pulses ADD INDEX idx_ai_model (ai_model_used) TYPE set(20) GRANULARITY 1;

-- Index for language analysis
ALTER TABLE pulses ADD INDEX idx_language (language_id) TYPE set(50) GRANULARITY 1;

-- Index for project analysis
ALTER TABLE pulses ADD INDEX idx_project_branch (project_name, git_branch) TYPE set(1000) GRANULARITY 1;

-- ================================================================
-- SAMPLE ANALYTICS QUERIES
-- ================================================================

-- Daily coding time by user
-- SELECT 
--     user_id,
--     toDate(timestamp) as date,
--     sum(duration_seconds) / 60 as total_minutes,
--     sum(line_additions + line_deletions) as total_lines_changed
-- FROM pulses 
-- WHERE activity_type IN ('coding', 'debugging')
-- GROUP BY user_id, date
-- ORDER BY date DESC, total_minutes DESC;

-- AI usage efficiency
-- SELECT 
--     user_id,
--     ai_model_used,
--     sum(ai_suggestions_accepted) / sum(ai_suggestions_shown) * 100 as acceptance_rate,
--     avg(ai_conversation_length) as avg_conversation_length,
--     sum(ai_time_spent_seconds) / 60 as total_ai_minutes
-- FROM pulses 
-- WHERE activity_type = 'ai_usage' AND ai_suggestions_shown > 0
-- GROUP BY user_id, ai_model_used;

-- Deep work patterns
-- SELECT 
--     user_id,
--     project_name,
--     toHour(timestamp) as hour_of_day,
--     avg(if(deep_work_indicator, 1, 0)) * 100 as deep_work_percentage,
--     avg(typing_speed_wpm) as avg_typing_speed
-- FROM pulses 
-- WHERE activity_type = 'coding'
-- GROUP BY user_id, project_name, hour_of_day
-- ORDER BY hour_of_day;

-- Simultaneous activities analysis
-- SELECT 
--     user_id,
--     toDate(timestamp) as date,
--     count(DISTINCT activity_type) as unique_activities,
--     sum(duration_seconds) as total_duration,
--     groupArray(activity_type) as activities_mix
-- FROM pulses 
-- WHERE timestamp BETWEEN now() - INTERVAL 1 DAY AND now()
-- GROUP BY user_id, date, toStartOfMinute(timestamp)
-- HAVING unique_activities > 1;