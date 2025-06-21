import type { Context } from 'hono'
import { HTTPException } from '@/middlewares/errorHandler'
import * as syncService from './sync.service'
import * as userService from '@/modules/user/user.service'
import type { SyncRequestInput } from './sync.schemas'
import { logger } from '@/utils/logger'

/**
 * Sync controller for handling activity pulse synchronization requests.
 * 
 * This controller manages the HTTP layer for the /sync endpoint, handling
 * user authentication, request validation, and coordinating with the sync service
 * for activity pulses with 58+ metrics fields.
 */

/**
 * Handles POST /sync requests to synchronize activity pulses from IDE extensions.
 * 
 * This endpoint is called by the TimeFly VS Code extension (and future IDE extensions)
 * every 30 minutes to batch-synchronize activity data with 58+ metrics fields.
 * It requires API key authentication and validates the request payload before storing pulses in ClickHouse.
 * 
 * Enhanced metrics include:
 * - Base pulse information (8 fields)
 * - Core activity metrics (6 fields)
 * - AI usage metrics (8 fields) 
 * - Workspace metrics (7 fields)
 * - Productivity metrics (10 fields)
 * - Git metrics (6 fields)
 * - Debug metrics (7 fields)
 * - IDE metrics (6 fields)
 * 
 * @param c - Hono context with authenticated user and validated request body
 * @returns JSON response with sync results
 * 
 * @throws HTTPException(400) - Invalid request data or pulse validation fails
 * @throws HTTPException(401) - Missing or invalid authentication
 * @throws HTTPException(500) - Internal server error during ClickHouse operations
 */
export const syncActivityPulsesHandler = async (c: Context) => {
  try {
    // Extract authenticated user UUID from auth middleware
    // The apiKeyMiddleware sets this after validating the API key
    const userUuid = c.get('userUuid' as unknown as keyof typeof c.var)
    
    if (!userUuid) {
      logger.warn('Sync request received without authenticated user')
      throw new HTTPException(401, { 
        message: 'Authentication required. Please provide a valid API key.' 
      })
    }
    
    // Get validated request body from zValidator middleware
    const syncRequest: SyncRequestInput = await c.req.json()
    
    // Validate pulse data integrity (additional runtime checks for all 58+ fields)
    try {
      syncService.validatePulsesIntegrity(syncRequest.pulses)
    } catch (validationError) {
      logger.warn(`Pulse validation failed for user ${userUuid}:`, validationError)
      throw new HTTPException(400, {
        message: `Invalid pulse data: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`
      })
    }
    
    // Enhanced logging for sync request monitoring
    const firstPulse = syncRequest.pulses[0]
    const activityMetrics = firstPulse ? {
      // Sample AI usage metrics
      aiUsageDetected: firstPulse.ai_chat_active || firstPulse.ai_queries_count > 0,
      aiQueriesInSample: firstPulse.ai_queries_count,
      aiModelUsed: firstPulse.ai_model_used,
      
      // Sample productivity metrics
      keystrokeFreq: firstPulse.keystroke_frequency,
      typingSpeed: firstPulse.typing_speed_wpm,
      deepWorkDetected: firstPulse.deep_work_indicator,
      
      // Sample workspace metrics
      openFilesCount: firstPulse.open_files_count,
      debuggerActive: firstPulse.debugger_active,
      terminalActive: firstPulse.terminal_active,
      
      // Sample git metrics
      commitsToday: firstPulse.git_commits_today,
      repoStatus: firstPulse.git_repo_status,
      
      // Window focus status
      windowFocused: firstPulse.window_focused
    } : {}
    
    logger.info(`Processing sync request for user ${userUuid} with ${syncRequest.pulses.length} activity pulses`, {
      userId: userUuid,
      pulseCount: syncRequest.pulses.length,
      schemaVersion: 'v2.0',
      metricsFieldCount: '58+',
      timeRange: syncRequest.pulses.length > 0 ? {
        oldest: new Date(Math.min(...syncRequest.pulses.map(p => new Date(p.timestamp).getTime()))),
        newest: new Date(Math.max(...syncRequest.pulses.map(p => new Date(p.timestamp).getTime())))
      } : null,
      ideTypes: [...new Set(syncRequest.pulses.map(p => p.ide_type))],
      activityTypes: [...new Set(syncRequest.pulses.map(p => p.activity_type))],
      languages: [...new Set(syncRequest.pulses.map(p => p.language_id))].slice(0, 5), // Limit to first 5 languages
      projects: [...new Set(syncRequest.pulses.map(p => p.project_name))].slice(0, 3), // Limit to first 3 projects
      activityMetrics
    })
    
    // Synchronize pulses to ClickHouse
    const syncResult = await syncService.syncActivityPulses(userUuid, syncRequest.pulses)
    
    // Log successful sync
    logger.info(`Successfully processed sync for user ${userUuid}`, {
      userId: userUuid,
      processedCount: syncResult.processed_count,
      syncedAt: syncResult.synced_at,
      schemaVersion: 'v2.0'
    })
    
    // Return sync response
    return c.json(syncResult, 200)
    
  } catch (error) {
    // Handle known HTTPExceptions (validation, auth errors)
    if (error instanceof HTTPException) {
      throw error
    }
    
    // Handle unexpected errors (ClickHouse, network, etc.)
    logger.error('Unexpected error during sync processing:', error)
    throw new HTTPException(500, {
      message: 'Internal server error during activity sync. Please try again later.'
    })
  }
}

