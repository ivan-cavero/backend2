/**
 * Extracts the real client IP address from a Hono Context.
 * Priority:
 *   1. Cloudflare header (cf-connecting-ip)
 *   2. Standard proxy header (x-forwarded-for)
 *   3. Bun's raw remoteAddr (if available)
 * Returns undefined if not found.
 *
 * Security best practices:
 * - Trust proxy headers only if you control the proxy (e.g., Cloudflare, your own Nginx).
 * - Never trust x-forwarded-for from the public internet directly.
 * - Always use HTTPS in production.
 */
import type { Context } from 'hono'

export function getClientIp(c: Context): string | undefined {
  // 1. Cloudflare
  const cfIp = c.req.header('cf-connecting-ip')
  if (cfIp) { return cfIp.trim() }

  // 2. Standard proxy
  const xForwardedFor = c.req.header('x-forwarded-for')
  if (xForwardedFor) {
    // May be a comma-separated list (client, proxy1, proxy2...)
    return xForwardedFor.split(',')[0].trim()
  }

  // 3. Bun's raw remoteAddr (if available)
  // @ts-ignore
  if (c.req.raw?.remoteAddr?.hostname) {
    // Bun's remoteAddr is an object with .hostname
    // @ts-ignore
    return c.req.raw.remoteAddr.hostname || undefined
  }

  // Not found
  return undefined
} 