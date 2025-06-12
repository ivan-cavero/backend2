import type { Context } from 'hono'

import { HTTPException } from 'hono/http-exception'

/**
 * Custom error handler to catch and format exceptions.
 * @param err The error caught by Hono.
 * @param c The Hono context.
 * @returns A formatted JSON error response.
 */
/**
 * Custom Not Found handler to return a standardized JSON 404 error.
 * @param c The Hono context.
 * @returns A formatted JSON 404 error response.
 */
export const notFoundHandler = (c: Context) => {
  return c.json(
    {
      ok: false,
      error: {
        message: `Not Found: The requested URL ${c.req.path} was not found on this server.`,
        status: 404,
      },
    },
    404
  )
}

export const errorHandler = (err: Error, c: Context) => {

  if (err instanceof HTTPException) {
    // Use the status and message from the HTTPException
    return c.json(
      {
        ok: false,
        error: {
          message: err.message,
          status: err.status,
        },
      },
      err.status
    )
  }

  // For all other errors, log them and return a generic 500 error
  console.error('Unhandled Error:', err)
  // In the future, you can add logging to a service like ClickHouse here.

  return c.json(
    {
      ok: false,
      error: {
        message: 'Internal Server Error',
        status: 500,
      },
    },
    500
  )
}

// Re-export HTTPException for convenience, so it can be imported from this module
export { HTTPException }
