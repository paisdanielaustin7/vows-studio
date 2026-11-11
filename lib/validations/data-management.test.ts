import { describe, it, expect } from 'vitest';
import {
  resetScopeEnum,
  dryRunResetSchema,
  executeResetSchema,
  lockSetupSchema,
  anonymiseClientSchema,
} from './data-management.schema';

describe('Data Management & Reset Wizard Validation Schemas (Phase 9)', () => {
  describe('resetScopeEnum', () => {
    it('accepts all 7 valid reset scopes', () => {
      const validScopes = [
        'clients_and_dependants',
        'finance_only',
        'crew',
        'catalogue',
        'portfolio_and_website',
        'notifications_activity',
        'sample_data_only',
      ] as const;

      validScopes.forEach((scope) => {
        expect(resetScopeEnum.parse(scope)).toBe(scope);
      });
    });

    it('rejects invalid scope string', () => {
      expect(() => resetScopeEnum.parse('all_databases')).toThrow();
      expect(() => resetScopeEnum.parse('')).toThrow();
    });
  });

  describe('dryRunResetSchema', () => {
    it('accepts valid scopes and sets default options', () => {
      const parsed = dryRunResetSchema.parse({
        scopes: ['clients_and_dependants', 'finance_only'],
      });
      expect(parsed.scopes).toEqual(['clients_and_dependants', 'finance_only']);
      expect(parsed.restartNumbering).toBe(false);
      expect(parsed.clearAuditLog).toBe(false);
    });

    it('rejects empty scopes array', () => {
      expect(() =>
        dryRunResetSchema.parse({
          scopes: [],
        })
      ).toThrow(/Please select at least one data partition/);
    });
  });

  describe('executeResetSchema', () => {
    const validExecution = {
      scopes: ['sample_data_only'],
      password: 'correct-admin-password',
      confirmationPhrase: 'RESET VOWS DATA',
      restartNumbering: true,
      clearAuditLog: true,
    };

    it('accepts valid reset execution parameters', () => {
      const parsed = executeResetSchema.parse(validExecution);
      expect(parsed.scopes).toEqual(['sample_data_only']);
      expect(parsed.password).toBe('correct-admin-password');
      expect(parsed.confirmationPhrase).toBe('RESET VOWS DATA');
      expect(parsed.restartNumbering).toBe(true);
      expect(parsed.clearAuditLog).toBe(true);
    });

    it('rejects incorrect confirmation phrase', () => {
      expect(() =>
        executeResetSchema.parse({
          ...validExecution,
          confirmationPhrase: 'reset vows data', // lower case
        })
      ).toThrow(/RESET VOWS DATA/);

      expect(() =>
        executeResetSchema.parse({
          ...validExecution,
          confirmationPhrase: 'DELETE EVERYTHING',
        })
      ).toThrow(/RESET VOWS DATA/);
    });

    it('rejects missing password', () => {
      expect(() =>
        executeResetSchema.parse({
          ...validExecution,
          password: '',
        })
      ).toThrow(/Administrator password is required/);
    });

    it('rejects empty scopes', () => {
      expect(() =>
        executeResetSchema.parse({
          ...validExecution,
          scopes: [],
        })
      ).toThrow(/Please select at least one data partition/);
    });
  });

  describe('lockSetupSchema', () => {
    it('accepts exact LOCK SETUP confirmation phrase', () => {
      const parsed = lockSetupSchema.parse({
        confirmPhrase: 'LOCK SETUP',
      });
      expect(parsed.confirmPhrase).toBe('LOCK SETUP');
    });

    it('rejects invalid confirmation phrase for lock setup', () => {
      expect(() =>
        lockSetupSchema.parse({
          confirmPhrase: 'lock setup',
        })
      ).toThrow(/LOCK SETUP/);

      expect(() =>
        lockSetupSchema.parse({
          confirmPhrase: 'CONFIRM',
        })
      ).toThrow(/LOCK SETUP/);
    });
  });

  describe('anonymiseClientSchema', () => {
    it('accepts valid UUID clientId', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const parsed = anonymiseClientSchema.parse({ clientId: validUuid });
      expect(parsed.clientId).toBe(validUuid);
    });

    it('rejects invalid UUID format for client anonymisation', () => {
      expect(() =>
        anonymiseClientSchema.parse({ clientId: 'invalid-client-uuid' })
      ).toThrow(/Invalid client ID format/);
    });
  });
});
