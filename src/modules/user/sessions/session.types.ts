export interface UserSession {
  id: number;
  uuid: string;
  userId: number;
  token: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
  lastUsedAt: Date;
  deletedAt?: Date | null;
}

export type UserSessionPublic = Omit<UserSession, 'id' | 'token' | 'userId'>; 

/**
 * Database row interface for session queries
 */
export interface SessionDbRow {
  id: number;
  uuid: string;
  user_id: number;
  token: string;
  user_agent?: string;
  ip_address?: string;
  created_at: Date;
  expires_at: Date;
  revoked_at?: Date | null;
  last_used_at: Date;
  deleted_at?: Date | null;
} 