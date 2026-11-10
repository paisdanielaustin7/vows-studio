import { describe, it, expect } from 'vitest';

interface QuotationRow {
  id: string;
  rootId: string;
  versionNo: number;
  isCurrent: boolean;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'superseded';
  validUntil: string;
}

/**
 * Pure simulation of the quotations_v derived status view logic in Postgres.
 */
function deriveQuotationStatus(
  status: QuotationRow['status'],
  validUntil: string,
  referenceDateStr: string = '2026-11-10'
): string {
  const isValidUntilPassed = referenceDateStr > validUntil;
  if (['draft', 'sent'].includes(status) && isValidUntilPassed) {
    return 'expired';
  }
  return status;
}

/**
 * Pure simulation of public.create_quotation_version state transition.
 */
function simulateCreateVersion(
  existingVersions: QuotationRow[],
  newId: string
): QuotationRow[] {
  const current = existingVersions.find((v) => v.isCurrent);
  if (!current) {
    throw new Error('No current active version found');
  }

  const nextVersionNo = current.versionNo + 1;

  // Mark all previous versions as not current
  const updatedPrevious = existingVersions.map((v) => ({
    ...v,
    isCurrent: false,
    status: v.status === 'draft' ? ('superseded' as const) : v.status,
  }));

  const newVersion: QuotationRow = {
    id: newId,
    rootId: current.rootId,
    versionNo: nextVersionNo,
    isCurrent: true,
    status: 'draft',
    validUntil: '2026-12-10',
  };

  return [...updatedPrevious, newVersion];
}

describe('Quotation Versioning & Expiry Derivation (QT-04, QT-07)', () => {
  describe('Expiry Derivation (quotations_v)', () => {
    const today = '2026-11-10';

    it('marks draft or sent quotation as expired if valid_until has passed', () => {
      expect(deriveQuotationStatus('draft', '2026-11-01', today)).toBe('expired');
      expect(deriveQuotationStatus('sent', '2026-11-09', today)).toBe('expired');
    });

    it('preserves draft or sent status if valid_until is today or in the future', () => {
      expect(deriveQuotationStatus('draft', '2026-11-10', today)).toBe('draft');
      expect(deriveQuotationStatus('sent', '2026-11-20', today)).toBe('sent');
    });

    it('never expires accepted or rejected quotations even if valid_until has passed', () => {
      expect(deriveQuotationStatus('accepted', '2026-10-01', today)).toBe('accepted');
      expect(deriveQuotationStatus('rejected', '2026-10-01', today)).toBe('rejected');
    });
  });

  describe('Single is_current Version Invariant', () => {
    it('increments version number and preserves single current version invariant', () => {
      const v1: QuotationRow = {
        id: 'q-root',
        rootId: 'q-root',
        versionNo: 1,
        isCurrent: true,
        status: 'draft',
        validUntil: '2026-11-30',
      };

      const historyAfterV2 = simulateCreateVersion([v1], 'q-v2');

      expect(historyAfterV2).toHaveLength(2);

      const oldV1 = historyAfterV2.find((v) => v.id === 'q-root');
      const newV2 = historyAfterV2.find((v) => v.id === 'q-v2');

      expect(oldV1?.isCurrent).toBe(false);
      expect(oldV1?.status).toBe('superseded'); // Draft transitioned to superseded

      expect(newV2?.isCurrent).toBe(true);
      expect(newV2?.versionNo).toBe(2);
      expect(newV2?.rootId).toBe('q-root');

      // Check invariant: exactly one version has is_current = true
      const currentVersions = historyAfterV2.filter((v) => v.isCurrent);
      expect(currentVersions).toHaveLength(1);
    });

    it('preserves sent status on previous version while marking it not current', () => {
      const v1Sent: QuotationRow = {
        id: 'q-root',
        rootId: 'q-root',
        versionNo: 1,
        isCurrent: true,
        status: 'sent',
        validUntil: '2026-11-30',
      };

      const historyAfterV2 = simulateCreateVersion([v1Sent], 'q-v2');
      const oldV1 = historyAfterV2.find((v) => v.id === 'q-root');

      expect(oldV1?.isCurrent).toBe(false);
      expect(oldV1?.status).toBe('sent'); // Sent status preserved for audit history
    });
  });
});
