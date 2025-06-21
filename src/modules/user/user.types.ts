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
