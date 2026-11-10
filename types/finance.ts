import { DiscountType } from '@/types/sales';

export type PaymentMethod = 'bank_transfer' | 'upi' | 'cash' | 'card' | 'cheque' | 'other';
export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'cancelled';
export type InvoiceDisplayStatus = InvoiceStatus | 'overdue';

export type CreditNoteStatus = 'draft' | 'issued' | 'applied' | 'cancelled';
export type PaymentStatus = 'recorded' | 'voided';

export interface InvoiceItem {
  id?: string;
  invoiceId?: string;
  serviceId?: string | null;
  packageId?: string | null;
  description: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  sort: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  bookingNumber?: string | null;
  clientId: string;
  clientName?: string | null;
  status: InvoiceStatus;
  displayStatus?: InvoiceDisplayStatus;
  issueDate: string;
  dueDate: string;
  subtotalPaise: number;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  discountPaise: number;
  taxableAmountPaise: number;
  cgstRateBps: number;
  cgstPaise: number;
  sgstRateBps: number;
  sgstPaise: number;
  igstRateBps: number;
  igstPaise: number;
  totalTaxPaise: number;
  totalPaise: number;
  paidPaise: number;
  creditedPaise: number;
  balancePaise: number;
  notesToClient?: string | null;
  internalNotes?: string | null;
  terms?: string | null;
  paymentTerms?: string | null;
  pdfPath?: string | null;
  pdfGeneratedAt?: string | null;
  sentAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItem[];
}

export interface PaymentAllocation {
  id?: string;
  paymentId?: string;
  invoiceId: string;
  invoiceNumber?: string;
  amountPaise: number;
  reversedAt?: string | null;
  reversedBy?: string | null;
  reversedReason?: string | null;
  createdAt?: string;
}

export interface Payment {
  id: string;
  clientId: string;
  clientName?: string | null;
  paymentDate: string;
  amountPaise: number;
  method: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
  status: PaymentStatus;
  voidedAt?: string | null;
  voidedBy?: string | null;
  voidReason?: string | null;
  recordedBy: string;
  createdAt: string;
  receiptNumber?: string | null;
  allocations?: PaymentAllocation[];
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  paymentId: string;
  pdfPath?: string | null;
  generatedAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

export interface CreditNoteItem {
  id?: string;
  creditNoteId?: string;
  description: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  sort: number;
}

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  invoiceId: string;
  invoiceNumber?: string;
  clientId: string;
  clientName?: string | null;
  status: CreditNoteStatus;
  issueDate: string;
  reason: string;
  subtotalPaise: number;
  discountPaise: number;
  taxableAmountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
  totalPaise: number;
  pdfPath?: string | null;
  pdfGeneratedAt?: string | null;
  sentAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: CreditNoteItem[];
}

export interface Expense {
  id: string;
  expenseDate: string;
  categoryId: string;
  categoryCode?: string;
  categoryName?: string;
  description: string;
  amountPaise: number;
  vendor?: string | null;
  paymentMethod?: PaymentMethod | null;
  referenceNumber?: string | null;
  receiptPath?: string | null;
  bookingId?: string | null;
  bookingNumber?: string | null;
  crewPayId?: string | null;
  source: 'manual' | 'system';
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ManualIncomeEntry {
  id: string;
  entryDate: string;
  description: string;
  amountPaise: number;
  paymentMethod?: PaymentMethod | null;
  referenceNumber?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface LedgerEntry {
  id: string;
  entryDate: string;
  type: 'income' | 'expense';
  category: string;
  amountPaise: number;
  source: string;
  referenceType: string;
  referenceId: string;
  description: string;
  paymentMethod?: PaymentMethod | null;
  referenceNumber?: string | null;
  createdAt: string;
}

export interface ProfitAndLossReport {
  startDate: string;
  endDate: string;
  totalIncomePaise: number;
  totalExpensesPaise: number;
  netProfitPaise: number;
  incomeByCategory: Array<{ category: string; amountPaise: number }>;
  expensesByCategory: Array<{ category: string; amountPaise: number }>;
}
