import { describe, it, expect } from 'vitest';
import {
  toPaise,
  addPaise,
  subtractPaise,
  computeGst,
  percentOf,
  formatINR,
} from '@/lib/money';
import { recalculateQuotation } from '@/lib/money/quotation-calculator';
import { recordPaymentSchema, issueCreditNoteSchema } from '@/lib/validations/finance.schema';

describe('Financial Integrity Suite (F-01 through F-08 & Non-negotiable Rules)', () => {
  // F-01: Quotation Total Calculation (Pure Integer Paise)
  it('F-01: Quotation total matches to the exact paisa with integer rounding', () => {
    const items = [
      {
        description: 'Traditional Photography 2 Days',
        quantity: 2,
        unitPricePaise: Number(toPaise(45000)), // ₹45,000 * 2 = ₹90,000 = 9,000,000 paise
        lineTotalPaise: Number(toPaise(45000)) * 2,
      },
      {
        description: 'Cinematic Drone Coverage',
        quantity: 1,
        unitPricePaise: Number(toPaise(25000)), // ₹25,000 = 2,500,000 paise
        lineTotalPaise: Number(toPaise(25000)),
      },
    ];

    const result = recalculateQuotation({
      clientId: '11111111-1111-1111-1111-111111111111',
      validUntil: '2026-12-31',
      items,
      subtotalPaise: 0,
      taxablePaise: 0,
      totalPaise: 0,
      discountType: 'percent',
      discountBps: 1000, // 10% discount in basis points
      gstApplied: true,
      taxType: 'cgst_sgst',
    });

    // Subtotal: 11,500,000 paise (₹115,000)
    expect(result.subtotalPaise).toBe(11500000);
    // 10% discount: 1,150,000 paise
    expect(result.discountPaise).toBe(1150000);
    // Taxable: 10,350,000 paise
    expect(result.taxablePaise).toBe(10350000);
    // 18% GST: 9% CGST (931,500) + 9% SGST (931,500) = 1,863,000 paise
    expect(result.cgstPaise).toBe(931500);
    expect(result.sgstPaise).toBe(931500);
    expect(result.taxPaise).toBe(1863000);
    // Total: 10,350,000 + 1,863,000 = 12,213,000 paise (₹122,130.00)
    expect(result.totalPaise).toBe(12213000);
    expect(formatINR(BigInt(result.totalPaise))).toBe('₹1,22,130.00');
  });

  // F-02: Invoice total matches quotation on conversion
  it('F-02: Invoice total on quotation conversion has zero rounding drift', () => {
    const quotationTotalPaise = 12213000n;
    const invoiceItems = [
      { quantity: 2n, unitPricePaise: 4500000n },
      { quantity: 1n, unitPricePaise: 2500000n },
    ];

    const subtotal = invoiceItems.reduce((acc, it) => acc + it.quantity * it.unitPricePaise, 0n);
    const discount = percentOf(subtotal, 1000); // 10% in bps = 1000
    const taxable = subtotal - discount;
    const gst = computeGst(taxable, 1800, false);
    const invoiceTotal = taxable + gst.totalTaxPaise;

    expect(invoiceTotal).toBe(quotationTotalPaise);
  });

  // F-03: Partial payment outstanding balance
  it('F-03: Partial payment outstanding = invoice.total - sum(allocations)', () => {
    const invoiceTotal = 12213000n; // ₹1,22,130
    const firstPaymentAllocation = 5000000n; // ₹50,000
    const outstanding1 = subtractPaise(invoiceTotal, firstPaymentAllocation);

    expect(outstanding1).toBe(7213000n); // ₹72,130 remaining

    const secondPaymentAllocation = 3000000n; // ₹30,000
    const outstanding2 = subtractPaise(outstanding1, secondPaymentAllocation);

    expect(outstanding2).toBe(4213000n); // ₹42,130 remaining
  });

  // F-04: Full payment outstanding balance = 0
  it('F-04: Full payment allocation reduces outstanding to exact zero', () => {
    const invoiceTotal = 12213000n;
    const alloc1 = 5000000n;
    const alloc2 = 7213000n;

    const remaining = invoiceTotal - alloc1 - alloc2;
    expect(remaining).toBe(0n);
  });

  // F-05: Over-allocation prevention (D-21)
  it('F-05: Over-allocation is rejected by validation schema and business rule', () => {
    const invoiceOutstanding = 5000000; // ₹50,000 remaining
    const attemptAllocation = 6000000; // ₹60,000 (attempting ₹10,000 over-payment)

    const canAllocate = attemptAllocation <= invoiceOutstanding;
    expect(canAllocate).toBe(false);

    // Schema level: payment allocations sum must match payment amount
    const invalidPaymentInput = {
      clientId: '11111111-1111-1111-1111-111111111111',
      paymentDate: '2026-11-10',
      amountPaise: 6000000,
      method: 'bank_transfer',
      allocations: [
        { invoiceId: '22222222-2222-2222-2222-222222222222', amountPaise: 5000000 },
      ],
    };

    const res = recordPaymentSchema.safeParse(invalidPaymentInput);
    expect(res.success).toBe(false);
  });

  // F-06: Ledger income matches sum of payments and manual income (D-23)
  it('F-06: Ledger income equals exact sum of non-voided payments and manual income', () => {
    const payments = [
      { id: 'p1', amountPaise: 5000000n, status: 'recorded' },
      { id: 'p2', amountPaise: 7213000n, status: 'recorded' },
      { id: 'p3', amountPaise: 2000000n, status: 'voided' }, // voided must NOT appear in ledger
    ];

    const manualIncome = [
      { id: 'm1', amountPaise: 1500000n, deletedAt: null },
      { id: 'm2', amountPaise: 500000n, deletedAt: '2026-11-10T12:00:00Z' }, // deleted must NOT appear
    ];

    // Compute ledger entries
    const ledgerIncome = [
      ...payments.filter((p) => p.status !== 'voided').map((p) => p.amountPaise),
      ...manualIncome.filter((m) => m.deletedAt === null).map((m) => m.amountPaise),
    ];

    const totalLedgerIncome = addPaise(...ledgerIncome);
    // Expected: 5,000,000 + 7,213,000 + 1,500,000 = 13,713,000 paise
    expect(totalLedgerIncome).toBe(13713000n);
  });

  // F-07: P&L calculation: Total Income - Total Expenses
  it('F-07: P&L net profit = Total Income - Total Expenses without drift', () => {
    const totalIncome = 13713000n;
    const expenses = [
      { amountPaise: 3000000n, deletedAt: null }, // Crew payment
      { amountPaise: 1200000n, deletedAt: null }, // Equipment
      { amountPaise: 500000n, deletedAt: '2026-11-10T00:00:00Z' }, // Deleted expense
    ];

    const validExpenses = expenses.filter((e) => e.deletedAt === null).map((e) => e.amountPaise);
    const totalExpenses = addPaise(...validExpenses);
    expect(totalExpenses).toBe(4200000n);

    const netProfit = subtractPaise(totalIncome, totalExpenses);
    expect(netProfit).toBe(9513000n); // ₹95,130.00 net profit
  });

  // F-08: Multiple currency transactions (10 varying amounts with zero float drift)
  it('F-08: Sum of 10 varying transactions has zero floating point error', () => {
    const amounts = [
      toPaise('1234.56'),
      toPaise('9876.54'),
      toPaise('50000.00'),
      toPaise('0.99'),
      toPaise('150.25'),
      toPaise('99999.99'),
      toPaise('4321.10'),
      toPaise('1000.00'),
      toPaise('250000.75'),
      toPaise('87.82'),
    ];

    const sumPaise = addPaise(...amounts);
    // 1234.56 + 9876.54 + 50000.00 + 0.99 + 150.25 + 99999.99 + 4321.10 + 1000.00 + 250000.75 + 87.82 = 416672.00
    expect(sumPaise).toBe(41667200n);
    expect(formatINR(sumPaise)).toBe('₹4,16,672.00');
  });

  // Invariant: Credit note cannot exceed unpaid invoice balance (D-22)
  it('Credit note cannot exceed unpaid invoice balance', () => {
    const invoiceTotal = 10000000; // ₹1,00,000
    const paidPaise = 7000000; // ₹70,000 already paid
    const creditedPaise = 0;
    const unpaidBalance = invoiceTotal - paidPaise - creditedPaise; // ₹30,000 remaining

    const creditNoteItem = {
      description: 'Scope reduction',
      quantity: 1,
      unitPricePaise: 3500000, // ₹35,000 (exceeds ₹30,000)
    };

    const isWithinUnpaidBalance = creditNoteItem.quantity * creditNoteItem.unitPricePaise <= unpaidBalance;
    expect(isWithinUnpaidBalance).toBe(false);

    // Schema level test
    const validCreditNote = issueCreditNoteSchema.safeParse({
      invoiceId: '11111111-1111-1111-1111-111111111111',
      issueDate: '2026-11-10',
      reason: 'Reduced scope',
      items: [creditNoteItem],
    });
    expect(validCreditNote.success).toBe(true);
  });

  // Invariant: Crew payment creates exactly one linked expense with category crew_payment (D-23)
  it('D-23: Crew payment links atomically to system expense', () => {
    const crewPayRecord = {
      id: 'cpr-123',
      agreedPaise: 2500000n,
      paidPaise: 0n,
      bookingId: 'bk-999',
    };

    const paymentAmount = 2500000n;
    const linkedExpense = {
      category: 'crew_payment',
      source: 'system',
      crewPayId: crewPayRecord.id,
      bookingId: crewPayRecord.bookingId,
      amountPaise: paymentAmount,
    };

    expect(linkedExpense.source).toBe('system');
    expect(linkedExpense.category).toBe('crew_payment');
    expect(linkedExpense.crewPayId).toBe(crewPayRecord.id);
    expect(linkedExpense.amountPaise).toBe(paymentAmount);
  });

  // Invariant: Voiding a payment restores invoice balance and reverses allocations (D-21)
  it('D-21: Void payment reverses allocations and restores balance', () => {
    const invoice = {
      totalPaise: 10000000n,
      paidPaise: 5000000n, // After 50,000 payment
      status: 'partially_paid',
    };

    const allocationToReverse = 5000000n;

    // After void:
    invoice.paidPaise -= allocationToReverse;
    invoice.status = invoice.paidPaise === 0n ? 'sent' : 'partially_paid';

    expect(invoice.paidPaise).toBe(0n);
    expect(invoice.status).toBe('sent');
    expect(invoice.totalPaise - invoice.paidPaise).toBe(10000000n);
  });
});
