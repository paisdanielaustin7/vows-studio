import { z } from 'zod';

export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/;

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters long')
  .regex(
    passwordRegex,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const inviteUserSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(
    ['business_owner', 'manager', 'accountant', 'staff', 'crew_member'],
    {
      errorMap: () => ({
        message: 'System Administrator role cannot be assigned via invitation.',
      }),
    }
  ),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const acceptInviteSchema = z
  .object({
    token: z.string().min(10, 'Invalid invitation token'),
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export const mfaVerifySchema = z.object({
  code: z
    .string()
    .trim()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d+$/, 'Verification code must only contain numbers'),
});

export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
