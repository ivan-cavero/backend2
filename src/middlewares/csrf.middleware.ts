import type { Context, Next } from 'hono'
import { HTTPException } from './errorHandler'
import { getCookie, setCookie } from 'hono/cookie'
import { CONFIG } from '@/config'

const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'x-csrf-token'

function generateToken(): string {
  const arr = new Uint8Array(24)
  globalThis.crypto.getRandomValues(arr)
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const csrfMiddleware = async (c: Context, next: Next) => {
  const method = c.req.method.toUpperCase()
  const safe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'

  // Skip CSRF validation for specific non-browser endpoints (e.g. IDE integrations)
  // These endpoints are designed to be called programmatically where CSRF is not a threat
  const path = c.req.path
  const csrfExemptRoutes: Array<{ method: string; path: string }> = [
    { method: 'POST', path: '/api/api-keys/verify' }
  ]

  if (csrfExemptRoutes.some((r) => r.method === method && r.path === path)) {
    await next()
    return
  }

  let token = getCookie(c, CSRF_COOKIE)

  // Issue token if missing (on safe requests)
  if (!token) {
    token = generateToken()
    setCookie(c, CSRF_COOKIE, token, {
      httpOnly: false, // must be readable by JS to echo back in header
      secure: CONFIG.NODE_ENV === 'production',
      sameSite: 'Lax',
      domain: CONFIG.NODE_ENV === 'production' ? '.timefly.dev' : undefined,
      path: '/'
    })
  }

  // For unsafe requests validate header
  if (!safe) {
    const header = c.req.header(CSRF_HEADER)
    if (!header || header !== token) {
      throw new HTTPException(403, { message: 'CSRF token missing or invalid' })
    }
  }

  await next()
} 