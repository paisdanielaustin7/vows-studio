/**
 * VOWS — CSV Sanitization and Formula Injection Guard
 * Reference: SECURITY_PLAN §15 ("CSV injection export"), OWASP CSV Injection Guidelines
 * Escapes characters (=, +, -, @, \t, \r) that spreadsheet applications (Excel, Calc)
 * evaluate as formula commands.
 */

export function sanitizeCsvCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const raw = String(val);
  if (raw.length === 0) return '""';

  // If cell starts with formula indicators (=, +, -, @, \t, \r), prepend with single quote
  if (/^[=+\-@\t\r]/.test(raw) || /^\s*[=+\-@\t\r]/.test(raw)) {
    return `"'${raw.replace(/"/g, '""')}"`;
  }

  return `"${raw.replace(/"/g, '""')}"`;
}

export function generateCsvRow(cells: (string | number | boolean | null | undefined)[]): string {
  return cells.map(sanitizeCsvCell).join(',');
}
