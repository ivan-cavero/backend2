import { clickhouseClient } from '@/db/clickhouse'
import type { ActivityPulse, StoredActivityPulse, SyncResponse, ActivityStats } from './sync.types'
import { logger } from '@/utils/logger'

/**
 * Sync service for handling activity pulse synchronization with ClickHouse.
 * 
 * This service provides high-performance batch insertion of activity pulses
 * with 58+ metrics fields into ClickHouse for real-time analytics and reporting.
 * 
 * All functions use proper error handling and logging for production reliability.
 */

/**
 * Synchronizes an array of activity pulses to ClickHouse for a specific user.
 * 
 * @param userId - User UUID for the authenticated user
 * @param pulses - Array of activity pulses from the IDE extension
 * 
 * @returns Promise<SyncResponse> - Response with sync status and processed count
 * 
 * @example
 * ```typescript
 * const result = await syncActivityPulses('user-uuid', [
 *   {
 *     timestamp: '2024-01-01T12:00:00.000Z',
 *     ide_instance_id: 'vscode-123',
 *     ide_type: 'vscode',
 *     // ... 50+ other metrics fields
 *   }
 * ])
 * console.log(`Processed ${result.processed_count} pulses`)
 * ```
 */
export async function syncActivityPulses(
  userId: string,
  pulses: ActivityPulse[]
): Promise<SyncResponse> {
  const startTime = Date.now()
  
  logger.info(`Starting sync for user ${userId} with ${pulses.length} pulses`)
  
  if (pulses.length === 0) {
    return {
      success: true,
      processed_count: 0,
      synced_at: new Date().toISOString()
    }
  }
  
  // Prepare data for ClickHouse insertion with all 58+ fields
  const clickhouseData: StoredActivityPulse[] = pulses.map((pulse) => ({
    ...pulse,
    user_id: userId
  }))
  
  // Convert ISO 8601 strings to Unix timestamp format that ClickHouse DateTime64(3) expects
  const clickhouseDataFormatted = clickhouseData.map(pulse => ({
    // ===============================
    // BASE PULSE INFORMATION (8 fields)
    // ===============================
    timestamp: new Date(pulse.timestamp).getTime(), // Unix timestamp in milliseconds for ClickHouse DateTime64(3)
    user_id: pulse.user_id,
    ide_instance_id: pulse.ide_instance_id,
    ide_type: pulse.ide_type,
    ide_version: pulse.ide_version,
    project_name: pulse.project_name,
    git_branch: pulse.git_branch,
    activity_type: pulse.activity_type,
    duration_seconds: pulse.duration_seconds,

    // ===============================
    // CORE ACTIVITY METRICS (6 fields)
    // ===============================
    line_additions: pulse.line_additions,
    line_deletions: pulse.line_deletions,
    cursor_position: pulse.cursor_position,
    file_path: pulse.file_path,
    language_id: pulse.language_id,
    window_focused: pulse.window_focused,

    // ===============================
    // AI USAGE METRICS (8 fields)
    // ===============================
    ai_chat_active: pulse.ai_chat_active,
    ai_queries_count: pulse.ai_queries_count,
    ai_response_received: pulse.ai_response_received,
    ai_suggestions_shown: pulse.ai_suggestions_shown,
    ai_suggestions_accepted: pulse.ai_suggestions_accepted,
    ai_time_spent_seconds: pulse.ai_time_spent_seconds,
    ai_model_used: pulse.ai_model_used,
    ai_conversation_length: pulse.ai_conversation_length,

    // ===============================
    // WORKSPACE METRICS (7 fields)
    // ===============================
    open_files_count: pulse.open_files_count,
    terminal_active: pulse.terminal_active,
    debugger_active: pulse.debugger_active,
    extensions_count: pulse.extensions_count,
    workspace_files_count: pulse.workspace_files_count,
    active_panel: pulse.active_panel,
    split_editors_count: pulse.split_editors_count,

    // ===============================
    // PRODUCTIVITY METRICS (10 fields)
    // ===============================
    keystroke_frequency: pulse.keystroke_frequency,
    file_switches_count: pulse.file_switches_count,
    scroll_distance: pulse.scroll_distance,
    error_count: pulse.error_count,
    warning_count: pulse.warning_count,
    uninterrupted_duration: pulse.uninterrupted_duration,
    pause_duration_avg: pulse.pause_duration_avg,
    typing_speed_wpm: pulse.typing_speed_wpm,
    deep_work_indicator: pulse.deep_work_indicator,
    focus_session_count: pulse.focus_session_count,

    // ===============================
    // GIT METRICS (6 fields)
    // ===============================
    git_commits_today: pulse.git_commits_today,
    git_branches_switched: pulse.git_branches_switched,
    git_files_staged: pulse.git_files_staged,
    git_merge_conflicts: pulse.git_merge_conflicts,
    git_last_commit_time: pulse.git_last_commit_time,
    git_repo_status: pulse.git_repo_status,

    // ===============================
    // DEBUG METRICS (7 fields)
    // ===============================
    debug_session_active: pulse.debug_session_active,
    debug_sessions_today: pulse.debug_sessions_today,
    debug_time_today_seconds: pulse.debug_time_today_seconds,
    debug_breakpoints_set: pulse.debug_breakpoints_set,
    debug_commands_executed: pulse.debug_commands_executed,
    debug_session_duration: pulse.debug_session_duration,
    debug_session_type: pulse.debug_session_type,

    // ===============================
    // IDE METRICS (6 fields)
    // ===============================
    command_palette_used: pulse.command_palette_used,
    shortcuts_used: pulse.shortcuts_used,
    search_operations: pulse.search_operations,
    find_replace_operations: pulse.find_replace_operations,
    quick_open_used: pulse.quick_open_used,
    intellisense_triggered: pulse.intellisense_triggered
  }))
  
  logger.info('Prepared ClickHouse data sample:', {
    sampleCount: Math.min(2, clickhouseDataFormatted.length),
    sample: clickhouseDataFormatted.slice(0, 1), // Only show one sample due to size
    totalFields: Object.keys(clickhouseDataFormatted[0] || {}).length,
    timestampFormat: clickhouseDataFormatted[0]?.timestamp
  })
  
  // Batch insert into ClickHouse using the optimized ReplacingMergeTree engine
  // This handles deduplication automatically based on the ORDER BY clause
  try {
    await clickhouseClient.insert({
      table: 'pulses',
      values: clickhouseDataFormatted,
      format: 'JSONEachRow',
      // Use async inserts for better performance with high-volume data
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 1
      }
    })
    logger.info(`Successfully inserted ${clickhouseDataFormatted.length} records into ClickHouse`)
  } catch (insertError) {
    logger.error('ClickHouse insert error details:', {
      error: insertError,
      errorMessage: insertError instanceof Error ? insertError.message : 'Unknown error',
      errorStack: insertError instanceof Error ? insertError.stack : undefined,
      sampleData: clickhouseDataFormatted.slice(0, 1),
      dataTypes: typeof clickhouseDataFormatted[0]?.timestamp,
      timestampValue: clickhouseDataFormatted[0]?.timestamp,
      fieldCount: Object.keys(clickhouseDataFormatted[0] || {}).length
    })
    throw insertError
  }
  
  const syncedAt = new Date().toISOString()
  const duration = Date.now() - startTime
  
  logger.info(`Successfully synced ${pulses.length} pulses for user ${userId} in ${duration}ms`)
  
  return {
    success: true,
    processed_count: pulses.length,
    synced_at: syncedAt
  }
}

