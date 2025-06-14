import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

// Custom Not Found handler to return a standardized JSON 404 error.
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

// Custom error handler to catch and format exceptions.
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

// Re-export HTTPException for convenience
export { HTTPException }
