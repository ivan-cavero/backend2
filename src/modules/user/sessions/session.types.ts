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