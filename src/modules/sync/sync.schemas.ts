import { z } from 'zod'
import 'zod-openapi/extend'

/**
 * Zod schemas for comprehensive sync module validation and OpenAPI documentation
 * 
 * These schemas validate incoming sync requests from the VS Code extension
 * and generate comprehensive OpenAPI documentation for the enhanced /sync endpoint
 * with 58+ metrics fields organized by category.
 */

// ===============================
// ENUM AND TYPE VALIDATIONS
// ===============================

// Activity type validation - now includes AI usage
export const ActivityTypeSchema = z.enum(['coding', 'debugging', 'reading', 'ai_usage', 'idle', 'inactive']).openapi({
  description: 'Type of developer activity being tracked',
  example: 'coding'
})

// IDE type validation
export const IdeTypeSchema = z.enum(['vscode', 'cursor', 'windsurf', 'intellij', 'visual-studio']).openapi({
  description: 'Type of IDE or code editor',
  example: 'vscode'
})

// Programming language validation
export const LanguageIdSchema = z.string().min(1).max(50).openapi({
  description: 'Programming language identifier (e.g., typescript, python, javascript)',
  example: 'typescript'
})

// AI model validation
export const AiModelSchema = z.string().max(50).openapi({
  description: 'AI model used (claude, copilot, gpt-4, etc.)',
  example: 'claude'
})

// Git repository status validation
export const GitRepoStatusSchema = z.enum(['clean', 'dirty', 'ahead', 'behind', 'diverged', 'unknown', 'no-git']).openapi({
  description: 'Current Git repository status',
  example: 'clean'
})

// Active panel validation
export const ActivePanelSchema = z.string().max(50).openapi({
  description: 'Currently active panel in the IDE',
  example: 'editor'
})

// Debug session type validation
export const DebugSessionTypeSchema = z.string().max(50).openapi({
  description: 'Type of debug session (node, python, dotnet, etc.)',
  example: 'node'
})

// ===============================
// COMPREHENSIVE ACTIVITY PULSE SCHEMA
// ===============================

