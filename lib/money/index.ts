/**
 * VOWS Studio — Monetary Arithmetic Engine (lib/money)
 * 
 * Non-negotiable rules per DECISION_LOG.md (D-16, D-17):
 * - All monetary amounts are integer paise (BigInt).
 * - Suffix `_paise` for storage/schema.
 * - Percentages and tax rates are integer basis points (_bps), where 100 bps = 1%, 1800 bps = 18%.
 * - Rounding is strictly round-half-up to the paisa: floor((amount * bps + 5000) / 10000).
 * - Floats are NEVER used for money.
 * - Discount apportionment uses the largest-remainder method so paise add up exactly.
 * - Intra-state GST rounds CGST and SGST separately then sums them.
 */

export type DiscountType = 'percent' | 'fixed';

export interface DiscountInput {
  type: DiscountType;
  /**
   * If type === 'percent', value is in basis points (e.g. 1000 = 10%).
   * If type === 'fixed', value is in paise (BigInt or number).
   */
  value: bigint | number;
}

export interface GstBreakdown {
  taxablePaise: bigint;
  rateBps: number;
  cgstPaise: bigint;
  sgstPaise: bigint;
  igstPaise: bigint;
  totalTaxPaise: bigint;
}

export interface LineItemForApportionment {
  id: string;
  amount: bigint;
}

/**
 * Converts rupees (number or string) to integer paise (BigInt).
 * Preserves up to 2 decimal places with round-half-up.
 */
export function toPaise(rupees: number | string): bigint {
  if (typeof rupees === 'number') {
    if (!Number.isFinite(rupees)) {
      throw new TypeError('Invalid number for rupees');
    }
    // Round to avoid floating point precision artifacts before converting
    const sign = rupees < 0 ? -1n : 1n;
    const abs = Math.abs(rupees);
    const whole = Math.floor(abs);
    const fraction = Math.round((abs - whole) * 100);
    return sign * (BigInt(whole) * 100n + BigInt(fraction));
  }

  const clean = rupees.replace(/,/g, '').trim();
  if (!clean || clean === '-') {
    return 0n;
  }

  const isNegative = clean.startsWith('-');
  const unsigned = isNegative ? clean.slice(1) : clean;

  const parts = unsigned.split('.');
  if (parts.length > 2) {
    throw new Error(`Invalid currency string: ${rupees}`);
  }

  const wholeStr = parts[0] || '0';
  const fracRaw = parts[1] || '';
  if (fracRaw.length > 2) {
    throw new Error(`Invalid currency string: cannot have more than 2 decimal places (${rupees})`);
  }
  const fracStr = fracRaw.padEnd(2, '0');

  if (!/^\d+$/.test(wholeStr) || !/^\d+$/.test(fracStr)) {
    throw new Error(`Invalid currency string format: ${rupees}`);
  }

  const whole = BigInt(wholeStr);
  const frac = BigInt(fracStr);
  const total = whole * 100n + frac;

  return isNegative ? -total : total;
}

/**
 * Alias for toPaise for convenience.
 */
export const fromRupees = toPaise;

/**
 * Converts integer paise to rupees (number).
 * Suitable for presentation charts or external number inputs.
 */
export function toRupees(paise: bigint): number {
  return Number(paise) / 100;
}

/**
 * Sums multiple paise amounts.
 */
export function addPaise(...amounts: bigint[]): bigint {
  return amounts.reduce((acc, curr) => acc + curr, 0n);
}

/**
 * Subtracts b from a in paise.
 */
export function subtractPaise(a: bigint, b: bigint): bigint {
  return a - b;
}

/**
 * Multiplies an amount in paise by an integer or integer factor.
 */
export function multiply(paise: bigint, factor: bigint | number): bigint {
  return paise * BigInt(factor);
}

/**
 * Computes a percentage of a paise amount using basis points (bps).
 * Round-half-up: floor((amount * bps + 5000) / 10000).
 * Handles positive and negative amounts correctly.
 */
export function percentOf(amount: bigint, bps: number | bigint): bigint {
  const b = BigInt(bps);
  if (amount === 0n || b === 0n) {
    return 0n;
  }

  const isNeg = (amount < 0n && b > 0n) || (amount > 0n && b < 0n);
  const absAmount = amount < 0n ? -amount : amount;
  const absBps = b < 0n ? -b : b;

  // Round-half-up formula: floor((val + 5000) / 10000)
  const product = absAmount * absBps;
  const rounded = (product + 5000n) / 10000n;

  return isNeg ? -rounded : rounded;
}

/**
 * Applies an overall discount to a subtotal.
 * Discount is either 'percent' in bps or 'fixed' in paise.
 * Discount cannot be negative and is capped at the subtotal.
 */
export function applyDiscount(
  subtotal: bigint,
  discount?: DiscountInput | null
): { discountAmount: bigint; taxableBase: bigint } {
  if (!discount || subtotal <= 0n) {
    return { discountAmount: 0n, taxableBase: subtotal };
  }

  let rawDiscount = 0n;
  if (discount.type === 'percent') {
    const bps = Number(discount.value);
    if (bps < 0) {
      throw new Error('Discount percentage cannot be negative');
    }
    rawDiscount = percentOf(subtotal, bps);
  } else if (discount.type === 'fixed') {
    rawDiscount = BigInt(discount.value);
    if (rawDiscount < 0n) {
      throw new Error('Fixed discount cannot be negative');
    }
  }

  // Cap discount at subtotal
  const discountAmount = rawDiscount > subtotal ? subtotal : rawDiscount;
  const taxableBase = subtotal - discountAmount;

  return { discountAmount, taxableBase };
}

