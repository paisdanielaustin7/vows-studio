import { describe, it, expect } from 'vitest';

/**
 * Trigram similarity simulation matching pg_trgm logic.
 */
function trigramSimilarity(str1: string, str2: string): number {
  const getTrigrams = (s: string) => {
    const padded = `  ${s.toLowerCase()} `;
    const trg = new Set<string>();
    for (let i = 0; i < padded.length - 2; i++) {
      trg.add(padded.slice(i, i + 3));
    }
    return trg;
  };

  const trg1 = getTrigrams(str1);
  const trg2 = getTrigrams(str2);

  let intersection = 0;
  for (const t of trg1) {
    if (trg2.has(t)) intersection++;
  }

  const union = new Set([...trg1, ...trg2]).size;
  return union === 0 ? 0 : intersection / union;
}

function escapeCsvFormula(value: string | null | undefined): string {
  if (!value) return '';
  const str = String(value).trim();
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

describe('Client Duplicate Detection & CSV Safety (CLI-03, CLI-08)', () => {
  const existingClients = [
    {
      id: 'c1',
      fullName: 'Aarav Patel',
      phones: ['+919840012345'],
      emails: ['aarav.patel@gmail.com'],
    },
    {
      id: 'c2',
      fullName: 'Priya Sundaram',
      phones: ['+919840098765'],
      emails: ['priya@sundaram.in'],
    },
  ];

  it('detects duplicate client by primary or secondary phone', () => {
    const inputPhone = '+919840012345';
    const match = existingClients.find((c) => c.phones.includes(inputPhone));

    expect(match).toBeDefined();
    expect(match?.fullName).toBe('Aarav Patel');
  });

  it('detects duplicate client by case-insensitive email', () => {
    const inputEmail = 'AARAV.PATEL@GMAIL.COM';
    const match = existingClients.find((c) =>
      c.emails.some((e) => e.toLowerCase() === inputEmail.toLowerCase())
    );

    expect(match).toBeDefined();
    expect(match?.id).toBe('c1');
  });

  it('computes trigram similarity for similar client names', () => {
    const simHigh = trigramSimilarity('Aarav Patel', 'Arav Patel');
    const simMedium = trigramSimilarity('Aarav Patel', 'Aarav');
    const simLow = trigramSimilarity('Aarav Patel', 'Sundaram');

    expect(simHigh).toBeGreaterThan(0.6);
    expect(simMedium).toBeGreaterThan(0.3);
    expect(simLow).toBeLessThan(0.2);
  });

  describe('Formula Injection (CSV Injection) Protection', () => {
    it('prepends single quote to dangerous leading characters (=, +, -, @)', () => {
      expect(escapeCsvFormula('=cmd|"/C calc"!A0')).toBe('\'=cmd|"/C calc"!A0');
      expect(escapeCsvFormula('+12345')).toBe('\'+12345');
      expect(escapeCsvFormula('-SUM(A1:A10)')).toBe('\'-SUM(A1:A10)');
      expect(escapeCsvFormula('@SUM(B1:B5)')).toBe('\'@SUM(B1:B5)');
    });

    it('leaves safe alphanumeric strings unescaped', () => {
      expect(escapeCsvFormula('Aarav Patel')).toBe('Aarav Patel');
      expect(escapeCsvFormula('hello@vowsstudio.com')).toBe('hello@vowsstudio.com');
      expect(escapeCsvFormula('Chennai, Tamil Nadu')).toBe('Chennai, Tamil Nadu');
      expect(escapeCsvFormula('')).toBe('');
      expect(escapeCsvFormula(null)).toBe('');
    });
  });
});
