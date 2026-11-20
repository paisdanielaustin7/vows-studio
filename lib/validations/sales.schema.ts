import { z } from 'zod';

export const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const inPhoneRegex = /^\+91[6-9]\d{9}$/;

// 1. Business Settings Schema
export const businessSettingsSchema = z.object({
  studioName: z.string().trim().min(1, 'Studio name is required'),
  tagline: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email('Invalid email').optional().nullable(),
  website: z.string().trim().url('Invalid website URL').optional().nullable(),
  addressLine1: z.string().trim().optional().nullable(),
  addressLine2: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  stateCode: z.string().length(2, 'State code must be 2 digits').optional().nullable(),
  pincode: z.string().trim().length(6, 'Pincode must be 6 digits').optional().nullable(),
  gstin: z.string().trim().regex(gstRegex, 'Invalid GSTIN format').optional().nullable().or(z.literal('')),
  pan: z.string().trim().regex(panRegex, 'Invalid PAN format').optional().nullable().or(z.literal('')),
  bankName: z.string().trim().optional().nullable(),
  bankAccountHolder: z.string().trim().optional().nullable(),
  bankAccountNumber: z.string().trim().optional().nullable(),
  bankIfsc: z.string().trim().regex(ifscRegex, 'Invalid IFSC format').optional().nullable().or(z.literal('')),
  upiId: z.string().trim().optional().nullable(),
  gstEnabled: z.boolean().default(false),
  defaultCgstBps: z.number().int().min(0).max(5000).default(900),
  defaultSgstBps: z.number().int().min(0).max(5000).default(900),
  defaultIgstBps: z.number().int().min(0).max(10000).default(1800),
  logoPath: z.string().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional().nullable(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional().nullable(),
  letterheadLayout: z.string().optional().default('classic'),
  emailSignature: z.string().optional().nullable(),
  socialLinks: z.record(z.string(), z.string()).optional().nullable(),
  defaultQuoteValidityDays: z.number().int().min(1).max(365).default(30),
  defaultQuoteTerms: z.string().optional().nullable(),
  defaultInvoiceTerms: z.string().optional().nullable(),
  defaultPaymentTerms: z.string().optional().nullable(),
  receiptNote: z.string().optional().nullable(),
});

export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;

// 2. Document Number Config Schema
export const documentNumberConfigSchema = z.object({
  docType: z.enum(['QT', 'INV', 'RCP', 'BK', 'CN']),
  prefix: z.string().trim().min(1).max(10),
  padding: z.number().int().min(1).max(10),
  yearFormat: z.enum(['YYYY', 'YY']),
  fyStartMonth: z.number().int().min(1).max(12),
});

export type DocumentNumberConfigInput = z.infer<typeof documentNumberConfigSchema>;

// 3. Email Template Schema
export const emailTemplateSchema = z.object({
  code: z.enum([
    'quotation',
    'invoice',
    'receipt',
    'payment_reminder',
    'review_request',
    'invitation',
    'password_reset',
  ]),
  subject: z.string().trim().min(1, 'Subject is required'),
  bodyHtml: z.string().trim().min(1, 'Body is required'),
  isActive: z.boolean().default(true),
});

export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;

// 4. Expense Category Schema
export const expenseCategorySchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1, 'Category name is required'),
  sort: z.number().int().default(0),
});

export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;

// 5. Client Phones & Emails
export const clientPhoneSchema = z.object({
  id: z.string().uuid().optional(),
  phoneE164: z.string().trim().min(1, 'Phone number is required'),
  label: z.string().trim().default('Mobile'),
  isPrimary: z.boolean().default(false),
  isInternational: z.boolean().default(false),
}).refine(
  (data) => data.isInternational || inPhoneRegex.test(data.phoneE164),
  { message: 'Indian phone number must be in E.164 format (+91XXXXXXXXXX)', path: ['phoneE164'] }
);

export const clientEmailSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().trim().email('Invalid email address'),
  isPrimary: z.boolean().default(false),
});

