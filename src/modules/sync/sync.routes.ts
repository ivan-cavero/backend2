import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { zValidator } from '@hono/zod-validator'
import {
  syncActivityPulsesHandler,
  syncHealthCheckHandler,
  syncMeHandler
} from './sync.controller'
import { SyncValidationSchema } from './sync.schemas'
import { apiKeyAuthMiddleware } from '@/middlewares/apiKey.middleware'

const syncRoutes = new Hono()

/**
 * POST /sync - Synchronize activity pulses from IDE extensions
 * 
 * This is the core endpoint for TimeFly's activity tracking system.
 * IDE extensions (VS Code, Cursor, etc.) send batched activity data every 30 minutes.
 * Requires API key authentication and validates 58+ metrics fields before storage in ClickHouse.
 */
syncRoutes.post(
  '/',
  describeRoute({
    tags: ['Activity Sync'],
    summary: 'Synchronize activity pulses with 58+ metrics from IDE extension',
    description:
      '**Core endpoint for TimeFly activity tracking system**\n\n' +
      'This endpoint receives batched activity pulses from IDE extensions every 30 minutes. ' +
      'Each pulse contains 58+ metrics fields across multiple categories.\n\n' +
      '**📊 Metrics Categories:**\n' +
      '- Base Pulse Information (8 fields): timestamp, IDE info, project details\n' +
      '- Core Activity Metrics (6 fields): line changes, cursor position, language\n' +
      '- AI Usage Metrics (8 fields): chat activity, suggestions, model usage\n' +
      '- Workspace Metrics (7 fields): open files, terminal, debugger status\n' +
      '- Productivity Metrics (10 fields): typing speed, focus sessions, errors\n' +
      '- Git Metrics (6 fields): commits, branch switches, repository status\n' +
      '- Debug Metrics (7 fields): session info, breakpoints, debug time\n' +
      '- IDE Metrics (6 fields): command palette, shortcuts, IntelliSense\n\n' +
      '**🔧 Supported IDEs:**\n' +
      '- VS Code (full support)\n' +
      '- Cursor (full support)\n' +
      '- Windsurf (full support)\n' +
      '- IntelliJ, Visual Studio (future support)\n\n' +
      '**💡 Usage:**\n' +
      'Your IDE extension should batch activity data and send it here every 30 minutes.\n\n' +
      '**Request body for synchronizing activity pulses**\n\n' +
      'Send an object containing an array of activity pulses with 58+ metrics fields:\n\n' +
      '```json\n' +
      '{\n' +
      '  "pulses": [\n' +
      '    {\n' +
      '      "timestamp": "2024-01-15T10:30:00.000Z",\n' +
      '      "ide_instance_id": "vscode-session-123",\n' +
      '      "ide_type": "vscode",\n' +
      '      "ide_version": "1.85.0",\n' +
      '      "project_name": "my-awesome-project",\n' +
      '      "git_branch": "feature/new-feature",\n' +
      '      "activity_type": "coding",\n' +
      '      "duration_seconds": 120,\n' +
      '      "line_additions": 15,\n' +
      '      "line_deletions": 3,\n' +
      '      "cursor_position": 1250,\n' +
      '      "file_path": "src/components/MyComponent.tsx",\n' +
      '      "language_id": "typescript",\n' +
      '      "window_focused": true,\n' +
      '      "ai_chat_active": false,\n' +
      '      "ai_queries_count": 0,\n' +
      '      "ai_response_received": false,\n' +
      '      "ai_suggestions_shown": 5,\n' +
      '      "ai_suggestions_accepted": 2,\n' +
      '      "ai_time_spent_seconds": 0,\n' +
      '      "ai_model_used": "copilot",\n' +
      '      "ai_conversation_length": 0,\n' +
      '      "open_files_count": 8,\n' +
      '      "terminal_active": false,\n' +
      '      "debugger_active": false,\n' +
      '      "extensions_count": 25,\n' +
      '      "workspace_files_count": 156,\n' +
      '      "active_panel": "editor",\n' +
      '      "split_editors_count": 1,\n' +
      '      "keystroke_frequency": 45.2,\n' +
      '      "file_switches_count": 2,\n' +
      '      "scroll_distance": 1200,\n' +
      '      "error_count": 0,\n' +
      '      "warning_count": 1,\n' +
      '      "uninterrupted_duration": 115,\n' +
      '      "pause_duration_avg": 2.5,\n' +
      '      "typing_speed_wpm": 65,\n' +
      '      "deep_work_indicator": true,\n' +
      '      "focus_session_count": 1\n' +
      '      // ... + 20 more metrics fields\n' +
      '    }\n' +
      '  ]\n' +
      '}\n' +
      '```',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              pulses: {
                type: 'array',
                items: {
                  type: 'object',
                  description: 'Activity pulse with 58+ metrics fields'
                }
              }
            },
            required: ['pulses']
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Pulses synchronized successfully - all 58+ metrics fields processed',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                processed_count: { type: 'number' },
                synced_at: { type: 'string', format: 'date-time' },
                schema_version: { type: 'string' }
              }
            }
          }
        }
      },
      400: {
        description: 'Invalid request data or pulse validation failed',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      },
      401: {
        description: 'Unauthorized - missing or invalid API key',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      },
      413: {
        description: 'Payload too large (>1000 pulses)',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      },
      500: {
        description: 'Internal server error during ClickHouse data operation',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      }
    },
    security: [{ apiKey: [] }]
  }),
  apiKeyAuthMiddleware,
  // Validate request body against sync schema
  zValidator('json', SyncValidationSchema),
  // Handle the sync request
  syncActivityPulsesHandler
)