/**
 * Validates that pulses are properly formatted and within reasonable bounds.
 * This provides additional runtime validation beyond the Zod schema validation for all 58+ fields.
 * 
 * @param pulses - Array of activity pulses to validate
 * @throws Error if validation fails
 */
export function validatePulsesIntegrity(pulses: ActivityPulse[]): void {
  for (const [index, pulse] of pulses.entries()) {
    // Validate base pulse information
    const pulseDate = new Date(pulse.timestamp)
    const now = new Date()
    
    if (Number.isNaN(pulseDate.getTime())) {
      throw new Error(`Pulse ${index}: timestamp is not a valid ISO 8601 date`)
    }
    
    // Validate timestamp is not in the future (with 5 minute tolerance for clock skew)
    const fiveMinutesFromNow = new Date(now.getTime() + (5 * 60 * 1000))
    if (pulseDate > fiveMinutesFromNow) {
      throw new Error(`Pulse ${index}: timestamp cannot be in the future`)
    }
    
    // Validate timestamp is not older than 1 year (prevent historical data pollution)
    const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000))
    if (pulseDate < oneYearAgo) {
      throw new Error(`Pulse ${index}: timestamp cannot be older than 1 year`)
    }
    
    // Validate core activity metrics
    if (pulse.duration_seconds > 7200) {
      throw new Error(`Pulse ${index}: duration cannot exceed 2 hours (7200 seconds)`)
    }
    
    if (pulse.line_additions > 10000 || pulse.line_deletions > 10000) {
      throw new Error(`Pulse ${index}: line changes cannot exceed 10,000 per pulse`)
    }
    
    // Validate AI usage metrics
    if (pulse.ai_time_spent_seconds > pulse.duration_seconds) {
      throw new Error(`Pulse ${index}: AI time spent cannot exceed total pulse duration`)
    }
    
    if (pulse.ai_suggestions_accepted > pulse.ai_suggestions_shown) {
      throw new Error(`Pulse ${index}: AI suggestions accepted cannot exceed suggestions shown`)
    }
    
    // Validate workspace metrics
    if (pulse.open_files_count > 1000) {
      throw new Error(`Pulse ${index}: open files count seems unreasonably high (>1000)`)
    }
    
    if (pulse.workspace_files_count > 100000) {
      throw new Error(`Pulse ${index}: workspace files count seems unreasonably high (>100k)`)
    }
    
    // Validate productivity metrics
    if (pulse.keystroke_frequency > 1000) {
      throw new Error(`Pulse ${index}: keystroke frequency seems unreasonably high (>1000 kpm)`)
    }
    
    if (pulse.typing_speed_wpm > 200) {
      throw new Error(`Pulse ${index}: typing speed seems unreasonably high (>200 wpm)`)
    }
    
    if (pulse.uninterrupted_duration > pulse.duration_seconds) {
      throw new Error(`Pulse ${index}: uninterrupted duration cannot exceed total pulse duration`)
    }
    
    // Validate Git metrics
    if (pulse.git_commits_today > 1000) {
      throw new Error(`Pulse ${index}: daily commit count seems unreasonably high (>1000)`)
    }
    
    // Validate debug metrics
    if (pulse.debug_time_today_seconds > 86400) {
      throw new Error(`Pulse ${index}: debug time today cannot exceed 24 hours`)
    }
    
    if (pulse.debug_session_duration > pulse.debug_time_today_seconds) {
      throw new Error(`Pulse ${index}: current debug session duration cannot exceed total debug time today`)
    }
    
    // Validate IDE metrics consistency
    const totalIdeInteractions = 
      pulse.command_palette_used + 
      pulse.shortcuts_used + 
      pulse.search_operations + 
      pulse.find_replace_operations + 
      pulse.quick_open_used
    
    if (totalIdeInteractions > 10000) {
      throw new Error(`Pulse ${index}: total IDE interactions seem unreasonably high (>10k per pulse)`)
    }
  }
}

