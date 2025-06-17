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