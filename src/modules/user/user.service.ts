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

interface SoftDeleteOptions {
  hardDelete?: boolean;
}

/**
 * Finds a user by their Google ID or email. If not found, creates a new user.
 * This is a mock implementation using an in-memory array.
 * @param params - User data from Google profile.
 * @returns The found or newly created user.
 */
export const findOrCreateUser = async (params: FindOrCreateUserParams): Promise<User> => {
  const existingUser = users.find(
    (user) => 
      (user.googleId === params.googleId || user.email === params.email) && 
      !user.deletedAt
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
    id: nextId++,
    uuid: Bun.randomUUIDv7(), // Usamos UUIDv7 de Bun que es más moderno y eficiente
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

/**
 * Finds a user by their internal ID.
 * @param id - The internal ID of the user.
 * @returns The user if found, undefined otherwise.
 */
export const findUserById = async (id: number): Promise<User | undefined> => {
  return users.find(user => user.id === id && !user.deletedAt);
};

/**
 * Finds a user by their UUID.
 * @param uuid - The UUID of the user.
 * @returns The user if found, undefined otherwise.
 */
export const findUserByUuid = async (uuid: string): Promise<User | undefined> => {
  return users.find(user => user.uuid === uuid && !user.deletedAt);
};

/**
 * Soft deletes a user by their internal ID.
 * @param id - The internal ID of the user.
 * @param options - Options for deletion.
 * @returns True if the user was deleted, false otherwise.
 */
export const deleteUser = async (id: number, options: SoftDeleteOptions = {}): Promise<boolean> => {
  const userIndex = users.findIndex(user => user.id === id && !user.deletedAt);
  
  if (userIndex === -1) {
    return false;
  }
  
  if (options.hardDelete) {
    // Hard delete - remove from array
    users.splice(userIndex, 1);
  } else {
    // Soft delete - mark as deleted
    users[userIndex].deletedAt = new Date();
  }
  
  return true;
};

/**
 * Soft deletes a user by their UUID.
 * @param uuid - The UUID of the user.
 * @param options - Options for deletion.
 * @returns True if the user was deleted, false otherwise.
 */
export const deleteUserByUuid = async (uuid: string, options: SoftDeleteOptions = {}): Promise<boolean> => {
  const userIndex = users.findIndex(user => user.uuid === uuid && !user.deletedAt);
  
  if (userIndex === -1) {
    return false;
  }
  
  if (options.hardDelete) {
    // Hard delete - remove from array
    users.splice(userIndex, 1);
  } else {
    // Soft delete - mark as deleted
    users[userIndex].deletedAt = new Date();
  }
  
  return true;
};

/**
 * Updates a user by their internal ID.
 * @param id - The internal ID of the user.
 * @param userData - The user data to update.
 * @returns The updated user if found, undefined otherwise.
 */
export const updateUser = async (id: number, userData: Partial<User>): Promise<User | undefined> => {
  const user = users.find(user => user.id === id && !user.deletedAt);
  
  if (!user) {
    return undefined;
  }
  
  // Update user properties
  Object.assign(user, userData, { updatedAt: new Date() });
  
  return user;
};

/**
 * Updates a user by their UUID.
 * @param uuid - The UUID of the user.
 * @param userData - The user data to update.
 * @returns The updated user if found, undefined otherwise.
 */
export const updateUserByUuid = async (uuid: string, userData: Partial<User>): Promise<User | undefined> => {
  const user = users.find(user => user.uuid === uuid && !user.deletedAt);
  
  if (!user) {
    return undefined;
  }
  
  // Update user properties
  Object.assign(user, userData, { updatedAt: new Date() });
  
  return user;
};

/**
 * Lists all active (non-deleted) users.
 * @returns Array of active users.
 */
export const listUsers = async (): Promise<User[]> => {
  return users.filter(user => !user.deletedAt);
};