/**
 * Gets comprehensive aggregate activity statistics for a user within a date range.
 * This includes all metrics categories from the enhanced schema.
 * 
 * @param userId - User UUID
 * @param startDate - Start date for the query (ISO string)
 * @param endDate - End date for the query (ISO string)
 * @returns Promise with comprehensive aggregated activity stats
 */
export async function getUserActivityStats(
  userId: string,
  startDate: string,
  endDate: string
): Promise<ActivityStats[]> {
  try {
    const query = `
      SELECT 
        activity_type,
        COUNT(*) as pulse_count,
        SUM(duration_seconds) as total_duration_seconds,
        SUM(line_additions) as total_line_additions,
        SUM(line_deletions) as total_line_deletions,
        COUNT(DISTINCT ide_instance_id) as unique_sessions,
        COUNT(DISTINCT project_name) as unique_projects,
        
        -- AI Usage Aggregations
        SUM(ai_queries_count) as total_ai_queries,
        SUM(ai_suggestions_shown) as total_ai_suggestions_shown,
        SUM(ai_suggestions_accepted) as total_ai_suggestions_accepted,
        SUM(ai_time_spent_seconds) as total_ai_time_spent,
        
        -- Productivity Aggregations
        AVG(keystroke_frequency) as avg_keystroke_frequency,
        SUM(file_switches_count) as total_file_switches,
        SUM(error_count) as total_errors,
        SUM(warning_count) as total_warnings,
        AVG(typing_speed_wpm) as avg_typing_speed,
        
        -- Git Aggregations
        MAX(git_commits_today) as max_daily_commits,
        SUM(git_branches_switched) as total_branch_switches,
        
        -- Debug Aggregations
        SUM(debug_time_today_seconds) as total_debug_time,
        MAX(debug_sessions_today) as max_daily_debug_sessions,
        
        -- IDE Aggregations
        SUM(command_palette_used) as total_command_palette_usage,
        SUM(shortcuts_used) as total_shortcuts_used,
        SUM(intellisense_triggered) as total_intellisense_triggered
        
      FROM pulses 
      WHERE user_id = {userId:String}
        AND timestamp >= {startDate:DateTime}
        AND timestamp <= {endDate:DateTime}
      GROUP BY activity_type
      ORDER BY total_duration_seconds DESC
    `
    
    const result = await clickhouseClient.query({
      query,
      query_params: {
        userId,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      },
      format: 'JSONEachRow'
    })
    
    const data = await result.json() as ActivityStats[]
    return data
    
  } catch (error) {
    logger.error(`Failed to get activity stats for user ${userId}:`, error)
    throw new Error(`Failed to retrieve activity statistics: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Tests ClickHouse database connectivity with a simple SELECT 1 query.
 * This is used for health checks without affecting any actual data.
 * 
 * @throws Error if ClickHouse is not accessible
 */
export async function testClickHouseConnection(): Promise<void> {
  try {
    const result = await clickhouseClient.query({
      query: 'SELECT 1 as test',
      format: 'JSONEachRow'
    })
    
    // Consume the result to ensure the query actually executed
    await result.json()
    
    logger.debug('ClickHouse connection test successful')
  } catch (error) {
    logger.error('ClickHouse connection test failed:', error)
    throw new Error(`ClickHouse connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

 