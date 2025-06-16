import { CONFIG } from '@/config'
import { logger } from '@/utils/logger'
import type { GoogleUser } from '../auth.types'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

export const getGoogleOAuthUrl = (): string => {
  const params = new URLSearchParams({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    redirect_uri: `${CONFIG.BASE_URL}:${CONFIG.PORT}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent'
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export const getGoogleTokens = async (code: string): Promise<{ access_token: string; id_token: string; refresh_token?: string }> => {
  const params = new URLSearchParams({
    code,
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    client_secret: CONFIG.GOOGLE_CLIENT_SECRET,
    redirect_uri: `${CONFIG.BASE_URL}:${CONFIG.PORT}/api/auth/google/callback`,
    grant_type: 'authorization_code'
  })
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  })
  if (!response.ok) {
    const errorBody = await response.text()
    logger.error('Failed to fetch Google tokens:', errorBody)
    throw new Error('Failed to fetch Google tokens')
  }
  return response.json() as Promise<{ access_token: string; id_token: string; refresh_token?: string }>
}

export const getGoogleUserProfile = async (accessToken: string): Promise<GoogleUser> => {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!response.ok) {
    const errorBody = await response.text()
    logger.error('Failed to fetch Google user profile:', errorBody)
    throw new Error('Failed to fetch Google user profile')
  }
  return response.json() as Promise<GoogleUser>
} 