// 6. Client Schema
export const clientSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().trim().min(2, 'Client name must be at least 2 characters'),
  addressLine1: z.string().trim().optional().nullable(),
  addressLine2: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  stateCode: z.string().length(2, 'State code must be 2 digits').optional().nullable(),
  pincode: z.string().trim().length(6, 'Pincode must be 6 digits').optional().nullable(),
  gstin: z.string().trim().regex(gstRegex, 'Invalid GSTIN format').optional().nullable().or(z.literal('')),
  referralSource: z.enum([
    'instagram',
    'google',
    'referral',
    'wedding_wire',
    'walk_in',
    'returning_client',
    'other',
  ]).default('other'),
  notes: z.string().trim().optional().nullable(),
  phones: z.array(clientPhoneSchema).min(1, 'At least one phone number is required').max(3, 'Maximum 3 phone numbers allowed'),
  emails: z.array(clientEmailSchema).max(2, 'Maximum 2 email addresses allowed').default([]),
}).refine(
  (data) => data.phones.some((p) => p.isPrimary),
  { message: 'Exactly one phone number must be primary', path: ['phones'] }
);

export type ClientInput = z.infer<typeof clientSchema>;

// 7. Service Schema
export const serviceCategoryEnum = z.enum([
  'photography',
  'videography',
  'cinematography',
  'drone',
  'album',
  'editing',
  'other',
]);

export const serviceUnitEnum = z.enum(['hour', 'day', 'session', 'item', 'fixed']);

export const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, 'Service name must be at least 2 characters'),
  category: serviceCategoryEnum,
  description: z.string().trim().optional().nullable(),
  unit: serviceUnitEnum.default('day'),
  pricePaise: z.number().int().min(0, 'Price must be non-negative'),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  isActive: z.boolean().default(true),
  showOnWebsite: z.boolean().default(false),
  sort: z.number().int().default(0),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

// 8. Package Schema
export const packageItemInputSchema = z.object({
  serviceId: z.string().uuid('Valid service ID required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
});

export const packageSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, 'Package name must be at least 2 characters'),
  description: z.string().trim().optional().nullable(),
  pricePaise: z.number().int().min(0, 'Price must be non-negative'),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  items: z.array(packageItemInputSchema).min(1, 'Package must contain at least one service item'),
  isActive: z.boolean().default(true),
  showOnWebsite: z.boolean().default(false),
  sort: z.number().int().default(0),
});

export type PackageInput = z.infer<typeof packageSchema>;

// 9. Enquiry Schema
export const eventTypeEnum = z.enum([
  'wedding',
  'pre_wedding',
  'engagement',
  'reception',
  'birthday',
  'corporate',
  'maternity',
  'anniversary',
  'other',
]);

export const enquirySourceEnum = z.enum([
  'website',
  'instagram',
  'facebook',
  'google',
  'referral',
  'wedding_wire',
  'walk_in',
  'returning_client',
  'other',
]);

export const enquiryStatusEnum = z.enum([
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'won',
  'lost',
  'junk',
]);

export const enquiryEventItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Event name is required'),
  eventType: eventTypeEnum,
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable().or(z.literal('')),
  venue: z.string().trim().optional().nullable(),
  guestCount: z.number().int().positive().optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
});

export type EnquiryEventItemInput = z.infer<typeof enquiryEventItemSchema>;

export const enquirySchema = z.object({
  id: z.string().uuid().optional(),
  clientId: z.string().uuid().optional().nullable(),
  guestName: z.string().trim().min(2, 'Name must be at least 2 characters').optional().nullable(),
  guestPhone: z.string().trim().optional().nullable(),
  guestEmail: z.string().trim().email('Invalid email').optional().nullable().or(z.literal('')),
  eventType: eventTypeEnum,
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable(),
  eventDateIsApprox: z.boolean().default(false),
  venue: z.string().trim().optional().nullable(),
  guestCount: z.number().int().positive().optional().nullable(),
  servicesInterested: z.array(z.string()).default([]),
  budgetPaise: z.number().int().nonnegative().optional().nullable(),
  source: enquirySourceEnum.default('other'),
  status: enquiryStatusEnum.default('new'),
  assignedTo: z.string().uuid().optional().nullable(),
  message: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  lostReason: z.string().trim().optional().nullable(),
  consentGivenAt: z.string().optional().nullable(),
  events: z.array(enquiryEventItemSchema).default([]),
}).refine(
  (data) => Boolean(data.clientId || (data.guestName && data.guestName.length >= 2)),
  { message: 'Either an existing client or guest name is required', path: ['guestName'] }
);

