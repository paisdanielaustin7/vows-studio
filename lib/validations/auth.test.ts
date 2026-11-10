import { describe, it, expect } from 'vitest';
import {
  passwordSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  inviteUserSchema,
  acceptInviteSchema,
  mfaVerifySchema,
  changePasswordSchema,
} from './auth.schema';

describe('Auth Validation Schemas', () => {
  describe('passwordSchema', () => {
    it('accepts strong passwords meeting all requirements', () => {
      const valid = passwordSchema.safeParse('VowsSecure2026!');
      expect(valid.success).toBe(true);
    });

    it('rejects passwords shorter than 12 characters', () => {
      const result = passwordSchema.safeParse('Short1!');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without uppercase letters', () => {
      const result = passwordSchema.safeParse('vowssecure2026!');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without lowercase letters', () => {
      const result = passwordSchema.safeParse('VOWSSECURE2026!');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without numbers', () => {
      const result = passwordSchema.safeParse('VowsSecurePass!');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without special characters', () => {
      const result = passwordSchema.safeParse('VowsSecure20260');
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('validates correct email and password', () => {
      const res = loginSchema.safeParse({
        email: 'user@vowsstudio.com',
        password: 'ValidPassword123!',
      });
      expect(res.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const res = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'Password123!',
      });
      expect(res.success).toBe(false);
    });

    it('rejects empty password', () => {
      const res = loginSchema.safeParse({
        email: 'user@vowsstudio.com',
        password: '',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('accepts valid email', () => {
      expect(forgotPasswordSchema.safeParse({ email: 'test@vows.com' }).success).toBe(true);
    });

    it('rejects invalid email', () => {
      expect(forgotPasswordSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('accepts matching valid passwords', () => {
      const res = resetPasswordSchema.safeParse({
        password: 'NewStrongPassword123!',
        confirmPassword: 'NewStrongPassword123!',
      });
      expect(res.success).toBe(true);
    });

    it('rejects non-matching passwords', () => {
      const res = resetPasswordSchema.safeParse({
        password: 'NewStrongPassword123!',
        confirmPassword: 'DifferentPassword123!',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('Passwords do not match');
      }
    });
  });

  describe('inviteUserSchema', () => {
    it('accepts valid invitation payload with allowed roles', () => {
      const roles = ['business_owner', 'manager', 'accountant', 'staff', 'crew_member'] as const;
      for (const role of roles) {
        const res = inviteUserSchema.safeParse({
          email: 'crew@vows.com',
          fullName: 'Jane Doe',
          role,
        });
        expect(res.success).toBe(true);
      }
    });

    it('rejects system_admin role in invitations', () => {
      const res = inviteUserSchema.safeParse({
        email: 'admin@vows.com',
        fullName: 'Admin User',
        role: 'system_admin',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe(
          'System Administrator role cannot be assigned via invitation.'
        );
      }
    });

    it('rejects short full name', () => {
      const res = inviteUserSchema.safeParse({
        email: 'user@vows.com',
        fullName: 'A',
        role: 'staff',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('acceptInviteSchema', () => {
    it('accepts valid payload', () => {
      const res = acceptInviteSchema.safeParse({
        token: 'token-with-sufficient-length-1234567890',
        fullName: 'Jane Doe',
        password: 'ValidStrongPassword123!',
        confirmPassword: 'ValidStrongPassword123!',
      });
      expect(res.success).toBe(true);
    });

    it('rejects mismatched password', () => {
      const res = acceptInviteSchema.safeParse({
        token: 'token-with-sufficient-length-1234567890',
        fullName: 'Jane Doe',
        password: 'ValidStrongPassword123!',
        confirmPassword: 'MismatchPassword123!',
      });
      expect(res.success).toBe(false);
    });

    it('rejects short token', () => {
      const res = acceptInviteSchema.safeParse({
        token: 'short',
        fullName: 'Jane Doe',
        password: 'ValidStrongPassword123!',
        confirmPassword: 'ValidStrongPassword123!',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('mfaVerifySchema', () => {
    it('accepts 6-digit numeric codes', () => {
      expect(mfaVerifySchema.safeParse({ code: '123456' }).success).toBe(true);
    });

    it('rejects codes not 6 digits', () => {
      expect(mfaVerifySchema.safeParse({ code: '12345' }).success).toBe(false);
      expect(mfaVerifySchema.safeParse({ code: '1234567' }).success).toBe(false);
    });

    it('rejects non-numeric characters', () => {
      expect(mfaVerifySchema.safeParse({ code: '12345a' }).success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('accepts matching new strong passwords', () => {
      const res = changePasswordSchema.safeParse({
        currentPassword: 'CurrentPassword123!',
        newPassword: 'BrandNewPassword123!',
        confirmNewPassword: 'BrandNewPassword123!',
      });
      expect(res.success).toBe(true);
    });

    it('rejects mismatched new passwords', () => {
      const res = changePasswordSchema.safeParse({
        currentPassword: 'CurrentPassword123!',
        newPassword: 'BrandNewPassword123!',
        confirmNewPassword: 'OtherPassword123!',
      });
      expect(res.success).toBe(false);
    });

    it('rejects empty current password', () => {
      const res = changePasswordSchema.safeParse({
        currentPassword: '',
        newPassword: 'BrandNewPassword123!',
        confirmNewPassword: 'BrandNewPassword123!',
      });
      expect(res.success).toBe(false);
    });
  });
});
