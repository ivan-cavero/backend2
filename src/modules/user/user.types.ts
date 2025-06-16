export interface User {
  id?: number; // Internal application user ID (autoincremental, not exposed to frontend)
  uuid: string; // External UUID para exponer al frontend
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date; // Para soft delete
  providerIdentities?: {
    provider: string;
    providerUserId: string;
  }[];
}

export interface ProviderIdentity {
  uuid: string;
  provider: string;
  providerUserId: string;
  providerEmail?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}
