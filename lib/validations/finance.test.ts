import { describe, it, expect } from 'vitest';
import {
  invoiceItemSchema,
  invoiceSchema,
  paymentAllocationSchema,
  recordPaymentSchema,
  voidPaymentSchema,
  creditNoteItemSchema,
  issueCreditNoteSchema,
  cancelInvoiceSchema,
  expenseSchema,
  manualIncomeSchema,
  recordCrewPaymentSchema,
} from './finance.schema';

describe('Finance Validation Schemas (100% coverage)', () => {
  const dummyUuid = '11111111-1111-1111-1111-111111111111';
  const dummyUuid2 = '22222222-2222-2222-2222-222222222222';

  describe('invoiceItemSchema', () => {
    it('validates a valid invoice item', () => {
      const res = invoiceItemSchema.safeParse({
        description: 'Drone Coverage',
        quantity: 2,
        unitPricePaise: 2500000,
        lineTotalPaise: 5000000,
        sort: 1,
      });
      expect(res.success).toBe(true);
    });

    it('rejects empty description or invalid numbers', () => {
      expect(
        invoiceItemSchema.safeParse({
          description: '',
          quantity: 0,
          unitPricePaise: -1,
          lineTotalPaise: -1,
        }).success
      ).toBe(false);
    });
  });

  describe('invoiceSchema', () => {
    it('validates a correct invoice', () => {
      const res = invoiceSchema.safeParse({
        bookingId: dummyUuid,
        clientId: dummyUuid2,
        issueDate: '2026-11-10',
        dueDate: '2026-11-20',
        notesToClient: 'Thank you',
        discountType: 'percent',
        discountValue: 10,
        items: [
          {
            description: 'Item 1',
            quantity: 1,
            unitPricePaise: 10000,
            lineTotalPaise: 10000,
          },
        ],
      });
      expect(res.success).toBe(true);
    });

    it('rejects when due date is before issue date', () => {
      const res = invoiceSchema.safeParse({
        bookingId: dummyUuid,
        clientId: dummyUuid2,
        issueDate: '2026-11-20',
        dueDate: '2026-11-10',
        items: [
          {
            description: 'Item 1',
            quantity: 1,
            unitPricePaise: 10000,
            lineTotalPaise: 10000,
          },
        ],
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toContain('Due date cannot be before issue date');
      }
    });

    it('rejects empty items or invalid dates', () => {
      expect(
        invoiceSchema.safeParse({
          bookingId: 'invalid',
          clientId: 'invalid',
          issueDate: 'not-a-date',
          dueDate: 'not-a-date',
          items: [],
        }).success
      ).toBe(false);
    });
  });

  describe('paymentAllocationSchema', () => {
    it('validates valid allocation', () => {
      const res = paymentAllocationSchema.safeParse({
        invoiceId: dummyUuid,
        amountPaise: 50000,
      });
      expect(res.success).toBe(true);
    });

    it('rejects invalid invoice ID or non-positive amount', () => {
      expect(
        paymentAllocationSchema.safeParse({
          invoiceId: 'invalid',
          amountPaise: 0,
        }).success
      ).toBe(false);
    });
  });

  describe('recordPaymentSchema', () => {
    it('validates matching payment amount and allocations sum', () => {
      const res = recordPaymentSchema.safeParse({
        clientId: dummyUuid,
        paymentDate: '2026-11-10',
        amountPaise: 100000,
        method: 'bank_transfer',
        referenceNumber: 'NEFT12345',
        allocations: [
          { invoiceId: dummyUuid, amountPaise: 60000 },
          { invoiceId: dummyUuid2, amountPaise: 40000 },
        ],
      });
      expect(res.success).toBe(true);
    });

    it('rejects when allocations sum does not match payment amount (D-21)', () => {
      const res = recordPaymentSchema.safeParse({
        clientId: dummyUuid,
        paymentDate: '2026-11-10',
        amountPaise: 100000,
        method: 'upi',
        allocations: [{ invoiceId: dummyUuid, amountPaise: 70000 }],
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toContain(
          'Sum of invoice allocations must equal total payment amount (D-21)'
        );
      }
    });

    it('rejects invalid client ID or empty allocations', () => {
      expect(
        recordPaymentSchema.safeParse({
          clientId: 'invalid',
          paymentDate: '2026-11-10',
          amountPaise: 1000,
          method: 'upi',
          allocations: [],
        }).success
      ).toBe(false);
    });
  });

  describe('voidPaymentSchema', () => {
    it('validates valid void request', () => {
      const res = voidPaymentSchema.safeParse({
        paymentId: dummyUuid,
        reason: 'Client cheque bounced at bank',
      });
      expect(res.success).toBe(true);
    });

    it('rejects short reason or invalid paymentId', () => {
      expect(
        voidPaymentSchema.safeParse({
          paymentId: 'invalid',
          reason: 'no',
        }).success
      ).toBe(false);
    });
  });

  describe('issueCreditNoteSchema', () => {
    it('validates credit note request', () => {
      const res = issueCreditNoteSchema.safeParse({
        invoiceId: dummyUuid,
        issueDate: '2026-11-10',
        reason: 'Client downscaled scope by 1 day',
        items: [
          {
            description: 'Reduced coverage',
            quantity: 1,
            unitPricePaise: 20000,
          },
        ],
      });
      expect(res.success).toBe(true);
    });

    it('rejects short reason or empty items', () => {
      expect(
        issueCreditNoteSchema.safeParse({
          invoiceId: dummyUuid,
          issueDate: '2026-11-10',
          reason: 'ab',
          items: [],
        }).success
      ).toBe(false);
    });
  });

  describe('creditNoteItemSchema', () => {
    it('validates item schema', () => {
      const res = creditNoteItemSchema.safeParse({
        description: 'Line item',
        quantity: 1,
        unitPricePaise: 500,
      });
      expect(res.success).toBe(true);
    });

    it('rejects invalid values', () => {
      expect(
        creditNoteItemSchema.safeParse({
          description: '',
          quantity: 0,
          unitPricePaise: 0,
        }).success
      ).toBe(false);
    });
  });

  describe('cancelInvoiceSchema', () => {
    it('validates valid cancel request', () => {
      const res = cancelInvoiceSchema.safeParse({
        invoiceId: dummyUuid,
        reason: 'Incorrect package selected by client',
      });
      expect(res.success).toBe(true);
    });

    it('rejects short reason', () => {
      expect(
        cancelInvoiceSchema.safeParse({
          invoiceId: dummyUuid,
          reason: 'x',
        }).success
      ).toBe(false);
    });
  });

  describe('expenseSchema', () => {
    it('validates valid expense', () => {
      const res = expenseSchema.safeParse({
        expenseDate: '2026-11-10',
        categoryId: dummyUuid,
        description: 'Hard drives for backup',
        amountPaise: 1500000,
        vendor: 'Amazon',
        paymentMethod: 'card',
      });
      expect(res.success).toBe(true);
    });

    it('rejects invalid amounts and dates', () => {
      expect(
        expenseSchema.safeParse({
          expenseDate: 'bad-date',
          categoryId: 'invalid',
          description: 'a',
          amountPaise: 0,
        }).success
      ).toBe(false);
    });
  });

  describe('manualIncomeSchema', () => {
    it('validates valid manual income', () => {
      const res = manualIncomeSchema.safeParse({
        entryDate: '2026-11-10',
        description: 'Old camera gear sale',
        amountPaise: 4500000,
        paymentMethod: 'bank_transfer',
      });
      expect(res.success).toBe(true);
    });

    it('rejects invalid entry', () => {
      expect(
        manualIncomeSchema.safeParse({
          entryDate: 'bad',
          description: '',
          amountPaise: -5,
        }).success
      ).toBe(false);
    });
  });

  describe('recordCrewPaymentSchema', () => {
    it('validates valid crew payment input', () => {
      const res = recordCrewPaymentSchema.safeParse({
        crewPayRecordId: dummyUuid,
        paymentDate: '2026-11-10',
        amountPaise: 1500000,
        method: 'bank_transfer',
        referenceNumber: 'IMPS9988',
      });
      expect(res.success).toBe(true);
    });

    it('rejects invalid crew pay record or amount', () => {
      expect(
        recordCrewPaymentSchema.safeParse({
          crewPayRecordId: 'bad',
          paymentDate: 'bad',
          amountPaise: 0,
          method: 'cash',
        }).success
      ).toBe(false);
    });
  });
});