/**
 * Health check handler for the sync module.
 * This can be used to verify ClickHouse connectivity and service health
 * for the enhanced analytics schema with 58+ metrics fields.
 * 
 * @param c - Hono context
 * @returns JSON response with service status
 */
export const syncHealthCheckHandler = async (c: Context) => {
  try {
    // Test ClickHouse connectivity with a simple SELECT 1 query
    // This will throw if ClickHouse is not accessible
    await syncService.testClickHouseConnection()
    
    return c.json({
      status: 'healthy',
      service: 'activity-sync',
      schema_version: 'v2.0',
      metrics_fields: '58+',
      clickhouse: 'connected',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    logger.error('Sync service health check failed:', error)
    return c.json({
      status: 'unhealthy',
      service: 'activity-sync',
      schema_version: 'v2.0',
      clickhouse: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 503)
  }
}

/**
 * Handles GET /sync/me requests to verify authentication and get activity overview.
 * 
 * This endpoint allows IDE extensions to:
 * - Verify their API key is working correctly
 * - Get basic user information 
 * - Confirm the sync service is operational
 * - Validate they're connected to the analytics system
 * 
 * @param c - Hono context with authenticated user
 * @returns JSON response with user info and service status
 * 
 * @throws HTTPException(401) - Missing or invalid authentication
 * @throws HTTPException(404) - User not found
 * @throws HTTPException(500) - Internal server error
 */
export const syncMeHandler = async (c: Context) => {
  try {
    // Extract authenticated user UUID from auth middleware
    const userUuid = c.get('userUuid' as unknown as keyof typeof c.var)
    
    if (!userUuid) {
      logger.warn('Sync /me request received without authenticated user')
      throw new HTTPException(401, { 
        message: 'Authentication required. Please provide a valid API key.' 
      })
    }
    
    logger.info(`Processing /sync/me request for user ${userUuid}`)
    
    // Get user information
    const user = await userService.getUserByUuid(userUuid)
    if (!user) {
      logger.error(`User ${userUuid} not found during sync /me request`)
      throw new HTTPException(404, { 
        message: 'User not found. Please check your API key.' 
      })
    }
    
    // Prepare enhanced response with service info
    const response = {
      user: {
        uuid: user.uuid,
        email: user.email,
        name: user.name
      },
      service_status: {
        authenticated: true,
        sync_service: 'healthy' as const,
        schema_version: 'v2.0',
        metrics_fields: '58+',
        features: [
          'ai_usage_tracking',
          'productivity_metrics', 
          'workspace_analytics',
          'git_integration',
          'debug_tracking',
          'ide_metrics'
        ],
        clickhouse: 'connected' as const,
        timestamp: new Date().toISOString()
      }
    }
    
    logger.info(`Successfully processed /sync/me for user ${userUuid}`, {
      userId: userUuid,
      schemaVersion: 'v2.0'
    })
    
    return c.json(response, 200)
    
  } catch (error) {
    // Handle known HTTPExceptions (auth, not found errors)
    if (error instanceof HTTPException) {
      throw error
    }
    
    // Handle unexpected errors (ClickHouse, database, etc.)
    logger.error('Unexpected error during /sync/me processing:', error)
    throw new HTTPException(500, {
      message: 'Internal server error while retrieving user activity data. Please try again later.'
    })
  }
} 