/**
 * Uniform INR Price Formatter and Product Demo Masking Utility
 * VOWS Studio OS
 */

/**
 * Standard uniform price formatter: e.g. "Rs. 8,000/-"
 */
export function formatCurrencyINR(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return 'Rs. 0/-';
  if (typeof val === 'string' && val.trim() === '-') return '-';
  const num =
    typeof val === 'number'
      ? val
      : parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
  return `Rs. ${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(num)}/-`;
}

/**
 * Format currency without prefix/suffix if needed for calculation inputs
 */
export function parseCurrencyNumber(val: number | string | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
}

/**
 * Mask client names when currentUser.role === 'PRODUCT_DEMO'
 */
export function maskClientName(name: string | undefined | null, isDemo: boolean = true): string {
  if (!isDemo || !name) return name || '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return `${parts[0].charAt(0)}••••••• (Client)`;
  }
  return parts
    .map((p, idx) => (idx === 0 ? `${p.charAt(0)}••••••` : `••••••`))
    .join(' ') + ' [Confidential]';
}

/**
 * Mask phone numbers for demo mode
 */
export function maskPhone(phone: string | undefined | null, isDemo: boolean = true): string {
  if (!isDemo || !phone) return phone || '';
  return '+91 ••••• •••••';
}

/**
 * Mask email addresses for demo mode
 */
export function maskEmail(email: string | undefined | null, isDemo: boolean = true): string {
  if (!isDemo || !email) return email || '';
  return '••••••••@••••••.com';
}

/**
 * Mask financial amounts for demo mode
 */
export function maskAmount(val: number | string | undefined | null, isDemo: boolean = true): string {
  if (!isDemo) return formatCurrencyINR(val);
  return 'Rs. ••••••/-';
}