/**
 * GET /sync/me - Verify authentication and get service status
 * 
 * This endpoint allows IDE extensions to verify their API key is working
 * and confirm connection to the analytics system.
 */
syncRoutes.get(
  '/me',
  describeRoute({
    tags: ['Activity Sync'],
    summary: 'Verify authentication and get service status',
    description:
      '**Authentication verification and service status endpoint**\n\n' +
      'IDE extensions can use this endpoint to verify their API key is working correctly ' +
      'and confirm connection to the analytics system.\n\n' +
      '**Returns:**\n' +
      '- User account information\n' +
      '- Service status confirmation\n' +
      '- Schema version (v2.0)\n' +
      '- Supported metrics count (58+ fields)\n\n' +
      '**Use Cases:**\n' +
      '- Extension startup verification\n' +
      '- Periodic health checks\n' +
      '- Troubleshooting connection issues\n\n' +
      '**Note:** This endpoint does not store any data, it only verifies authentication.',
    responses: {
      200: {
        description: 'Authentication successful with user info and service status',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    uuid: { type: 'string' },
                    email: { type: 'string' },
                    name: { type: 'string' }
                  }
                },
                service: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    schema_version: { type: 'string' },
                    metrics_fields: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      },
      401: {
        description: 'Unauthorized - missing or invalid API key',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      },
      404: {
        description: 'User not found for the provided API key',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      },
      500: {
        description: 'Internal server error during data retrieval',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              }
            }
          }
        }
      }
    },
    security: [{ apiKey: [] }]
  }),
  apiKeyAuthMiddleware,
  syncMeHandler
)

/**
 * GET /sync/health - Health check for sync service
 * 
 * Used by monitoring systems and load balancers to verify analytics capability.
 */
syncRoutes.get(
  '/health',
  describeRoute({
    tags: ['Activity Sync'],
    summary: 'Health check for sync service with 58+ metrics support',
    description:
      '**Service health monitoring endpoint**\n\n' +
      'This endpoint performs a health check on the sync service ' +
      'and confirms operational status of the analytics system.\n\n' +
      '**Checks Performed:**\n' +
      '- ClickHouse database connectivity\n' +
      '- Schema availability (v2.0)\n' +
      '- Service configuration validity\n\n' +
      '**Use Cases:**\n' +
      '- Load balancer health checks\n' +
      '- Monitoring system alerts\n' +
      '- Analytics readiness verification\n\n' +
      '**Returns 503 if unhealthy** - Use this for automated monitoring.',
    responses: {
      200: {
        description: 'Sync service is healthy and operational',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['healthy'] },
                service: { type: 'string', enum: ['activity-sync'] },
                schema_version: { type: 'string', enum: ['v2.0'] },
                metrics_fields: { type: 'string', description: 'Number of metrics fields supported' },
                clickhouse: { type: 'string', enum: ['connected'] },
                timestamp: { type: 'string', format: 'date-time' }
              },
              example: {
                status: 'healthy',
                service: 'activity-sync',
                schema_version: 'v2.0',
                metrics_fields: '58+',
                clickhouse: 'connected',
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        }
      },
      503: {
        description: 'Sync service is unhealthy or ClickHouse is disconnected',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['unhealthy'] },
                service: { type: 'string', enum: ['activity-sync'] },
                schema_version: { type: 'string', enum: ['v2.0'] },
                clickhouse: { type: 'string', enum: ['disconnected'] },
                error: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    }
  }),
  syncHealthCheckHandler
)

export default syncRoutes 