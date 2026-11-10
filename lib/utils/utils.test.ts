import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  getTodayIST,
  getFinancialYear,
  formatPhoneE164,
  generateSecureToken,
  hashToken,
  constantTimeCompare,
  encryptSecret,
  decryptSecret,
} from './index';

describe('lib/utils — Core Utilities & Cryptography', () => {
  describe('IST Date & Financial Year Helpers', () => {
    it('returns today date in YYYY-MM-DD format', () => {
      const today = getTodayIST();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('calculates Indian Financial Year correctly (1 April rollover in IST)', () => {
      // 1 April 2026 IST -> FY 2026
      expect(getFinancialYear('2026-04-01T00:00:00+05:30')).toBe(2026);
      // 31 March 2026 IST -> FY 2025
      expect(getFinancialYear('2026-03-31T23:59:59+05:30')).toBe(2025);
      // 15 November 2026 -> FY 2026
      expect(getFinancialYear('2026-11-15T12:00:00+05:30')).toBe(2026);
      // 15 January 2027 -> FY 2026
      expect(getFinancialYear('2027-01-15T12:00:00+05:30')).toBe(2026);
    });
  });

  describe('Phone E.164 Formatter', () => {
    it('formats 10-digit Indian numbers to +91', () => {
      expect(formatPhoneE164('9840012345')).toBe('+919840012345');
    });

    it('handles numbers with leading 0 or +91', () => {
      expect(formatPhoneE164('09840012345')).toBe('+919840012345');
      expect(formatPhoneE164('+91 98400 12345')).toBe('+919840012345');
      expect(formatPhoneE164('+91-98400-12345')).toBe('+919840012345');
    });

    it('formats international phone numbers and rejects invalid ones', () => {
      expect(formatPhoneE164('+14155552671')).toBe('+14155552671');
      expect(formatPhoneE164('+447911123456')).toBe('+447911123456');
      expect(() => formatPhoneE164('+1')).toThrow();
    });

    it('throws on invalid Indian numbers (e.g. starts with 1, 2, 3, 4, 5)', () => {
      expect(() => formatPhoneE164('1234567890')).toThrow();
      expect(() => formatPhoneE164('0123456789')).toThrow();
      expect(() => formatPhoneE164('')).toThrow();
    });
  });

  describe('Token Generation & Hashing', () => {
    it('generates 256-bit (64 hex char) random tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });

    it('hashes token with SHA-256', () => {
      const token = 'test-token-12345';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
    });

    it('performs timing-safe string comparison', () => {
      expect(constantTimeCompare('secret123', 'secret123')).toBe(true);
      expect(constantTimeCompare('secret123', 'secret999')).toBe(false);
      expect(constantTimeCompare('short', 'longer-string')).toBe(false);
    });
  });

  describe('AES-256-GCM Encryption / Decryption', () => {
    const key = crypto.randomBytes(32).toString('hex');

    it('encrypts and decrypts strings round-trip', () => {
      const secret = 'vows_super_secret_gmail_refresh_token_12345';
      const encrypted = encryptSecret(secret, key, 'k1');
      expect(encrypted).toMatch(/^v1:k1:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);

      const decrypted = decryptSecret(encrypted, key);
      expect(decrypted).toBe(secret);
    });

    it('fails to decrypt if payload has been tampered with', () => {
      const encrypted = encryptSecret('hello world', key, 'k1');
      const tampered = encrypted.slice(0, -2) + 'aa';
      expect(() => decryptSecret(tampered, key)).toThrow();
    });

    it('fails to decrypt with wrong key', () => {
      const encrypted = encryptSecret('hello world', key, 'k1');
      const wrongKey = crypto.randomBytes(32).toString('hex');
      expect(() => decryptSecret(encrypted, wrongKey)).toThrow();
    });

    it('rejects keys of invalid length', () => {
      expect(() => encryptSecret('data', 'short-key', 'k1')).toThrow();
      expect(() => decryptSecret('v1:k1:12:12:12', 'short-key')).toThrow();
      expect(() => decryptSecret('v2:k1:12:12:12', key)).toThrow();
      expect(() => decryptSecret('invalid-payload', key)).toThrow();
    });
  });
});
