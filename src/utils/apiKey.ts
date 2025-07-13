import { Buffer } from 'node:buffer'

/**
 * Generates a secure, random API key with a consistent format.
 *
 * The API key consists of a prefix and a Base64URL-encoded random part.
 * This ensures the key is URL-safe and has a fixed length, improving
 * security and usability. It uses the Web Crypto API (`crypto.getRandomValues`)
 * for generating cryptographically strong random values.
 *
 * @param {string} [prefix='tfk_'] - The prefix for the API key. 'tfk' stands for 'TimeFly Key'.
 * @param {number} [bytes=24] - The number of random bytes to generate for the key. This provides 192 bits of entropy.
 * @returns {string} The generated API key.
 *
 * @example
 * const apiKey = generateApiKey();
 * console.log(apiKey); // "tfk_..."
 */
export const generateApiKey = (prefix = 'tfk_', bytes = 24): string => {
  const buffer = new Uint8Array(bytes)
  crypto.getRandomValues(buffer)
  const token = Buffer.from(buffer).toString('base64url')

  return `${prefix}${token}`
}

/**
 * Hashes an API key using Bun's password hashing API.
 *
 * We use 'argon2id' as it's a strong, memory-hard hashing algorithm
 * recommended for password and credential storage.
 *
 * @param apiKey - The raw API key to hash.
 * @returns A promise that resolves to the hashed API key.
 */
export const hashApiKey = (apiKey: string): Promise<string> => Bun.password.hash(apiKey, { algorithm: 'argon2id' }) 