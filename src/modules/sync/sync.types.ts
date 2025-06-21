/**
 * Sync module types for TimeFly activity pulse synchronization
 * 
 * Based on the comprehensive ClickHouse schema V2.0 with 58+ metrics fields,
 * these types define the structure of enhanced activity pulses sent from
 * the VS Code extension and stored in ClickHouse for advanced analytics.
 * 
 * Schema Categories:
 * - Base Pulse Information (8 fields)
 * - Core Activity Metrics (6 fields) 
 * - AI Usage Metrics (8 fields)
 * - Workspace Metrics (7 fields)
 * - Productivity Metrics (10 fields)
 * - Git Metrics (6 fields)
 * - Debug Metrics (7 fields)
 * - IDE Metrics (6 fields)
 */

/**
 * Activity types that can be tracked by the extension
 */
export type ActivityType = 'coding' | 'debugging' | 'reading' | 'ai_usage' | 'idle' | 'inactive'

/**
 * IDE types supported by the extension
 */
export type IdeType = 'vscode' | 'cursor' | 'windsurf' | 'intellij' | 'visual-studio'

/**
 * Programming language identifiers
 */
export type LanguageId = 
  | 'typescript' | 'javascript' | 'python' | 'java' | 'cpp' | 'csharp' 
  | 'go' | 'rust' | 'php' | 'ruby' | 'swift' | 'kotlin' | 'dart'
  | 'html' | 'css' | 'scss' | 'less' | 'json' | 'xml' | 'yaml'
  | 'sql' | 'markdown' | 'shell' | 'dockerfile' | 'git'
  | string // Allow any language id

/**
 * AI model types supported for AI usage tracking
 */
export type AiModelType = 'claude' | 'copilot' | 'gpt-4' | 'gpt-3.5' | 'gemini' | 'codeium' | 'tabnine' | string

/**
 * Git repository status types
 */
export type GitRepoStatus = 'clean' | 'dirty' | 'ahead' | 'behind' | 'diverged' | 'unknown' | "no-git"

/**
 * Active panel types in IDE
 */
export type ActivePanelType = 'editor' | 'explorer' | 'search' | 'source-control' | 'run-debug' | 'extensions' | 'terminal' | string

/**
 * Debug session types
 */
export type DebugSessionType = 'node' | 'python' | 'dotnet' | 'java' | 'cpp' | 'go' | 'unknown' | string

/**
 * Comprehensive activity pulse as sent by the enhanced extension.
 * This represents a discrete period of developer activity with 58+ metrics fields.
 */
export interface ActivityPulse {
  // ===============================
  // BASE PULSE INFORMATION (8 fields)
  // ===============================
  /** ISO 8601 timestamp when the pulse started (e.g., "2024-01-01T12:00:00.000Z") */
  timestamp: string
  
  /** Unique identifier for this IDE instance session */
  ide_instance_id: string
  
  /** Type of IDE (vscode, cursor, etc.) */
  ide_type: IdeType
  
  /** Version of the IDE */
  ide_version: string
  
  /** Name of the project/workspace folder */
  project_name: string
  
  /** Current Git branch name */
  git_branch: string
  
  /** Type of activity during this pulse */
  activity_type: ActivityType
  
  /** Duration of the activity in seconds */
  duration_seconds: number

  // ===============================
  // CORE ACTIVITY METRICS (6 fields)
  // ===============================
  /** Number of lines added during this pulse */
  line_additions: number
  
  /** Number of lines deleted during this pulse */
  line_deletions: number
  
  /** Absolute cursor position in the active file */
  cursor_position: number
  
  /** Relative path to the active file */
  file_path: string
  
  /** Programming language of the active file */
  language_id: LanguageId
  
  /** Whether the IDE window was focused during this pulse */
  window_focused: boolean

  // ===============================
  // AI USAGE METRICS (8 fields)
  // ===============================
  /** Whether AI chat was active during this pulse */
  ai_chat_active: boolean
  
  /** Number of AI queries made during this pulse */
  ai_queries_count: number
  
  /** Whether AI response was received during this pulse */
  ai_response_received: boolean
  
  /** Number of AI suggestions shown during this pulse */
  ai_suggestions_shown: number
  
  /** Number of AI suggestions accepted during this pulse */
  ai_suggestions_accepted: number
  
  /** Time spent interacting with AI in seconds */
  ai_time_spent_seconds: number
  
  /** AI model used during this pulse (if any) */
  ai_model_used: AiModelType
  
