import { UserRole } from '@/lib/constants/permissions';

export type ServiceCategory =
  | 'photography'
  | 'videography'
  | 'cinematography'
  | 'drone'
  | 'album'
  | 'editing'
  | 'other';

export type ServiceUnit = 'hour' | 'day' | 'session' | 'item' | 'fixed';

export type EventType =
  | 'wedding'
  | 'pre_wedding'
  | 'engagement'
  | 'reception'
  | 'birthday'
  | 'corporate'
  | 'maternity'
  | 'anniversary'
  | 'other';

export type EnquirySource =
  | 'instagram'
  | 'google'
  | 'referral'
  | 'wedding_wire'
  | 'walk_in'
  | 'returning_client'
  | 'other';

export type EnquiryStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal_sent'
  | 'won'
  | 'lost'
  | 'junk';

export type FollowUpStatus = 'open' | 'completed' | 'cancelled';

export type QuotationStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'superseded';

export type TaxType = 'none' | 'cgst_sgst' | 'igst';

export type DiscountType = 'percent' | 'fixed';

export interface BusinessSettings {
  id: number;
  studioName: string;
  tagline?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  pan?: string | null;
  bankName?: string | null;
  bankAccountHolder?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  upiId?: string | null;
  setupMode: boolean;
  setupLockedAt?: string | null;
  gstEnabled: boolean;
  defaultCgstBps: number;
  defaultSgstBps: number;
  defaultIgstBps: number;
  logoPath?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  letterheadLayout?: string | null;
  emailSignature?: string | null;
  socialLinks?: Record<string, string>;
  defaultQuoteValidityDays: number;
  defaultQuoteTerms?: string | null;
  defaultInvoiceTerms?: string | null;
  defaultPaymentTerms?: string | null;
  receiptNote?: string | null;
  updatedAt: string;
}

export interface DocumentNumberConfig {
  docType: 'QT' | 'INV' | 'RCP' | 'BK' | 'CN';
  prefix: string;
  padding: number;
  yearFormat: 'YYYY' | 'YY';
  fyStartMonth: number;
  updatedAt: string;
}

export interface EmailTemplate {
  code: string;
  subject: string;
  bodyHtml: string;
  isActive: boolean;
  updatedAt: string;
}

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  isBuiltin: boolean;
  isArchived: boolean;
  sort: number;
}

export interface ClientPhone {
  id?: string;
  clientId?: string;
  phoneE164: string;
  label?: string | null;
  isPrimary: boolean;
  isInternational: boolean;
}

export interface ClientEmail {
  id?: string;
  clientId?: string;
  email: string;
  isPrimary: boolean;
}

export interface Client {
  id: string;
  fullName: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  referralSource?: string | null;
  notes?: string | null;
  phones: ClientPhone[];
  emails: ClientEmail[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ClientDuplicateMatch {
  clientId: string;
  fullName: string;
  matchField: 'phone' | 'email' | 'name';
  matchValue: string;
}

export interface Enquiry {
  id: string;
  clientId?: string | null;
  clientName?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
  eventType: EventType;
  eventDate?: string | null;
  eventDateIsApprox?: boolean | null;
  venue?: string | null;
  guestCount?: number | null;
  servicesInterested?: string[] | null;
  budgetPaise?: number | bigint | null;
  source: EnquirySource;
  status: EnquiryStatus;
  assignedTo?: string | null;
  assigneeName?: string | null;
  message?: string | null;
  notes?: string | null;
  lostReason?: string | null;
  convertedBookingId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: string;
  enquiryId: string;
  dueAt: string;
  note?: string | null;
  assignedTo: string;
  assignedUserName?: string | null;
  status: FollowUpStatus;
  completedAt?: string | null;
  completedBy?: string | null;
  createdAt: string;
}

export interface Activity {
  id: string;
  clientId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown> | null;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: UserRole | null;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  description?: string | null;
  unit: ServiceUnit;
  isActive: boolean;
  showOnWebsite: boolean;
  sort: number;
  currentPricePaise?: number | null;
  priceEffectiveFrom?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface PackageItem {
  serviceId: string;
  serviceName: string;
  unit: string;
  quantity: number;
}

export interface Package {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  showOnWebsite: boolean;
  sort: number;
  currentPricePaise?: number | null;
  priceEffectiveFrom?: string | null;
  items?: PackageItem[];
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface QuotationItem {
  id?: string;
  quotationId?: string;
  sort: number;
  serviceId?: string | null;
  packageId?: string | null;
  serviceArchivedFlag?: boolean | null;
  description: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  hsnSacCode?: string | null;
  cgstBps?: number | null;
  sgstBps?: number | null;
  igstBps?: number | null;
  lineDiscountPaise?: number;
  lineTaxablePaise?: number;
  cgstPaise?: number;
  sgstPaise?: number;
  igstPaise?: number;
}

export interface Quotation {
  id: string;
  rootId: string;
  versionNo: number;
  isCurrent: boolean;
  quotationNumber: string;
  clientId: string;
  clientName?: string | null;
  enquiryId?: string | null;
  status: QuotationStatus;
  derivedStatus?: QuotationStatus | 'expired';
  eventDate?: string | null;
  validUntil: string;
  subtotalPaise: number;
  discountType?: DiscountType | null;
  discountBps?: number | null;
  discountFixedPaise?: number | null;
  discountPaise: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  taxPaise: number;
  totalPaise: number;
  gstApplied: boolean;
  taxType: TaxType;
  businessGstin?: string | null;
  clientGstin?: string | null;
  placeOfSupplyStateCode?: string | null;
  notesToClient?: string | null;
  internalNotes?: string | null;
  terms?: string | null;
  pdfPath?: string | null;
  pdfGeneratedAt?: string | null;
  sentAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  items: QuotationItem[];
  createdAt: string;
  updatedAt: string;
}