export const ActivityPulseSchema = z.object({
  // ===============================
  // BASE PULSE INFORMATION (8 fields)
  // ===============================
  timestamp: z.string().datetime().openapi({
    description: 'ISO 8601 timestamp when the pulse started',
    example: '2024-01-01T12:00:00.000Z'
  }),
  
  ide_instance_id: z.string().uuid().openapi({
    description: 'Unique identifier for this IDE instance session',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  }),
  
  ide_type: IdeTypeSchema,
  
  ide_version: z.string().min(1).max(50).openapi({
    description: 'Version of the IDE',
    example: '1.86.0'
  }),
  
  project_name: z.string().min(1).max(255).openapi({
    description: 'Name of the project/workspace folder',
    example: 'my-awesome-project'
  }),
  
  git_branch: z.string().min(1).max(255).openapi({
    description: 'Current Git branch name',
    example: 'feature/activity-tracking'
  }),
  
  activity_type: ActivityTypeSchema,
  
  duration_seconds: z.number().int().min(0).max(7200).openapi({
    description: 'Duration of the activity in seconds (max 2 hours per pulse)',
    example: 120
  }),

  // ===============================
  // CORE ACTIVITY METRICS (6 fields)
  // ===============================
  line_additions: z.number().int().min(0).max(10000).openapi({
    description: 'Number of lines added during this pulse',
    example: 15
  }),
  
  line_deletions: z.number().int().min(0).max(10000).openapi({
    description: 'Number of lines deleted during this pulse',
    example: 3
  }),
  
  cursor_position: z.number().int().min(0).openapi({
    description: 'Absolute cursor position in the active file (character offset)',
    example: 1250
  }),
  
  file_path: z.string().max(1000).openapi({
    description: 'Relative path to the active file within the project',
    example: 'src/components/ActivityTracker.tsx'
  }),
  
  language_id: LanguageIdSchema,
  
  window_focused: z.boolean().openapi({
    description: 'Whether the IDE window was focused during this pulse',
    example: true
  }),

  // ===============================
  // AI USAGE METRICS (8 fields)
  // ===============================
  ai_chat_active: z.boolean().openapi({
    description: 'Whether AI chat was active during this pulse',
    example: false
  }),
  
  ai_queries_count: z.number().int().min(0).max(1000).openapi({
    description: 'Number of AI queries made during this pulse',
    example: 2
  }),
  
  ai_response_received: z.boolean().openapi({
    description: 'Whether AI response was received during this pulse',
    example: false
  }),
  
  ai_suggestions_shown: z.number().int().min(0).max(1000).openapi({
    description: 'Number of AI suggestions shown during this pulse',
    example: 5
  }),
  
  ai_suggestions_accepted: z.number().int().min(0).max(1000).openapi({
    description: 'Number of AI suggestions accepted during this pulse',
    example: 2
  }),
  
  ai_time_spent_seconds: z.number().int().min(0).max(7200).openapi({
    description: 'Time spent interacting with AI in seconds',
    example: 30
  }),
  
  ai_model_used: AiModelSchema,
  
  ai_conversation_length: z.number().int().min(0).max(10000).openapi({
    description: 'Length of AI conversation (message count)',
    example: 4
  }),

  // ===============================
  // WORKSPACE METRICS (7 fields)
  // ===============================
  open_files_count: z.number().int().min(0).max(1000).openapi({
    description: 'Number of files open in the workspace',
    example: 8
  }),
  
  terminal_active: z.boolean().openapi({
    description: 'Whether terminal was active during this pulse',
    example: false
  }),
  
  debugger_active: z.boolean().openapi({
    description: 'Whether debugger was active during this pulse',
    example: false
  }),
  
  extensions_count: z.number().int().min(0).max(500).openapi({
    description: 'Number of extensions installed',
    example: 25
  }),
  
  workspace_files_count: z.number().int().min(0).max(100000).openapi({
    description: 'Total number of files in the workspace',
    example: 342
  }),
  
  active_panel: ActivePanelSchema,
  
  split_editors_count: z.number().int().min(0).max(20).openapi({
    description: 'Number of split editors open',
    example: 2
  }),

  // ===============================
  // PRODUCTIVITY METRICS (10 fields)
  // ===============================
  keystroke_frequency: z.number().min(0).max(1000).openapi({
    description: 'Keystroke frequency (keystrokes per minute)',
    example: 85.5
  }),
  
  file_switches_count: z.number().int().min(0).max(1000).openapi({
    description: 'Number of file switches during this pulse',
    example: 3
  }),
  
  scroll_distance: z.number().int().min(0).openapi({
    description: 'Total scroll distance during this pulse (pixels)',
    example: 2400
  }),
  
  error_count: z.number().int().min(0).max(1000).openapi({
    description: 'Number of errors detected during this pulse',
    example: 1
  }),
  
  warning_count: z.number().int().min(0).max(1000).openapi({
    description: 'Number of warnings detected during this pulse',
    example: 3
  }),
  
  uninterrupted_duration: z.number().int().min(0).max(7200).openapi({
    description: 'Seconds of uninterrupted work during this pulse',
    example: 90
  }),
  
  pause_duration_avg: z.number().min(0).max(600).openapi({
    description: 'Average pause duration in seconds',
    example: 2.5
  }),
  
  typing_speed_wpm: z.number().min(0).max(200).openapi({
    description: 'Typing speed in words per minute',
    example: 45.2
  }),
  
  deep_work_indicator: z.boolean().openapi({
    description: 'Whether deep work/flow state was detected',
    example: true
  }),
  
  focus_session_count: z.number().int().min(0).max(100).openapi({
    description: 'Number of focus sessions during this pulse',
    example: 1
  }),

  // ===============================
  // GIT METRICS (6 fields)
  // ===============================
  git_commits_today: z.number().int().min(0).max(1000).openapi({
    description: 'Number of Git commits made today',
    example: 3
  }),
  
  git_branches_switched: z.number().int().min(0).max(100).openapi({
    description: 'Number of branch switches during this pulse',
    example: 0
  }),
  
  git_files_staged: z.number().int().min(0).max(1000).openapi({
    description: 'Number of files staged for commit',
    example: 2
  }),
  
  git_merge_conflicts: z.number().int().min(0).max(100).openapi({
    description: 'Number of merge conflicts encountered',
    example: 0
  }),
  
  git_last_commit_time: z.string().openapi({
    description: 'ISO 8601 timestamp of last commit',
    example: '2024-01-01T11:30:00.000Z'
  }),
  
  git_repo_status: GitRepoStatusSchema,

  // ===============================
  // DEBUG METRICS (7 fields)
  // ===============================
  debug_session_active: z.boolean().openapi({
    description: 'Whether debug session was active during this pulse',
    example: false
  }),
  
  debug_sessions_today: z.number().int().min(0).max(100).openapi({
    description: 'Number of debug sessions started today',
    example: 1
  }),
  
  debug_time_today_seconds: z.number().int().min(0).max(86400).openapi({
    description: 'Total debug time today in seconds',
    example: 600
  }),
  
  debug_breakpoints_set: z.number().int().min(0).max(1000).openapi({
    description: 'Number of breakpoints currently set',
    example: 3
  }),
  
  debug_commands_executed: z.number().int().min(0).max(1000).openapi({
    description: 'Number of debug commands executed during this pulse',
    example: 0
  }),
  
  debug_session_duration: z.number().int().min(0).max(86400).openapi({
    description: 'Current debug session duration in seconds',
    example: 0
  }),
  
  debug_session_type: DebugSessionTypeSchema,

  // ===============================
  // IDE METRICS (6 fields)
  // ===============================
  command_palette_used: z.number().int().min(0).max(1000).openapi({
    description: 'Number of times command palette was used',
    example: 2
  }),
  
  shortcuts_used: z.number().int().min(0).max(1000).openapi({
    description: 'Number of keyboard shortcuts used',
    example: 15
  }),
  
  search_operations: z.number().int().min(0).max(1000).openapi({
    description: 'Number of search operations performed',
    example: 4
  }),
  
  find_replace_operations: z.number().int().min(0).max(1000).openapi({
    description: 'Number of find/replace operations performed',
    example: 1
  }),
  
  quick_open_used: z.number().int().min(0).max(1000).openapi({
    description: 'Number of times quick open was used',
    example: 6
  }),
  
  intellisense_triggered: z.number().int().min(0).max(10000).openapi({
    description: 'Number of times IntelliSense was triggered',
    example: 28
  })
}).openapi({
  ref: 'ActivityPulse',
  description: 'Comprehensive activity pulse with 58+ metrics fields representing developer activity analytics'
})

