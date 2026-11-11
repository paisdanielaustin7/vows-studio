import { describe, it, expect } from 'vitest';
import {
  executeResetSchema,
  dryRunResetSchema,
  lockSetupSchema,
  anonymiseClientSchema,
} from '@/lib/validations/data-management.schema';

describe('Data Management & Reset Wizard Schema & Security Verification', () => {
  describe('executeResetSchema', () => {
    it('accepts valid input with exact confirmation phrase RESET VOWS DATA and password', () => {
      const valid = executeResetSchema.safeParse({
        scopes: ['clients_and_dependants', 'finance_only'],
        restartNumbering: true,
        clearAuditLog: false,
        password: 'super-admin-secure-password',
        confirmationPhrase: 'RESET VOWS DATA',
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.scopes).toEqual(['clients_and_dependants', 'finance_only']);
        expect(valid.data.confirmationPhrase).toBe('RESET VOWS DATA');
        expect(valid.data.restartNumbering).toBe(true);
      }
    });

    it('rejects input with lowercase or partial confirmation phrase', () => {
      const lowercase = executeResetSchema.safeParse({
        scopes: ['finance_only'],
        password: 'password123',
        confirmationPhrase: 'reset vows data',
      });
      expect(lowercase.success).toBe(false);

      const partial = executeResetSchema.safeParse({
        scopes: ['finance_only'],
        password: 'password123',
        confirmationPhrase: 'RESET VOWS',
      });
      expect(partial.success).toBe(false);
    });

    it('rejects input with empty password', () => {
      const emptyPw = executeResetSchema.safeParse({
        scopes: ['finance_only'],
        password: '',
        confirmationPhrase: 'RESET VOWS DATA',
      });
      expect(emptyPw.success).toBe(false);
    });

    it('rejects input with empty scopes array', () => {
      const noScopes = executeResetSchema.safeParse({
        scopes: [],
        password: 'password123',
        confirmationPhrase: 'RESET VOWS DATA',
      });
      expect(noScopes.success).toBe(false);
    });
  });

  describe('dryRunResetSchema', () => {
    it('accepts valid dry run inputs with defaults', () => {
      const res = dryRunResetSchema.safeParse({
        scopes: ['catalogue', 'crew'],
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.restartNumbering).toBe(false);
        expect(res.data.clearAuditLog).toBe(false);
      }
    });

    it('rejects dry run with zero scopes', () => {
      const res = dryRunResetSchema.safeParse({
        scopes: [],
      });
      expect(res.success).toBe(false);
    });
  });

  describe('lockSetupSchema', () => {
    it('accepts exact phrase LOCK SETUP', () => {
      const res = lockSetupSchema.safeParse({
        confirmPhrase: 'LOCK SETUP',
      });
      expect(res.success).toBe(true);
    });

    it('rejects incorrect phrases for setup locking', () => {
      const res = lockSetupSchema.safeParse({
        confirmPhrase: 'lock setup',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('anonymiseClientSchema', () => {
    it('accepts a valid UUID client identifier', () => {
      const res = anonymiseClientSchema.safeParse({
        clientId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });
      expect(res.success).toBe(true);
    });

    it('rejects malformed client identifiers', () => {
      const res = anonymiseClientSchema.safeParse({
        clientId: 'not-a-uuid-1234',
      });
      expect(res.success).toBe(false);
    });
  });
});