  /** Length of AI conversation (message count) */
  ai_conversation_length: number

  // ===============================
  // WORKSPACE METRICS (7 fields)
  // ===============================
  /** Number of files open in the workspace */
  open_files_count: number
  
  /** Whether terminal was active during this pulse */
  terminal_active: boolean
  
  /** Whether debugger was active during this pulse */
  debugger_active: boolean
  
  /** Number of extensions installed */
  extensions_count: number
  
  /** Total number of files in the workspace */
  workspace_files_count: number
  
  /** Currently active panel in the IDE */
  active_panel: ActivePanelType
  
  /** Number of split editors open */
  split_editors_count: number

  // ===============================
  // PRODUCTIVITY METRICS (10 fields)
  // ===============================
  /** Keystroke frequency (keystrokes per minute) */
  keystroke_frequency: number
  
  /** Number of file switches during this pulse */
  file_switches_count: number
  
  /** Total scroll distance during this pulse */
  scroll_distance: number
  
  /** Number of errors detected during this pulse */
  error_count: number
  
  /** Number of warnings detected during this pulse */
  warning_count: number
  
  /** Seconds of uninterrupted work during this pulse */
  uninterrupted_duration: number
  
  /** Average pause duration in seconds */
  pause_duration_avg: number
  
  /** Typing speed in words per minute */
  typing_speed_wpm: number
  
  /** Whether deep work/flow state was detected */
  deep_work_indicator: boolean
  
  /** Number of focus sessions during this pulse */
  focus_session_count: number

  // ===============================
  // GIT METRICS (6 fields)
  // ===============================
  /** Number of Git commits made today */
  git_commits_today: number
  
  /** Number of branch switches during this pulse */
  git_branches_switched: number
  
  /** Number of files staged for commit */
  git_files_staged: number
  
  /** Number of merge conflicts encountered */
  git_merge_conflicts: number
  
  /** ISO 8601 timestamp of last commit */
  git_last_commit_time: string
  
  /** Current Git repository status */
  git_repo_status: GitRepoStatus

  // ===============================
  // DEBUG METRICS (7 fields)
  // ===============================
  /** Whether debug session was active during this pulse */
  debug_session_active: boolean
  
  /** Number of debug sessions started today */
  debug_sessions_today: number
  
  /** Total debug time today in seconds */
  debug_time_today_seconds: number
  
  /** Number of breakpoints currently set */
  debug_breakpoints_set: number
  
  /** Number of debug commands executed during this pulse */
  debug_commands_executed: number
  
  /** Current debug session duration in seconds */
  debug_session_duration: number
  
  /** Type of debug session (node, python, etc.) */
  debug_session_type: DebugSessionType

  // ===============================
  // IDE METRICS (6 fields)
  // ===============================
  /** Number of times command palette was used */
  command_palette_used: number
  
  /** Number of keyboard shortcuts used */
  shortcuts_used: number
  
  /** Number of search operations performed */
  search_operations: number
  
  /** Number of find/replace operations performed */
  find_replace_operations: number
  
  /** Number of times quick open was used */
  quick_open_used: number
  
  /** Number of times IntelliSense was triggered */
  intellisense_triggered: number
}

/**
 * Sync request payload containing multiple activity pulses.
 * This is what the extension sends every 30 minutes.
 */
export interface SyncRequest {
  /** Array of activity pulses to synchronize */
  pulses: ActivityPulse[]
}

/**
 * Sync response returned after successful synchronization
 */
export interface SyncResponse {
  /** Whether the sync was successful */
  success: boolean
  
  /** Number of pulses processed */
  processed_count: number
  
  /** Sync timestamp */
  synced_at: string
}

/**
 * Extended pulse with user_id for ClickHouse storage.
 * The user_id is added by the backend based on the authenticated user.
 */
export interface StoredActivityPulse extends ActivityPulse {
  /** User ID extracted from the authenticated session */
  user_id: string
}

/**
 * Activity statistics aggregated from stored pulses
 */
export interface ActivityStats {
  /** Activity type */
  activity_type: ActivityType
  
  /** Total number of pulses */
  pulse_count: number
  
  /** Total duration in seconds */
  total_duration_seconds: number
  
  /** Total lines added */
  total_line_additions: number
  
  /** Total lines deleted */
  total_line_deletions: number
  
  /** Number of unique IDE sessions */
  unique_sessions: number
  
  /** Number of unique projects */
  unique_projects: number
} 