// ===============================
// REQUEST AND RESPONSE SCHEMAS
// ===============================

// Sync request schema
export const SyncRequestSchema = z.object({
  pulses: z.array(ActivityPulseSchema)
    .min(1, 'At least one pulse is required')
    .max(1000, 'Maximum 1000 pulses per sync request')
    .openapi({
      description: 'Array of comprehensive activity pulses to synchronize. Maximum 1000 pulses per request.',
      example: [
        {
          // Base pulse information
          timestamp: '2024-01-01T12:00:00.000Z',
          ide_instance_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          ide_type: 'vscode',
          ide_version: '1.86.0',
          project_name: 'my-awesome-project',
          git_branch: 'main',
          activity_type: 'coding',
          duration_seconds: 120,
          // Core activity metrics
          line_additions: 15,
          line_deletions: 3,
          cursor_position: 1250,
          file_path: 'src/components/ActivityTracker.tsx',
          language_id: 'typescript',
          window_focused: true,
          // AI usage metrics
          ai_chat_active: false,
          ai_queries_count: 0,
          ai_response_received: false,
          ai_suggestions_shown: 0,
          ai_suggestions_accepted: 0,
          ai_time_spent_seconds: 0,
          ai_model_used: '',
          ai_conversation_length: 0,
          // Workspace metrics
          open_files_count: 8,
          terminal_active: false,
          debugger_active: false,
          extensions_count: 25,
          workspace_files_count: 342,
          active_panel: 'editor',
          split_editors_count: 2,
          // Productivity metrics
          keystroke_frequency: 85.5,
          file_switches_count: 3,
          scroll_distance: 2400,
          error_count: 1,
          warning_count: 3,
          uninterrupted_duration: 90,
          pause_duration_avg: 2.5,
          typing_speed_wpm: 45.2,
          deep_work_indicator: true,
          focus_session_count: 1,
          // Git metrics
          git_commits_today: 3,
          git_branches_switched: 0,
          git_files_staged: 2,
          git_merge_conflicts: 0,
          git_last_commit_time: '2024-01-01T11:30:00.000Z',
          git_repo_status: 'clean',
          // Debug metrics
          debug_session_active: false,
          debug_sessions_today: 1,
          debug_time_today_seconds: 600,
          debug_breakpoints_set: 3,
          debug_commands_executed: 0,
          debug_session_duration: 0,
          debug_session_type: 'node',
          // IDE metrics
          command_palette_used: 2,
          shortcuts_used: 15,
          search_operations: 4,
          find_replace_operations: 1,
          quick_open_used: 6,
          intellisense_triggered: 28
        }
      ]
    })
}).openapi({
  ref: 'SyncRequest',
  description: 'Request payload for synchronizing comprehensive activity pulses with 58+ metrics fields from the IDE extension'
})

