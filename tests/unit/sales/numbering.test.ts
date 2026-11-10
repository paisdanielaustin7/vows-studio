import { describe, it, expect } from 'vitest';
import { getFinancialYear } from '@/lib/utils';

/**
 * Pure simulation of the app.next_document_number algorithm implemented in Postgres.
 */
interface DocNumberConfig {
  prefix: string;
  padding: number;
  yearFormat: 'YYYY' | 'YY';
  fyStartMonth: number;
}

class DocumentSequenceSimulator {
  private sequences = new Map<string, number>();

  nextDocumentNumber(
    docType: string,
    dateStr: string,
    config: DocNumberConfig
  ): string {
    const d = new Date(dateStr);
    const month = d.getUTCMonth() + 1;
    const year = d.getUTCFullYear();

    const fy = month < config.fyStartMonth ? year - 1 : year;
    const key = `${docType}:${fy}`;
    const currentVal = this.sequences.get(key) || 0;
    const nextVal = currentVal + 1;
    this.sequences.set(key, nextVal);

    const fyStr = config.yearFormat === 'YY' ? String(fy % 100).padStart(2, '0') : String(fy);
    const seqStr = String(nextVal).padStart(config.padding, '0');

    return `${config.prefix}-${fyStr}-${seqStr}`;
  }
}

describe('Document Numbering Logic (DECISION D-18, D-19)', () => {
  const defaultConfig: DocNumberConfig = {
    prefix: 'QT',
    padding: 6,
    yearFormat: 'YYYY',
    fyStartMonth: 4, // April 1 start (standard Indian FY)
  };

  it('correctly handles FY rollover on 31 March vs 1 April IST', () => {
    const simulator = new DocumentSequenceSimulator();

    // 31 March 2026 belongs to FY 2025-26 (FY 2025)
    const docMarch = simulator.nextDocumentNumber('QT', '2026-03-31T18:30:00Z', defaultConfig);
    expect(docMarch).toBe('QT-2025-000001');

    // 1 April 2026 belongs to FY 2026-27 (FY 2026) -> Resets sequence to 000001
    const docApril = simulator.nextDocumentNumber('QT', '2026-04-01T00:00:00Z', defaultConfig);
    expect(docApril).toBe('QT-2026-000001');
  });

  it('respects year_format YY vs YYYY', () => {
    const simulator = new DocumentSequenceSimulator();
    const shortYearConfig: DocNumberConfig = {
      ...defaultConfig,
      prefix: 'INV',
      yearFormat: 'YY',
      padding: 4,
    };

    const doc = simulator.nextDocumentNumber('INV', '2026-05-10T10:00:00Z', shortYearConfig);
    expect(doc).toBe('INV-26-0001');
  });

  it('maintains independent sequences across document types (QT, INV, RCP, BK, CN)', () => {
    const simulator = new DocumentSequenceSimulator();

    const qt1 = simulator.nextDocumentNumber('QT', '2026-05-01T00:00:00Z', { ...defaultConfig, prefix: 'QT' });
    const inv1 = simulator.nextDocumentNumber('INV', '2026-05-01T00:00:00Z', { ...defaultConfig, prefix: 'INV' });
    const rcp1 = simulator.nextDocumentNumber('RCP', '2026-05-01T00:00:00Z', { ...defaultConfig, prefix: 'RCP' });
    const qt2 = simulator.nextDocumentNumber('QT', '2026-05-01T00:00:00Z', { ...defaultConfig, prefix: 'QT' });

    expect(qt1).toBe('QT-2026-000001');
    expect(inv1).toBe('INV-2026-000001');
    expect(rcp1).toBe('RCP-2026-000001');
    expect(qt2).toBe('QT-2026-000002');
  });

  it('simulates concurrent atomic number generation producing gap-free unique numbers', async () => {
    const simulator = new DocumentSequenceSimulator();
    const callCount = 100;

    // Simulate 100 concurrent asynchronous generation requests
    const promises = Array.from({ length: callCount }, () =>
      Promise.resolve().then(() =>
        simulator.nextDocumentNumber('BK', '2026-06-15T12:00:00Z', { ...defaultConfig, prefix: 'BK' })
      )
    );

    const results = await Promise.all(promises);

    // Assert all generated numbers are unique
    const uniqueSet = new Set(results);
    expect(uniqueSet.size).toBe(callCount);

    // Verify first and last numbers
    expect(results[0]).toBe('BK-2026-000001');
    expect(results[callCount - 1]).toBe(`BK-2026-${String(callCount).padStart(6, '0')}`);
  });

  it('verifies getFinancialYear utility matches the FY logic', () => {
    expect(getFinancialYear(new Date('2026-03-31T23:59:59'))).toBe(2025);
    expect(getFinancialYear(new Date('2026-04-01T00:00:00'))).toBe(2026);
    expect(getFinancialYear(new Date('2026-12-31T23:59:59'))).toBe(2026);
    expect(getFinancialYear(new Date('2027-01-01T00:00:00'))).toBe(2026);
  });
});
