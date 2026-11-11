import { describe, it, expect } from 'vitest';
import { sanitizeCsvCell, generateCsvRow } from '@/lib/utils/csv';

describe('Security Audit — CSV Formula Injection Guard (SECURITY_PLAN §15, OWASP)', () => {
  it('neutralizes cells starting with = formula injection payloads', () => {
    const malicious = "=cmd|'/C calc'!A0";
    const sanitized = sanitizeCsvCell(malicious);
    expect(sanitized).toBe("\"'=cmd|'/C calc'!A0\"");
  });

  it('neutralizes cells starting with + formula injection payloads', () => {
    const payload = '+1234567';
    const sanitized = sanitizeCsvCell(payload);
    expect(sanitized).toBe("\"'+1234567\"");
  });

  it('neutralizes cells starting with - formula injection payloads', () => {
    const payload = '-150000.00';
    const sanitized = sanitizeCsvCell(payload);
    expect(sanitized).toBe("\"'-150000.00\"");
  });

  it('neutralizes cells starting with @ formula injection payloads', () => {
    const payload = '@SUM(1+1)*cmd|';
    const sanitized = sanitizeCsvCell(payload);
    expect(sanitized).toBe("\"'@SUM(1+1)*cmd|\"");
  });

  it('neutralizes cells starting with tab or carriage return', () => {
    const tabPayload = '\tmalicious';
    const sanitized = sanitizeCsvCell(tabPayload);
    expect(sanitized).toBe("\"'\tmalicious\"");
  });

  it('safely escapes inner quotes in normal text cells', () => {
    const text = 'Rahul "The Groom" Sharma';
    const sanitized = sanitizeCsvCell(text);
    expect(sanitized).toBe('"Rahul ""The Groom"" Sharma"');
  });

  it('handles null, undefined, and empty string cells cleanly', () => {
    expect(sanitizeCsvCell(null)).toBe('""');
    expect(sanitizeCsvCell(undefined)).toBe('""');
    expect(sanitizeCsvCell('')).toBe('""');
  });

  it('formats full CSV rows with formula sanitization applied', () => {
    const row = generateCsvRow([
      '2025-11-10',
      'Wedding Package',
      '=cmd|calc',
      150000,
      null,
    ]);
    expect(row).toBe('"2025-11-10","Wedding Package","\'=cmd|calc","150000",""');
  });
});