export type EnquiryInput = z.input<typeof enquirySchema>;
export type EnquiryParsed = z.output<typeof enquirySchema>;

// 10. Follow-up Schema
export const followUpStatusEnum = z.enum(['open', 'completed', 'cancelled']);

export const followUpSchema = z.object({
  id: z.string().uuid().optional(),
  enquiryId: z.string().uuid('Valid enquiry ID required'),
  dueAt: z.string().min(1, 'Due date is required'),
  note: z.string().trim().optional().nullable(),
  assignedTo: z.string().uuid('Assignee is required'),
  status: followUpStatusEnum.default('open'),
});

export type FollowUpInput = z.infer<typeof followUpSchema>;

// 11. Quotation Item Schema
export const quotationItemSchema = z.object({
  id: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional().nullable(),
  packageId: z.string().uuid().optional().nullable(),
  description: z.string().trim().min(1, 'Item description is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPricePaise: z.number().int().min(0, 'Unit price must be non-negative'),
  lineTotalPaise: z.number().int().min(0),
  hsnSacCode: z.string().trim().optional().nullable(),
  cgstBps: z.number().int().min(0).max(5000).optional().nullable(),
  sgstBps: z.number().int().min(0).max(5000).optional().nullable(),
  igstBps: z.number().int().min(0).max(10000).optional().nullable(),
  lineDiscountPaise: z.number().int().min(0).default(0),
  lineTaxablePaise: z.number().int().min(0).default(0),
  cgstPaise: z.number().int().min(0).default(0),
  sgstPaise: z.number().int().min(0).default(0),
  igstPaise: z.number().int().min(0).default(0),
});

export type QuotationItemInput = z.input<typeof quotationItemSchema>;

// 12. Quotation Schema
export const quotationSchema = z.object({
  id: z.string().uuid().optional(),
  rootId: z.string().uuid().optional(),
  clientId: z.string().uuid('Valid client ID required'),
  enquiryId: z.string().uuid().optional().nullable(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable(),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  subtotalPaise: z.number().int().min(0),
  discountType: z.enum(['percent', 'fixed']).optional().nullable(),
  discountBps: z.number().int().min(0).max(10000).optional().nullable(),
  discountFixedPaise: z.number().int().min(0).optional().nullable(),
  discountPaise: z.number().int().min(0).optional().default(0),
  taxablePaise: z.number().int().min(0),
  cgstPaise: z.number().int().min(0).optional().default(0),
  sgstPaise: z.number().int().min(0).optional().default(0),
  igstPaise: z.number().int().min(0).optional().default(0),
  taxPaise: z.number().int().min(0).optional().default(0),
  totalPaise: z.number().int().min(0),
  gstApplied: z.boolean().optional().default(false),
  taxType: z.enum(['none', 'cgst_sgst', 'igst']).optional().default('none'),
  businessGstin: z.string().trim().optional().nullable(),
  clientGstin: z.string().trim().optional().nullable(),
  placeOfSupplyStateCode: z.string().length(2).optional().nullable(),
  notesToClient: z.string().trim().optional().nullable(),
  internalNotes: z.string().trim().optional().nullable(),
  terms: z.string().trim().optional().nullable(),
  items: z.array(quotationItemSchema).min(1, 'Quotation must have at least one line item'),
});

export type QuotationInput = z.input<typeof quotationSchema>;
export type QuotationParsed = z.output<typeof quotationSchema>;