// Sync response schema
export const SyncResponseSchema = z.object({
  success: z.boolean().openapi({
    description: 'Whether the synchronization was successful',
    example: true
  }),
  
  processed_count: z.number().int().min(0).openapi({
    description: 'Number of pulses successfully processed and stored',
    example: 42
  }),
  
  synced_at: z.string().datetime().openapi({
    description: 'ISO 8601 timestamp when the sync was completed',
    example: '2024-01-01T12:00:00.000Z'
  })
}).openapi({
  ref: 'SyncResponse',
  description: 'Response returned after successful synchronization of comprehensive activity pulses'
})

// Validation schema for API request
export const SyncValidationSchema = SyncRequestSchema

// Sync /me endpoint response schema
export const SyncMeResponseSchema = z.object({
  user: z.object({
    uuid: z.string().uuid().openapi({
      description: 'Authenticated user UUID',
      example: 'b3b3b3b3-b3b3-4b3b-b3b3-b3b3b3b3b3b3'
    }),
    email: z.string().email().openapi({
      description: 'User email address',
      example: 'developer@example.com'
    }),
    name: z.string().openapi({
      description: 'User full name',
      example: 'John Developer'
    })
  }).openapi({
    description: 'Authenticated user information'
  }),
  
  service_status: z.object({
    authenticated: z.boolean().openapi({
      description: 'Whether the API key authentication was successful',
      example: true
    }),
    sync_service: z.literal('healthy').openapi({
      description: 'Sync service health status',
      example: 'healthy'
    }),
    clickhouse: z.literal('connected').openapi({
      description: 'ClickHouse database connectivity status',
      example: 'connected'
    }),
    timestamp: z.string().datetime().openapi({
      description: 'Response timestamp',
      example: '2024-01-15T12:00:00.000Z'
    })
  }).openapi({
    description: 'Service and authentication status'
  })
}).openapi({
  ref: 'SyncMeResponse',
  description: 'Response for the /sync/me endpoint with user info and service status'
})

// ===============================
// TYPE EXPORTS
// ===============================

// Type exports for use in other modules
export type SyncRequestInput = z.infer<typeof SyncRequestSchema> 