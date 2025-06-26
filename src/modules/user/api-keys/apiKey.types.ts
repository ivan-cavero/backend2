import type { User } from '../user.types'

export interface UserApiKey {
  id: number;
  uuid: string;
  userId: number;
  apiKeyHash: string;
  label?: string;
  description?: string;
  createdAt: Date;
  lastUsedAt: Date;
  revokedAt?: Date | null;
  deletedAt?: Date | null;
}

// No exponer id, userId ni apiKeyHash
export type UserApiKeyPublic = Omit<UserApiKey, 'id' | 'userId' | 'apiKeyHash'>; 

/**
 * Database row interface for API key queries
 */
export interface ApiKeyDbRow {
  id: number;
  uuid: string;
  user_id: number;
  api_key_hash: string;
  label?: string;
  description?: string;
  created_at: Date;
  last_used_at: Date;
  revoked_at?: Date | null;
  deleted_at?: Date | null;
}

/**
 * API key verification response interface
 * Returns the validity status and associated user information (without internal ID)
 */
export interface ApiKeyVerificationResponse {
  valid: boolean;
  user: Omit<User, 'id'>;
  apiKeyUuid: string;
} 