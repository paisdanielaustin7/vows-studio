import { z } from 'zod';

export const resetScopeEnum = z.enum([
  'clients_and_dependants',
  'finance_only',
  'crew',
  'catalogue',
  'portfolio_and_website',
  'notifications_activity',
  'sample_data_only',
]);

export type ResetScope = z.infer<typeof resetScopeEnum>;

export const dryRunResetSchema = z.object({
  scopes: z.array(resetScopeEnum).min(1, 'Please select at least one data partition to wipe'),
  restartNumbering: z.boolean().optional().default(false),
  clearAuditLog: z.boolean().optional().default(false),
});

export const executeResetSchema = z.object({
  scopes: z.array(resetScopeEnum).min(1, 'Please select at least one data partition to wipe'),
  restartNumbering: z.boolean().optional().default(false),
  clearAuditLog: z.boolean().optional().default(false),
  password: z.string().min(1, 'Administrator password is required for confirmation'),
  confirmationPhrase: z.literal('RESET VOWS DATA', {
    errorMap: () => ({ message: 'You must type the exact phrase "RESET VOWS DATA"' }),
  }),
});

export const lockSetupSchema = z.object({
  confirmPhrase: z.literal('LOCK SETUP', {
    errorMap: () => ({ message: 'You must type the exact confirmation phrase "LOCK SETUP"' }),
  }),
});

export const anonymiseClientSchema = z.object({
  clientId: z.string().uuid('Invalid client ID format'),
});

export type DryRunResetInput = z.infer<typeof dryRunResetSchema>;
export type ExecuteResetInput = z.infer<typeof executeResetSchema>;
export type LockSetupInput = z.infer<typeof lockSetupSchema>;
export type AnonymiseClientInput = z.infer<typeof anonymiseClientSchema>;
