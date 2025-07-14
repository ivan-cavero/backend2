import type { Context, Next } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

// Reuse hono's secureHeaders and add our custom CSP in one step
const _secureHeaders = secureHeaders()

const CSP_VALUE = "default-src 'self'; img-src 'self' data: https://cdn.jsdelivr.net; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https: data:"

export const securityHeadersMiddleware = async (c: Context, next: Next) => {
  // Execute bundled secure headers first, then add CSP and proceed
  await _secureHeaders(c, async () => {
    c.header('Content-Security-Policy', CSP_VALUE)
    await next()
  })
} 