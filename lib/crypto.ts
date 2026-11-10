import crypto from 'node:crypto';

// 32-byte fallback key for dev/test when GOOGLE_TOKEN_ENCRYPTION_KEY is not set
const DEFAULT_DEV_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function getEncryptionKey(): Buffer {
  const hex = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || DEFAULT_DEV_KEY;
  return Buffer.from(hex.padEnd(64, '0').slice(0, 64), 'hex');
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: `iv:tag:ciphertext` (all in hex).
 */
export function encryptString(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypts a ciphertext formatted as `iv:tag:ciphertext` using AES-256-GCM.
 */
export function decryptString(encryptedText: string): string {
  if (!encryptedText) return '';
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const [ivHex, tagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
