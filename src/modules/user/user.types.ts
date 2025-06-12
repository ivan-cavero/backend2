export interface User {
  id: string; // Internal application user ID
  googleId?: string; // Google's unique user ID
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
