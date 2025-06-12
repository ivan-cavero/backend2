import type { User } from './user.types';

// In-memory store to act as a mock database.
const users: User[] = [];
let nextId = 1;

interface FindOrCreateUserParams {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

/**
 * Finds a user by their Google ID or email. If not found, creates a new user.
 * This is a mock implementation using an in-memory array.
 * @param params - User data from Google profile.
 * @returns The found or newly created user.
 */
export const findOrCreateUser = async (params: FindOrCreateUserParams): Promise<User> => {
  const existingUser = users.find(
    (user) => user.googleId === params.googleId || user.email === params.email
  );

  if (existingUser) {
    // Optional: Update user data if it has changed (e.g., name or avatar).
    existingUser.name = params.name;
    existingUser.avatarUrl = params.avatarUrl;
    existingUser.updatedAt = new Date();
    return existingUser;
  }

  // Create a new user if not found.
  const newUser: User = {
    id: (nextId++).toString(),
    googleId: params.googleId,
    email: params.email,
    name: params.name,
    avatarUrl: params.avatarUrl,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  users.push(newUser);
  return newUser;
};
