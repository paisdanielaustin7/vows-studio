import { describe, it, expect } from 'vitest';
import { recalculateQuotation } from '@/lib/money/quotation-calculator';
import { QuotationInput } from '@/lib/validations/sales.schema';
import { computeGst, apportionDiscount, applyDiscount } from '@/lib/money';

describe('Quotation Calculation & Deferred Sum Verification (QT-03, D-16, D-17)', () => {
  it('correctly calculates single-line quotation with CGST and SGST', () => {
    const input: QuotationInput = {
      clientId: '11111111-1111-1111-1111-111111111111',
      validUntil: '2026-12-31',
      subtotalPaise: 10000000, // ₹1,00,000.00
      discountType: null,
      discountPaise: 0,
      taxablePaise: 10000000,
      cgstPaise: 900000, // 9% = ₹9,000.00
      sgstPaise: 900000, // 9% = ₹9,000.00
      igstPaise: 0,
      taxPaise: 1800000,
      totalPaise: 11800000, // ₹1,18,000.00
      gstApplied: true,
      taxType: 'cgst_sgst',
      items: [
        {
          description: 'Candid Photography',
          quantity: 2,
          unitPricePaise: 5000000, // ₹50,000.00
          lineTotalPaise: 10000000,
          cgstBps: 900,
          sgstBps: 900,
        },
      ],
    };

    const result = recalculateQuotation(input);

    expect(result.subtotalPaise).toBe(10000000);
    expect(result.discountPaise).toBe(0);
    expect(result.taxablePaise).toBe(10000000);
    expect(result.cgstPaise).toBe(900000);
    expect(result.sgstPaise).toBe(900000);
    expect(result.igstPaise).toBe(0);
    expect(result.taxPaise).toBe(1800000);
    expect(result.totalPaise).toBe(11800000);
  });

  it('correctly apportions percentage discount across multiple lines with largest-remainder', () => {
    // 3 items: 10,000 paise, 20,000 paise, 30,000 paise (subtotal 60,000)
    // 15% discount = 9,000 paise
    const lines = [
      { id: 'item-1', amount: 10000n },
      { id: 'item-2', amount: 20000n },
      { id: 'item-3', amount: 30000n },
    ];
    const totalDiscount = 9000n;

    const apportioned = apportionDiscount(lines, totalDiscount);

    expect(apportioned.get('item-1')).toBe(1500n);
    expect(apportioned.get('item-2')).toBe(3000n);
    expect(apportioned.get('item-3')).toBe(4500n);

    const totalAllocated =
      apportioned.get('item-1')! + apportioned.get('item-2')! + apportioned.get('item-3')!;
    expect(totalAllocated).toBe(9000n);
  });

  it('handles odd-paise amounts without losing paise during GST splitting', () => {
    // 1 paisa at 18% GST (intra-state 9% + 9%)
    // 1 * 900 / 10000 = 0.09 -> 0
    const gst1 = computeGst(1n, 1800, false);
    expect(gst1.cgstPaise).toBe(0n);
    expect(gst1.sgstPaise).toBe(0n);
    expect(gst1.totalTaxPaise).toBe(0n);

    // 56 paise at 18% GST:
    // 56 * 900 = 50400 -> floor((50400 + 5000) / 10000) = floor(55400 / 10000) = 5 paise
    const gst56 = computeGst(56n, 1800, false);
    expect(gst56.cgstPaise).toBe(5n);
    expect(gst56.sgstPaise).toBe(5n);
    expect(gst56.totalTaxPaise).toBe(10n);
  });

  it('caps fixed discount at the subtotal amount', () => {
    const subtotal = 50000n;
    const excessiveDiscount = { type: 'fixed' as const, value: 100000n };

    const { discountAmount, taxableBase } = applyDiscount(subtotal, excessiveDiscount);

    expect(discountAmount).toBe(50000n);
    expect(taxableBase).toBe(0n);
  });

  it('detects and identifies mismatched totals submitted by client', () => {
    const input: QuotationInput = {
      clientId: '11111111-1111-1111-1111-111111111111',
      validUntil: '2026-12-31',
      subtotalPaise: 5000000,
      discountType: null,
      discountPaise: 0,
      taxablePaise: 5000000,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
      taxPaise: 0,
      totalPaise: 4000000, // Client tampered with total!
      gstApplied: false,
      taxType: 'none',
      items: [
        {
          description: 'Package item',
          quantity: 1,
          unitPricePaise: 5000000,
          lineTotalPaise: 5000000,
        },
      ],
    };

    const recomputed = recalculateQuotation(input);

    expect(recomputed.totalPaise).toBe(5000000);
    expect(input.totalPaise).not.toBe(recomputed.totalPaise);
  });

  it('correctly recalculates quotation with fixed discount and IGST', () => {
    const input: QuotationInput = {
      clientId: '11111111-1111-1111-1111-111111111111',
      validUntil: '2026-12-31',
      subtotalPaise: 10000000,
      discountType: 'fixed',
      discountFixedPaise: 1000000, // ₹10,000.00
      discountPaise: 1000000,
      taxablePaise: 9000000,
      totalPaise: 10620000,
      gstApplied: true,
      taxType: 'igst',
      items: [
        {
          id: 'b1111111-1111-1111-1111-111111111111',
          description: 'Inter-state shoot coverage',
          quantity: 1,
          unitPricePaise: 10000000,
          lineTotalPaise: 10000000,
        },
      ],
    };

    const recomputed = recalculateQuotation(input);
    expect(recomputed.subtotalPaise).toBe(10000000);
    expect(recomputed.discountPaise).toBe(1000000);
    expect(recomputed.taxablePaise).toBe(9000000);
    expect(recomputed.igstPaise).toBe(1620000); // 18% of 90,000
    expect(recomputed.cgstPaise).toBe(0);
    expect(recomputed.sgstPaise).toBe(0);
    expect(recomputed.totalPaise).toBe(10620000);
  });

  it('correctly recalculates quotation with percentage discount', () => {
    const input: QuotationInput = {
      clientId: '11111111-1111-1111-1111-111111111111',
      validUntil: '2026-12-31',
      subtotalPaise: 20000000,
      discountType: 'percent',
      discountBps: 1000, // 10%
      discountPaise: 2000000,
      taxablePaise: 18000000,
      totalPaise: 21240000,
      gstApplied: true,
      taxType: 'cgst_sgst',
      items: [
        {
          description: 'Package item',
          quantity: 1,
          unitPricePaise: 20000000,
          lineTotalPaise: 20000000,
        },
      ],
    };

    const recomputed = recalculateQuotation(input);
    expect(recomputed.subtotalPaise).toBe(20000000);
    expect(recomputed.discountPaise).toBe(2000000);
    expect(recomputed.taxablePaise).toBe(18000000);
    expect(recomputed.cgstPaise).toBe(1620000);
    expect(recomputed.sgstPaise).toBe(1620000);
    expect(recomputed.totalPaise).toBe(21240000);
  });

  it('handles missing discount values when discountType is provided', () => {
    const inputPercent: QuotationInput = {
      clientId: '11111111-1111-1111-1111-111111111111',
      validUntil: '2026-12-31',
      subtotalPaise: 1000000,
      discountType: 'percent',
      taxablePaise: 1000000,
      totalPaise: 1000000,
      items: [{ description: 'Item', quantity: 1, unitPricePaise: 1000000, lineTotalPaise: 1000000 }],
    };
    expect(recalculateQuotation(inputPercent).discountPaise).toBe(0);

    const inputFixed: QuotationInput = {
      clientId: '11111111-1111-1111-1111-111111111111',
      validUntil: '2026-12-31',
      subtotalPaise: 1000000,
      discountType: 'fixed',
      taxablePaise: 1000000,
      totalPaise: 1000000,
      items: [{ description: 'Item', quantity: 1, unitPricePaise: 1000000, lineTotalPaise: 1000000 }],
    };
    expect(recalculateQuotation(inputFixed).discountPaise).toBe(0);
  });
});
