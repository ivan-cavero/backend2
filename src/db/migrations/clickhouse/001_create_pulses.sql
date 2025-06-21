-- migrate:up

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

-- migrate:down
DROP TABLE pulses;