import { z } from 'zod';

export const paymentMethodEnum = z.enum([
  'bank_transfer',
  'upi',
  'cash',
  'card',
  'cheque',
  'other',
]);

export const invoiceStatusEnum = z.enum([
  'draft',
  'sent',
  'partially_paid',
  'paid',
  'cancelled',
]);

export const creditNoteStatusEnum = z.enum(['draft', 'issued', 'applied', 'cancelled']);

// 1. Invoice Item Schema
export const invoiceItemSchema = z.object({
  id: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional().nullable(),
  packageId: z.string().uuid().optional().nullable(),
  description: z.string().trim().min(1, 'Item description is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPricePaise: z.number().int().min(0, 'Unit price must be non-negative'),
  lineTotalPaise: z.number().int().min(0, 'Line total must be non-negative'),
  sort: z.number().int().default(0),
});

export type InvoiceItemInput = z.input<typeof invoiceItemSchema>;

// 2. Invoice Schema
export const invoiceSchema = z
  .object({
    id: z.string().uuid().optional(),
    bookingId: z.string().uuid('Valid booking ID required'),
    clientId: z.string().uuid('Valid client ID required'),
    issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Issue date must be YYYY-MM-DD'),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD'),
    notesToClient: z.string().trim().optional().nullable(),
    internalNotes: z.string().trim().optional().nullable(),
    terms: z.string().trim().optional().nullable(),
    paymentTerms: z.string().trim().optional().nullable(),
    discountType: z.enum(['percent', 'fixed']).optional().nullable(),
    discountValue: z.number().min(0).optional().nullable(),
    cgstRateBps: z.number().int().min(0).default(0),
    sgstRateBps: z.number().int().min(0).default(0),
    igstRateBps: z.number().int().min(0).default(0),
    items: z.array(invoiceItemSchema).min(1, 'At least one invoice item is required'),
  })
  .refine((data) => data.dueDate >= data.issueDate, {
    message: 'Due date cannot be before issue date',
    path: ['dueDate'],
  });

export type InvoiceInput = z.input<typeof invoiceSchema>;

// 3. Payment Allocation Input Schema
export const paymentAllocationSchema = z.object({
  invoiceId: z.string().uuid('Valid invoice ID required'),
  amountPaise: z.number().int().min(1, 'Allocation amount must be at least 1 paisa'),
});

// 4. Record Payment Schema (D-21: full allocation rule)
export const recordPaymentSchema = z
  .object({
    clientId: z.string().uuid('Valid client ID required'),
    paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be YYYY-MM-DD'),
    amountPaise: z.number().int().min(1, 'Payment amount must be greater than zero'),
    method: paymentMethodEnum,
    referenceNumber: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    allocations: z
      .array(paymentAllocationSchema)
      .min(1, 'At least one invoice allocation is required'),
  })
  .refine(
    (data) => {
      const totalAllocated = data.allocations.reduce((acc, curr) => acc + curr.amountPaise, 0);
      return totalAllocated === data.amountPaise;
    },
    {
      message: 'Sum of invoice allocations must equal total payment amount (D-21)',
      path: ['allocations'],
    }
  );

export type RecordPaymentInput = z.input<typeof recordPaymentSchema>;

// 5. Void Payment Schema
export const voidPaymentSchema = z.object({
  paymentId: z.string().uuid('Valid payment ID required'),
  reason: z.string().trim().min(3, 'Void reason must be at least 3 characters'),
});

export type VoidPaymentInput = z.input<typeof voidPaymentSchema>;

// 6. Credit Note Item Schema
export const creditNoteItemSchema = z.object({
  description: z.string().trim().min(1, 'Description is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPricePaise: z.number().int().min(1, 'Unit price must be greater than zero'),
  sort: z.number().int().default(0),
});

// 7. Issue Credit Note Schema
export const issueCreditNoteSchema = z.object({
  invoiceId: z.string().uuid('Valid invoice ID required'),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Issue date must be YYYY-MM-DD'),
  reason: z.string().trim().min(3, 'Credit note reason must be at least 3 characters'),
  items: z.array(creditNoteItemSchema).min(1, 'At least one credit item required'),
});

export type IssueCreditNoteInput = z.input<typeof issueCreditNoteSchema>;

// 8. Cancel Invoice Schema
export const cancelInvoiceSchema = z.object({
  invoiceId: z.string().uuid('Valid invoice ID required'),
  reason: z.string().trim().min(3, 'Cancellation reason must be at least 3 characters'),
});

export type CancelInvoiceInput = z.input<typeof cancelInvoiceSchema>;

// 9. Expense Schema
export const expenseSchema = z.object({
  id: z.string().uuid().optional(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expense date must be YYYY-MM-DD'),
  categoryId: z.string().uuid('Valid category ID required'),
  description: z.string().trim().min(2, 'Description must be at least 2 characters'),
  amountPaise: z.number().int().min(1, 'Expense amount must be greater than zero'),
  vendor: z.string().trim().optional().nullable(),
  paymentMethod: paymentMethodEnum.optional().nullable(),
  referenceNumber: z.string().trim().optional().nullable(),
  receiptPath: z.string().trim().optional().nullable(),
  bookingId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export type ExpenseInput = z.input<typeof expenseSchema>;

// 10. Manual Income Schema
export const manualIncomeSchema = z.object({
  id: z.string().uuid().optional(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Entry date must be YYYY-MM-DD'),
  description: z.string().trim().min(2, 'Description must be at least 2 characters'),
  amountPaise: z.number().int().min(1, 'Income amount must be greater than zero'),
  paymentMethod: paymentMethodEnum.optional().nullable(),
  referenceNumber: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export type ManualIncomeInput = z.input<typeof manualIncomeSchema>;

// 11. Record Crew Payment Schema
export const recordCrewPaymentSchema = z.object({
  crewPayRecordId: z.string().uuid('Valid crew pay record ID required'),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be YYYY-MM-DD'),
  amountPaise: z.number().int().min(1, 'Payment amount must be greater than zero'),
  method: paymentMethodEnum,
  referenceNumber: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export type RecordCrewPaymentInput = z.input<typeof recordCrewPaymentSchema>;
