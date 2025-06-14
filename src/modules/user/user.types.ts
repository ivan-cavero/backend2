export interface User {
  id?: number; // Internal application user ID (autoincremental, not exposed to frontend)
  uuid: string; // External UUID para exponer al frontend
  googleId?: string; // Google's unique user ID
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date; // Para soft delete
}
