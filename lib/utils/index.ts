/**
 * VOWS Studio — Core Utilities & Cryptographic Helpers (lib/utils)
 * 
 * Includes:
 * - IST date & time helpers (Asia/Kolkata)
 * - Indian Financial Year (FY) calculator (April-March)
 * - E.164 Indian mobile phone validator & formatter
 * - Cryptographically secure token generator & SHA-256 hasher
 * - Application-layer AES-256-GCM authenticated encryption with Key ID
 */

import crypto from 'crypto';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TIMEZONE_IST = 'Asia/Kolkata';

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Kolkata (IST).
 */
export function getTodayIST(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Evaluates the Indian Financial Year (FY) start year for a given date in IST.
 * Indian Financial Year runs from 1 April to 31 March.
 * E.g., 2026-04-01 -> FY 2026; 2027-03-31 -> FY 2026; 2026-03-31 -> FY 2025.
 */
export function getFinancialYear(inputDate?: Date | string): number {
  const d = inputDate ? (typeof inputDate === 'string' ? new Date(inputDate) : inputDate) : new Date();

  // Extract year and month in IST
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_IST,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(d);

  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '0', 10);
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '0', 10);

  // If month is Jan(1), Feb(2), or Mar(3), the FY began in April of the previous calendar year.
  return month < 4 ? year - 1 : year;
}

/**
 * Normalizes an Indian mobile phone number into strict E.164 format (+91XXXXXXXXXX).
 * Throws an error if invalid.
 */
export function formatPhoneE164(phone: string, defaultCountryCode = '91'): string {
  const cleaned = phone.replace(/[^\d+]/g, '');

  if (!cleaned) {
    throw new Error('Phone number cannot be empty');
  }

  let digits = cleaned;
  if (cleaned.startsWith('+')) {
    digits = cleaned.slice(1);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    // 0 followed by 10 digit Indian mobile
    digits = defaultCountryCode + cleaned.slice(1);
  } else if (cleaned.length === 10) {
    digits = defaultCountryCode + cleaned;
  }

  // Validate Indian mobile numbers (starts with +91 and 10 digits starting 6, 7, 8, or 9)
  if (digits.startsWith('91')) {
    const local = digits.slice(2);
    if (!/^[6-9]\d{9}$/.test(local)) {
      throw new Error(`Invalid Indian mobile number: ${phone}`);
    }
    return `+91${local}`;
  }

  // Generic international fallback (minimum 8 digits, maximum 15 digits)
  if (!/^\d{8,15}$/.test(digits)) {
    throw new Error(`Invalid phone number: ${phone}`);
  }

  return `+${digits}`;
}

/**
 * Generates a high-entropy 256-bit (32 bytes) cryptographically secure random token (hex).
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Returns the SHA-256 hash (hex) of a given token.
 * Used for storing invitation, review, and delivery share tokens safely.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Timing-safe constant-time comparison of two strings to prevent timing attacks.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * AES-256-GCM Authenticated Encryption for sensitive credentials.
 * Serialized output format: "v1:<keyId>:<ivHex>:<authTagHex>:<ciphertextHex>"
 * 
 * @param plaintext String to encrypt
 * @param key 32-byte key (either 64-char hex string or 32-byte buffer)
 * @param keyId Key version identifier (e.g. 'k1')
 */
export function encryptSecret(
  plaintext: string,
  key: string | Buffer,
  keyId = 'v1'
): string {
  const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
  if (keyBuffer.length !== 32) {
    throw new Error('AES-256-GCM key must be exactly 32 bytes (64 hex characters)');
  }

  // 12-byte IV recommended for AES-GCM
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    'v1',
    keyId,
    iv.toString('hex'),
    authTag.toString('hex'),
    ciphertext.toString('hex'),
  ].join(':');
}

/**
 * AES-256-GCM Authenticated Decryption.
 * Rejects tampered ciphertexts or invalid auth tags.
 */
export function decryptSecret(encryptedPayload: string, key: string | Buffer): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 5 || parts[0] !== 'v1') {
    throw new Error('Invalid encrypted payload format');
  }

  const [, , ivHex, authTagHex, ciphertextHex] = parts;
  const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;

  if (keyBuffer.length !== 32) {
    throw new Error('AES-256-GCM key must be exactly 32 bytes (64 hex characters)');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