/**
 * Apportions an overall discount across multiple line items using the largest-remainder method.
 * Guaranteed: sum of apportioned discounts === totalDiscount to the exact paisa.
 */
export function apportionDiscount(
  lines: LineItemForApportionment[],
  totalDiscount: bigint
): Map<string, bigint> {
  const result = new Map<string, bigint>();
  if (lines.length === 0 || totalDiscount <= 0n) {
    lines.forEach((l) => result.set(l.id, 0n));
    return result;
  }

  const totalAmount = lines.reduce((acc, curr) => acc + curr.amount, 0n);
  if (totalAmount <= 0n) {
    lines.forEach((l) => result.set(l.id, 0n));
    return result;
  }

  // Cap total discount at total amount
  const effectiveDiscount = totalDiscount > totalAmount ? totalAmount : totalDiscount;

  interface LineShare {
    id: string;
    integerShare: bigint;
    remainder: bigint;
    amount: bigint;
  }

  const shares: LineShare[] = lines.map((line) => {
    // Exact product: line.amount * effectiveDiscount
    const product = line.amount * effectiveDiscount;
    const integerShare = product / totalAmount;
    const remainder = product % totalAmount;
    return {
      id: line.id,
      integerShare,
      remainder,
      amount: line.amount,
    };
  });

  let allocated = shares.reduce((acc, s) => acc + s.integerShare, 0n);
  let discrepancy = Number(effectiveDiscount - allocated);

  // Sort descending by remainder, ties broken by original line amount descending
  const sortedShares = [...shares].sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder > a.remainder ? 1 : -1;
    }
    return b.amount > a.amount ? 1 : b.amount < a.amount ? -1 : 0;
  });

  // Distribute 1 paisa to largest remainders until discrepancy is 0
  const bonusIds = new Set<string>();
  for (let i = 0; i < discrepancy && i < sortedShares.length; i++) {
    bonusIds.add(sortedShares[i].id);
  }

  for (const s of shares) {
    const finalAmount = bonusIds.has(s.id) ? s.integerShare + 1n : s.integerShare;
    result.set(s.id, finalAmount);
  }

  return result;
}

/**
 * Computes GST for intra-state (CGST + SGST) or inter-state (IGST).
 * For intra-state, rate is split in half (rateBps / 2).
 * Both CGST and SGST are rounded half-up separately, then summed (D-17).
 */
export function computeGst(
  taxablePaise: bigint,
  rateBps: number,
  isInterState: boolean
): GstBreakdown {
  if (taxablePaise <= 0n || rateBps <= 0) {
    return {
      taxablePaise,
      rateBps,
      cgstPaise: 0n,
      sgstPaise: 0n,
      igstPaise: 0n,
      totalTaxPaise: 0n,
    };
  }

  if (isInterState) {
    const igstPaise = percentOf(taxablePaise, rateBps);
    return {
      taxablePaise,
      rateBps,
      cgstPaise: 0n,
      sgstPaise: 0n,
      igstPaise,
      totalTaxPaise: igstPaise,
    };
  }

  // Intra-state: split rate into equal halves
  const halfRateBps = Math.floor(rateBps / 2);
  const cgstPaise = percentOf(taxablePaise, halfRateBps);
  const sgstPaise = percentOf(taxablePaise, halfRateBps);
  const totalTaxPaise = cgstPaise + sgstPaise;

  return {
    taxablePaise,
    rateBps,
    cgstPaise,
    sgstPaise,
    igstPaise: 0n,
    totalTaxPaise,
  };
}

/**
 * Formats a paise amount into Indian Rupee format with standard grouping (₹1,50,000.00).
 * Uses en-IN locale with 2 decimal places.
 */
export function formatINR(paise: bigint): string {
  const isNeg = paise < 0n;
  const abs = isNeg ? -paise : paise;
  const whole = abs / 100n;
  const frac = abs % 100n;

  // Format the whole number with Indian grouping (3 digits for first chunk, then 2 digits)
  const wholeStr = whole.toString();
  let grouped = '';
  if (wholeStr.length <= 3) {
    grouped = wholeStr;
  } else {
    const last3 = wholeStr.slice(-3);
    const rest = wholeStr.slice(0, -3);
    const chunks: string[] = [];
    let rem = rest;
    while (rem.length > 2) {
      chunks.unshift(rem.slice(-2));
      rem = rem.slice(0, -2);
    }
    if (rem.length > 0) {
      chunks.unshift(rem);
    }
    grouped = chunks.join(',') + ',' + last3;
  }

  const fracStr = frac.toString().padStart(2, '0');
  const result = `₹${grouped}.${fracStr}`;
  return isNeg ? `-${result}` : result;
}

/**
 * Parses user input in Indian Rupees into integer paise.
 * Tolerates ₹ symbol, spaces, and commas.
 */
export function parseINR(input: string): bigint {
  const sanitized = input.replace(/[₹\s,]/g, '');
  return toPaise(sanitized);
}
