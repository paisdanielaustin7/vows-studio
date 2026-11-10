import { describe, it, expect } from 'vitest';
import {
  toPaise,
  fromRupees,
  toRupees,
  addPaise,
  subtractPaise,
  multiply,
  percentOf,
  applyDiscount,
  apportionDiscount,
  computeGst,
  formatINR,
  parseINR,
} from './index';

describe('lib/money — Core Monetary Arithmetic Engine', () => {
  describe('toPaise & fromRupees conversion', () => {
    it('converts integer numbers to paise', () => {
      expect(toPaise(100)).toBe(10000n);
      expect(toPaise(0)).toBe(0n);
      expect(toPaise(1)).toBe(100n);
    });

    it('converts floating numbers with decimals to paise correctly', () => {
      expect(toPaise(150.5)).toBe(15050n);
      expect(toPaise(150.55)).toBe(15055n);
      expect(toPaise(0.05)).toBe(5n);
    });

    it('converts negative numbers correctly', () => {
      expect(toPaise(-50.25)).toBe(-5025n);
    });

    it('throws on non-finite numbers', () => {
      expect(() => toPaise(NaN)).toThrow(TypeError);
      expect(() => toPaise(Infinity)).toThrow(TypeError);
    });

    it('converts formatted currency strings to paise', () => {
      expect(toPaise('1,50,000.00')).toBe(15000000n);
      expect(toPaise('150000.50')).toBe(15000050n);
      expect(toPaise('0.99')).toBe(99n);
      expect(toPaise('.50')).toBe(50n);
      expect(toPaise('  2500  ')).toBe(250000n);
      expect(toPaise('')).toBe(0n);
      expect(toPaise('-')).toBe(0n);
    });

    it('converts negative strings to negative paise', () => {
      expect(toPaise('-500.25')).toBe(-50025n);
    });

    it('throws on malformed strings', () => {
      expect(() => toPaise('1.2.3')).toThrow();
      expect(() => toPaise('abc')).toThrow();
      expect(() => toPaise('100.999')).toThrow();
    });

    it('aliases fromRupees to toPaise', () => {
      expect(fromRupees('500.00')).toBe(toPaise(500));
    });

    it('converts paise back to rupees', () => {
      expect(toRupees(15050n)).toBe(150.5);
      expect(toRupees(100000n)).toBe(1000);
      expect(toRupees(-5000n)).toBe(-50);
    });
  });

  describe('Basic arithmetic: add, subtract, multiply', () => {
    it('adds multiple paise amounts', () => {
      expect(addPaise(100n, 200n, 300n)).toBe(600n);
      expect(addPaise()).toBe(0n);
    });

    it('subtracts paise correctly', () => {
      expect(subtractPaise(500n, 200n)).toBe(300n);
      expect(subtractPaise(100n, 300n)).toBe(-200n);
    });

    it('multiplies paise by integer factors', () => {
      expect(multiply(15000n, 3)).toBe(45000n);
      expect(multiply(15000n, 2n)).toBe(30000n);
    });
  });

  describe('percentOf & Round-Half-Up Rounding', () => {
    it('calculates exact percentage using basis points', () => {
      // 18% of 1000.00 (100000 paise) = 18000 paise
      expect(percentOf(100000n, 1800)).toBe(18000n);
      // 5% of 500.00 (50000 paise) = 2500 paise
      expect(percentOf(50000n, 500)).toBe(2500n);
    });

    it('handles zero amount or zero bps', () => {
      expect(percentOf(0n, 1800)).toBe(0n);
      expect(percentOf(100000n, 0)).toBe(0n);
    });

    it('strictly applies round-half-up (0.5 paisa rounds up)', () => {
      // 1 paisa * 50% = 0.5 paisa -> rounds up to 1 paisa
      // (1 * 5000 + 5000) / 10000 = 10000 / 10000 = 1n
      expect(percentOf(1n, 5000)).toBe(1n);

      // 1 paisa * 49.99% = 0.4999 paisa -> rounds down to 0 paisa
      // (1 * 4999 + 5000) / 10000 = 9999 / 10000 = 0n
      expect(percentOf(1n, 4999)).toBe(0n);

      // 3 paise * 50% = 1.5 paise -> rounds up to 2 paise
      // (3 * 5000 + 5000) / 10000 = 20000 / 10000 = 2n
      expect(percentOf(3n, 5000)).toBe(2n);
    });

    it('handles negative amounts and negative bps', () => {
      expect(percentOf(-100000n, 1800)).toBe(-18000n);
      expect(percentOf(100000n, -1800)).toBe(-18000n);
      expect(percentOf(-1n, 5000)).toBe(-1n);
    });
  });

  describe('applyDiscount', () => {
    it('applies percentage discount in basis points', () => {
      // 10% (1000 bps) discount on ₹1,00,000 (10000000 paise) = ₹10,000 (1000000 paise)
      const res = applyDiscount(10000000n, { type: 'percent', value: 1000 });
      expect(res.discountAmount).toBe(1000000n);
      expect(res.taxableBase).toBe(9000000n);
    });

    it('applies fixed discount in paise', () => {
      const res = applyDiscount(10000000n, { type: 'fixed', value: 2500000n });
      expect(res.discountAmount).toBe(2500000n);
      expect(res.taxableBase).toBe(7500000n);
    });

    it('caps discount at subtotal (cannot be greater than subtotal)', () => {
      const resFixed = applyDiscount(50000n, { type: 'fixed', value: 70000n });
      expect(resFixed.discountAmount).toBe(50000n);
      expect(resFixed.taxableBase).toBe(0n);

      const resPercent = applyDiscount(50000n, { type: 'percent', value: 15000 }); // 150%
      expect(resPercent.discountAmount).toBe(50000n);
      expect(resPercent.taxableBase).toBe(0n);
    });

    it('returns zero discount if no discount provided or subtotal <= 0', () => {
      expect(applyDiscount(50000n, null)).toEqual({ discountAmount: 0n, taxableBase: 50000n });
      expect(applyDiscount(0n, { type: 'fixed', value: 100n })).toEqual({
        discountAmount: 0n,
        taxableBase: 0n,
      });
      expect(applyDiscount(-500n, { type: 'fixed', value: 100n })).toEqual({
        discountAmount: 0n,
        taxableBase: -500n,
      });
    });

    it('throws on negative discount values', () => {
      expect(() => applyDiscount(50000n, { type: 'percent', value: -500 })).toThrow();
      expect(() => applyDiscount(50000n, { type: 'fixed', value: -500n })).toThrow();
    });
  });

  describe('apportionDiscount (Largest-Remainder Method)', () => {
    it('apportions discount exactly with no lost paise', () => {
      // 3 items of ₹100, total ₹300. Discount ₹10 (1000 paise).
      // 1000 / 3 = 333.333 paise per item.
      // Largest remainder awards 334 to item 1, 333 to item 2, 333 to item 3. Sum = 1000.
      const lines = [
        { id: 'item-1', amount: 10000n },
        { id: 'item-2', amount: 10000n },
        { id: 'item-3', amount: 10000n },
      ];
      const apportioned = apportionDiscount(lines, 1000n);

      const sum = Array.from(apportioned.values()).reduce((a, b) => a + b, 0n);
      expect(sum).toBe(1000n);
      expect(apportioned.get('item-1')).toBe(334n);
      expect(apportioned.get('item-2')).toBe(333n);
      expect(apportioned.get('item-3')).toBe(333n);
    });

    it('handles proportional discount on different line item amounts', () => {
      const lines = [
        { id: 'line-1', amount: 70000n }, // 70%
        { id: 'line-2', amount: 30000n }, // 30%
      ];
      const apportioned = apportionDiscount(lines, 1500n);
      expect(apportioned.get('line-1')).toBe(1050n);
      expect(apportioned.get('line-2')).toBe(450n);
      expect(addPaise(...apportioned.values())).toBe(1500n);

      // Reverse order lines to test b.remainder < a.remainder
      const reverseLines = [
        { id: 'line-low', amount: 10000n },
        { id: 'line-high', amount: 90000n },
      ];
      const revApportioned = apportionDiscount(reverseLines, 333n);
      expect(addPaise(...revApportioned.values())).toBe(333n);

      // Test tie-breaking by line amount when remainders are identical in both directions
      const tieLinesAsc = [
        { id: 'tie-small', amount: 10000n },
        { id: 'tie-large', amount: 20000n },
      ];
      expect(addPaise(...apportionDiscount(tieLinesAsc, 100n).values())).toBe(100n);

      const tieLinesDesc = [
        { id: 'tie-large2', amount: 20000n },
        { id: 'tie-small2', amount: 10000n },
      ];
      expect(addPaise(...apportionDiscount(tieLinesDesc, 100n).values())).toBe(100n);

      const tieLinesEqual = [
        { id: 'eq-1', amount: 15000n },
        { id: 'eq-2', amount: 15000n },
      ];
      expect(addPaise(...apportionDiscount(tieLinesEqual, 100n).values())).toBe(100n);
    });

    it('apportionDiscount handles non-zero remainders and awards bonus to highest remainder', () => {
      // Line 1: amount 1, Line 2: amount 2. Total 3. Discount 1.
      // Line 1: 1 * 1 / 3 = 0, rem 1
      // Line 2: 2 * 1 / 3 = 0, rem 2
      // Line 2 has larger remainder, so Line 2 gets 1 paisa, Line 1 gets 0.
      const lines = [
        { id: 'low-rem', amount: 1n },
        { id: 'high-rem', amount: 2n },
      ];
      const apportioned = apportionDiscount(lines, 1n);
      expect(apportioned.get('high-rem')).toBe(1n);
      expect(apportioned.get('low-rem')).toBe(0n);
    });

    it('returns empty map or zeroes for empty lines or zero discount', () => {
      expect(apportionDiscount([], 500n).size).toBe(0);
      const lines = [{ id: 'a', amount: 100n }];
      expect(apportionDiscount(lines, 0n).get('a')).toBe(0n);
      const zeroLines = [{ id: 'z', amount: 0n }];
      expect(apportionDiscount(zeroLines, 500n).get('z')).toBe(0n);
    });

    it('caps total discount at total amount', () => {
      const lines = [
        { id: 'a', amount: 100n },
        { id: 'b', amount: 200n },
      ];
      const apportioned = apportionDiscount(lines, 5000n); // Discount > Total (300n)
      expect(addPaise(...apportioned.values())).toBe(300n);
      expect(apportioned.get('a')).toBe(100n);
      expect(apportioned.get('b')).toBe(200n);
    });
  });

  describe('computeGst', () => {
    it('computes intra-state GST (CGST + SGST split)', () => {
      // ₹1,00,000 @ 18% (1800 bps) intra-state -> 9% CGST (9000), 9% SGST (9000), total 18000
      const gst = computeGst(10000000n, 1800, false);
      expect(gst.rateBps).toBe(1800);
      expect(gst.cgstPaise).toBe(900000n);
      expect(gst.sgstPaise).toBe(900000n);
      expect(gst.igstPaise).toBe(0n);
      expect(gst.totalTaxPaise).toBe(1800000n);
    });

    it('computes inter-state GST (IGST)', () => {
      const gst = computeGst(10000000n, 1800, true);
      expect(gst.cgstPaise).toBe(0n);
      expect(gst.sgstPaise).toBe(0n);
      expect(gst.igstPaise).toBe(1800000n);
      expect(gst.totalTaxPaise).toBe(1800000n);
    });

    it('handles odd paise rounding on CGST and SGST', () => {
      // 5 paise @ 18% intra-state:
      // Half-rate = 9% (900 bps).
      // CGST: percentOf(5, 900) = (5 * 900 + 5000) / 10000 = 9500 / 10000 = 0n.
      // SGST: percentOf(5, 900) = 0n.
      // Total tax = 0n.
      const gstSmall = computeGst(5n, 1800, false);
      expect(gstSmall.cgstPaise).toBe(0n);
      expect(gstSmall.sgstPaise).toBe(0n);
      expect(gstSmall.totalTaxPaise).toBe(0n);

      // 6 paise @ 18% intra-state:
      // CGST: percentOf(6, 900) = (6 * 900 + 5000) / 10000 = 10400 / 10000 = 1n.
      // SGST: percentOf(6, 900) = 1n.
      // Total tax = 2n.
      const gst6 = computeGst(6n, 1800, false);
      expect(gst6.cgstPaise).toBe(1n);
      expect(gst6.sgstPaise).toBe(1n);
      expect(gst6.totalTaxPaise).toBe(2n);
    });

    it('handles zero or negative taxable base or zero rate', () => {
      const gstZero = computeGst(0n, 1800, false);
      expect(gstZero.totalTaxPaise).toBe(0n);
      const gstZeroRate = computeGst(100000n, 0, false);
      expect(gstZeroRate.totalTaxPaise).toBe(0n);
    });
  });

  describe('formatINR & parseINR', () => {
    it('formats amounts in Indian grouping with ₹ symbol', () => {
      expect(formatINR(15000000n)).toBe('₹1,50,000.00');
      expect(formatINR(123456789n)).toBe('₹12,34,567.89');
      expect(formatINR(50n)).toBe('₹0.50');
      expect(formatINR(0n)).toBe('₹0.00');
    });

    it('formats negative amounts with negative sign', () => {
      expect(formatINR(-15000000n)).toBe('-₹1,50,000.00');
    });

    it('parses formatted strings back to paise', () => {
      expect(parseINR('₹1,50,000.00')).toBe(15000000n);
      expect(parseINR('1,50,000.50')).toBe(15000050n);
      expect(parseINR('₹ 5,000')).toBe(500000n);
      expect(parseINR('-₹ 500.25')).toBe(-50025n);
    });
  });
});
