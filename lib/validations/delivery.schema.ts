import { z } from 'zod';

export const deliveryStageCodeSchema = z.enum([
  'raw_import',
  'culling',
  'editing',
  'client_preview',
  'revisions',
  'final_export',
  'quality_check',
  'delivery',
  'completed',
]);

export const deliveryStageStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'blocked',
]);

export const deliveryAttachmentKindSchema = z.enum(['link', 'file']);

export const updateStageStatusSchema = z
  .object({
    stageId: z.string().uuid('Invalid stage ID'),
    status: deliveryStageStatusSchema,
    blockedReason: z.string().trim().optional().nullable(),
    overrideReason: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'blocked') {
      if (!data.blockedReason || data.blockedReason.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A blocked reason is strictly required when marking a stage as blocked',
          path: ['blockedReason'],
        });
      }
    }
  });

export const assignStageStaffSchema = z.object({
  stageId: z.string().uuid('Invalid stage ID'),
  profileIds: z.array(z.string().uuid('Invalid profile ID')),
});

export const addStageAttachmentSchema = z
  .object({
    stageId: z.string().uuid('Invalid stage ID'),
    kind: deliveryAttachmentKindSchema,
    label: z.string().trim().min(1, 'Label is required').max(150, 'Label is too long'),
    url: z.string().url('Valid URL is required').optional().nullable(),
    filePath: z.string().trim().min(1, 'File path is required').optional().nullable(),
    fileSizeBytes: z
      .number()
      .int()
      .positive('File size must be positive')
      .max(52428800, 'File must not exceed 50 MB')
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'link') {
      if (!data.url || data.url.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'URL is required for link attachments',
          path: ['url'],
        });
      }
    } else if (data.kind === 'file') {
      if (!data.filePath || data.filePath.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'File path is required for file attachments',
          path: ['filePath'],
        });
      }
    }
  });

export const generateShareLinkSchema = z.object({
  pipelineId: z.string().uuid('Invalid pipeline ID'),
  expiresInDays: z.number().int().min(1).max(365).default(30),
});

export const updatePipelineDetailsSchema = z.object({
  pipelineId: z.string().uuid('Invalid pipeline ID'),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Target date must be YYYY-MM-DD')
    .optional()
    .nullable(),
  notes: z.string().trim().max(2000, 'Notes cannot exceed 2000 characters').optional().nullable(),
});

export type UpdateStageStatusInput = z.infer<typeof updateStageStatusSchema>;
export type AssignStageStaffInput = z.infer<typeof assignStageStaffSchema>;
export type AddStageAttachmentInput = z.infer<typeof addStageAttachmentSchema>;
export type GenerateShareLinkInput = z.infer<typeof generateShareLinkSchema>;
export type UpdatePipelineDetailsInput = z.infer<typeof updatePipelineDetailsSchema>;
