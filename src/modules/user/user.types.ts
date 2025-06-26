export interface User {
  id?: number;
  uuid: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  providerIdentities?: {
    provider: string;
    providerUserId: string;
  }[];
}

/**
 * Database row interface for user queries
 */
export interface UserDbRow {
  id: number;
  uuid: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  provider_identities?: Array<{ provider: string; providerUserId: string }>;
}
