export interface BusinessProfilePdf {
  businessName: string;
  legalName?: string;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankAccountType?: string | null;
  upiId?: string | null;
}

export interface ClientProfilePdf {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  billingAddress?: string | null;
  gstin?: string | null;
}

export interface DocumentLinePdf {
  description: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  cgstPaise?: number;
  sgstPaise?: number;
  igstPaise?: number;
}

export interface QuotationPdfData {
  quotationNumber: string;
  version: number;
  issueDate: string;
  validUntil: string;
  business: BusinessProfilePdf;
  client: ClientProfilePdf;
  items: DocumentLinePdf[];
  subtotalPaise: number;
  discountType?: 'percent' | 'fixed' | null;
  discountBps?: number | null;
  discountFixedPaise?: number | null;
  discountPaise: number;
  taxablePaise: number;
  gstApplied: boolean;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
  notesToClient?: string | null;
  terms?: string | null;
  isDemo?: boolean;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  business: BusinessProfilePdf;
  client: ClientProfilePdf;
  items: DocumentLinePdf[];
  subtotalPaise: number;
  discountType?: 'percent' | 'fixed' | null;
  discountBps?: number | null;
  discountFixedPaise?: number | null;
  discountPaise: number;
  taxablePaise: number;
  gstApplied: boolean;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
  paidPaise: number;
  balancePaise: number;
  notesToClient?: string | null;
  terms?: string | null;
  isDemo?: boolean;
}

export interface ReceiptPdfData {
  receiptNumber: string;
  paymentDate: string;
  amountPaise: number;
  paymentMethod: string;
  referenceNumber?: string | null;
  status: 'confirmed' | 'voided';
  business: BusinessProfilePdf;
  client: ClientProfilePdf;
  allocations: Array<{
    invoiceNumber: string;
    allocatedAmountPaise: number;
  }>;
  notes?: string | null;
  isDemo?: boolean;
}

export interface CreditNotePdfData {
  creditNoteNumber: string;
  invoiceNumber: string;
  issueDate: string;
  reason: string;
  business: BusinessProfilePdf;
  client: ClientProfilePdf;
  items: DocumentLinePdf[];
  totalPaise: number;
  notes?: string | null;
  isDemo?: boolean;
}

export interface BookingConfirmationPdfData {
  bookingNumber: string;
  confirmationDate: string;
  client: ClientProfilePdf;
  business: BusinessProfilePdf;
  events: Array<{
    name: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    venueName?: string | null;
  }>;
  crewRoles: Array<{
    event: string;
    role: string;
    memberName?: string;
  }>;
  deliverables: Array<{
    description: string;
    quantity: number;
  }>;
  totalContractPaise: number;
  notes?: string | null;
  isDemo?: boolean;
}
