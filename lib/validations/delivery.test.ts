import { describe, it, expect } from 'vitest';
import {
  deliveryStageCodeSchema,
  deliveryStageStatusSchema,
  deliveryAttachmentKindSchema,
  updateStageStatusSchema,
  assignStageStaffSchema,
  addStageAttachmentSchema,
  generateShareLinkSchema,
  updatePipelineDetailsSchema,
} from './delivery.schema';

describe('Delivery Validations (Phase 6)', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const secondUuid = '987e6543-e21b-12d3-a456-426614174999';

  describe('deliveryStageCodeSchema & deliveryStageStatusSchema', () => {
    it('accepts all 9 valid stage codes', () => {
      const codes = [
        'raw_import',
        'culling',
        'editing',
        'client_preview',
        'revisions',
        'final_export',
        'quality_check',
        'delivery',
        'completed',
      ] as const;

      codes.forEach((code) => {
        expect(deliveryStageCodeSchema.parse(code)).toBe(code);
      });
    });

    it('rejects invalid stage code', () => {
      expect(() => deliveryStageCodeSchema.parse('invalid_code')).toThrow();
    });

    it('accepts valid stage statuses', () => {
      const statuses = ['pending', 'in_progress', 'completed', 'blocked'] as const;
      statuses.forEach((s) => {
        expect(deliveryStageStatusSchema.parse(s)).toBe(s);
      });
    });

    it('rejects invalid stage status', () => {
      expect(() => deliveryStageStatusSchema.parse('unknown_status')).toThrow();
    });

    it('accepts valid attachment kinds', () => {
      expect(deliveryAttachmentKindSchema.parse('link')).toBe('link');
      expect(deliveryAttachmentKindSchema.parse('file')).toBe('file');
      expect(() => deliveryAttachmentKindSchema.parse('other')).toThrow();
    });
  });

  describe('updateStageStatusSchema', () => {
    it('validates a successful stage progression', () => {
      const result = updateStageStatusSchema.parse({
        stageId: validUuid,
        status: 'in_progress',
        notes: 'Starting editorial pass',
      });
      expect(result.status).toBe('in_progress');
      expect(result.notes).toBe('Starting editorial pass');
    });

    it('validates completed stage with override reason', () => {
      const result = updateStageStatusSchema.parse({
        stageId: validUuid,
        status: 'completed',
        overrideReason: 'Fast-tracked with client approval',
      });
      expect(result.status).toBe('completed');
      expect(result.overrideReason).toBe('Fast-tracked with client approval');
    });

    it('requires a blocked reason when status is blocked', () => {
      expect(() =>
        updateStageStatusSchema.parse({
          stageId: validUuid,
          status: 'blocked',
        })
      ).toThrow(/blocked reason is strictly required/);

      expect(() =>
        updateStageStatusSchema.parse({
          stageId: validUuid,
          status: 'blocked',
          blockedReason: '   ',
        })
      ).toThrow(/blocked reason is strictly required/);
    });

    it('accepts blocked status with a valid blocked reason', () => {
      const result = updateStageStatusSchema.parse({
        stageId: validUuid,
        status: 'blocked',
        blockedReason: 'Waiting for client song selection',
      });
      expect(result.status).toBe('blocked');
      expect(result.blockedReason).toBe('Waiting for client song selection');
    });

    it('rejects invalid stage UUID', () => {
      expect(() =>
        updateStageStatusSchema.parse({
          stageId: 'not-a-uuid',
          status: 'in_progress',
        })
      ).toThrow(/Invalid stage ID/);
    });
  });

  describe('assignStageStaffSchema', () => {
    it('accepts valid assignment payload', () => {
      const result = assignStageStaffSchema.parse({
        stageId: validUuid,
        profileIds: [secondUuid],
      });
      expect(result.profileIds).toHaveLength(1);
    });

    it('rejects invalid profile UUID in array', () => {
      expect(() =>
        assignStageStaffSchema.parse({
          stageId: validUuid,
          profileIds: ['not-a-uuid'],
        })
      ).toThrow(/Invalid profile ID/);
    });
  });

  describe('addStageAttachmentSchema', () => {
    it('validates a link attachment with valid URL', () => {
      const result = addStageAttachmentSchema.parse({
        stageId: validUuid,
        kind: 'link',
        label: 'Frame.io Review Stream',
        url: 'https://vows.frame.io/review/12345',
      });
      expect(result.kind).toBe('link');
      expect(result.url).toBe('https://vows.frame.io/review/12345');
    });

    it('requires url when kind is link', () => {
      expect(() =>
        addStageAttachmentSchema.parse({
          stageId: validUuid,
          kind: 'link',
          label: 'Frame.io Stream',
        })
      ).toThrow(/URL is required for link attachments/);

      expect(() =>
        addStageAttachmentSchema.parse({
          stageId: validUuid,
          kind: 'link',
          label: 'Frame.io Stream',
          url: '   ',
        })
      ).toThrow();
    });

    it('validates a file attachment with valid path and size', () => {
      const result = addStageAttachmentSchema.parse({
        stageId: validUuid,
        kind: 'file',
        label: 'Color Grading LUT',
        filePath: 'client-uploads/lut.cube',
        fileSizeBytes: 1024 * 1024,
      });
      expect(result.kind).toBe('file');
      expect(result.filePath).toBe('client-uploads/lut.cube');
    });

    it('requires filePath when kind is file', () => {
      expect(() =>
        addStageAttachmentSchema.parse({
          stageId: validUuid,
          kind: 'file',
          label: 'LUT File',
        })
      ).toThrow(/File path is required for file attachments/);

      expect(() =>
        addStageAttachmentSchema.parse({
          stageId: validUuid,
          kind: 'file',
          label: 'LUT File',
          filePath: '   ',
        })
      ).toThrow(/File path is required for file attachments/);
    });

    it('rejects files larger than 50 MB', () => {
      expect(() =>
        addStageAttachmentSchema.parse({
          stageId: validUuid,
          kind: 'file',
          label: 'Huge File',
          filePath: 'client-uploads/huge.zip',
          fileSizeBytes: 52428801, // 50MB + 1 byte
        })
      ).toThrow(/File must not exceed 50 MB/);
    });
  });

  describe('generateShareLinkSchema', () => {
    it('validates default expiry', () => {
      const result = generateShareLinkSchema.parse({
        pipelineId: validUuid,
      });
      expect(result.expiresInDays).toBe(30);
    });

    it('accepts custom valid expiry', () => {
      const result = generateShareLinkSchema.parse({
        pipelineId: validUuid,
        expiresInDays: 60,
      });
      expect(result.expiresInDays).toBe(60);
    });

    it('rejects out-of-range expiry', () => {
      expect(() =>
        generateShareLinkSchema.parse({
          pipelineId: validUuid,
          expiresInDays: 0,
        })
      ).toThrow();

      expect(() =>
        generateShareLinkSchema.parse({
          pipelineId: validUuid,
          expiresInDays: 400,
        })
      ).toThrow();
    });
  });

  describe('updatePipelineDetailsSchema', () => {
    it('accepts valid targetDate and notes', () => {
      const result = updatePipelineDetailsSchema.parse({
        pipelineId: validUuid,
        targetDate: '2026-12-25',
        notes: 'Priority wedding delivery before year end',
      });
      expect(result.targetDate).toBe('2026-12-25');
      expect(result.notes).toBe('Priority wedding delivery before year end');
    });

    it('rejects invalid date format', () => {
      expect(() =>
        updatePipelineDetailsSchema.parse({
          pipelineId: validUuid,
          targetDate: '25-12-2026',
        })
      ).toThrow(/Target date must be YYYY-MM-DD/);
    });
  });
});
