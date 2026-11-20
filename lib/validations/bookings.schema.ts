import { z } from 'zod';
import { eventTypeEnum, ifscRegex } from './sales.schema';

export const bookingStatusEnum = z.enum(['confirmed', 'in_progress', 'completed', 'cancelled']);

export const crewRoleEnum = z.enum([
  'photographer',
  'videographer',
  'drone_operator',
  'editor',
  'assistant',
  'coordinator',
  'other',
]);

export const crewTypeEnum = z.enum(['employee', 'freelancer']);

export const eventAssignmentRoleEnum = z.enum([
  'lead_photographer',
  'second_photographer',
  'lead_videographer',
  'second_videographer',
  'drone_operator',
  'assistant',
  'coordinator',
  'other',
]);

export const crewPayStatusEnum = z.enum(['unpaid', 'partially_paid', 'paid']);

// 1. Booking Line Item Schema
export const bookingLineItemSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().trim().min(1, 'Description is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPricePaise: z.number().int().min(0, 'Unit price must be non-negative'),
  lineTotalPaise: z.number().int().min(0),
});

export type BookingLineItemInput = z.input<typeof bookingLineItemSchema>;

export const bookingEventInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Event name required'),
  eventType: eventTypeEnum,
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  venueName: z.string().trim().optional().nullable(),
  venueAddress: z.string().trim().optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
});

export type BookingEventInput = z.infer<typeof bookingEventInputSchema>;

// 2. Booking Schema
export const bookingSchema = z.object({
  id: z.string().uuid().optional(),
  clientId: z.string().uuid('Valid client ID required'),
  enquiryId: z.string().uuid().optional().nullable(),
  quotationId: z.string().uuid().optional().nullable(),
  contractTotalPaise: z.number().int().min(0, 'Contract total must be non-negative'),
  notes: z.string().trim().optional().nullable(),
  targetDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable(),
  lines: z.array(bookingLineItemSchema).min(1, 'At least one line item required'),
  events: z.array(bookingEventInputSchema).default([]),
});

export type BookingInput = z.input<typeof bookingSchema>;

// 3. Booking Cancellation Schema
export const bookingCancelSchema = z.object({
  bookingId: z.string().uuid('Valid booking ID required'),
  reason: z.string().trim().min(3, 'Cancellation reason is required (min 3 chars)'),
  feePaise: z.number().int().min(0).default(0),
});

export type BookingCancelInput = z.input<typeof bookingCancelSchema>;

// 4. Studio Event Schema
export const studioEventSchema = z.object({
  id: z.string().uuid().optional(),
  bookingId: z.string().uuid('Valid booking ID required'),
  eventType: eventTypeEnum,
  name: z.string().trim().min(2, 'Event name must be at least 2 chars'),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Valid time format required (HH:MM or HH:MM:SS)').optional().nullable(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Valid time format required (HH:MM or HH:MM:SS)').optional().nullable(),
  venueName: z.string().trim().min(2, 'Venue name is required'),
  venueAddress: z.string().trim().optional().nullable(),
  requirements: z.string().trim().optional().nullable(),
  equipmentNotes: z.string().trim().optional().nullable(),
  sort: z.number().int().default(0),
}).refine(
  (data) => !data.startTime || !data.endTime || data.endTime > data.startTime,
  { message: 'End time must be after start time', path: ['endTime'] }
);

export type StudioEventInput = z.input<typeof studioEventSchema>;

// 5. Crew Member Schema
export const bankDetailsSchema = z.object({
  accountHolder: z.string().trim().optional().nullable(),
  accountNumber: z.string().trim().optional().nullable(),
  bankName: z.string().trim().optional().nullable(),
  ifsc: z.string().trim().regex(ifscRegex, 'Invalid IFSC format').optional().nullable().or(z.literal('')),
  upiId: z.string().trim().optional().nullable(),
});

export const crewMemberSchema = z.object({
  id: z.string().uuid().optional(),
  profileId: z.string().uuid().optional().nullable(),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  role: crewRoleEnum,
  crewType: crewTypeEnum,
  phone: z.string().trim().min(10, 'Valid phone number required'),
  email: z.string().trim().email('Invalid email address').optional().nullable().or(z.literal('')),
  ratePaise: z.number().int().min(0).optional().nullable(),
  rateUnit: z.enum(['per_day', 'per_event']).optional().nullable(),
  bankDetails: bankDetailsSchema.optional().nullable(),
  portfolioUrl: z.string().trim().url('Invalid URL').optional().nullable().or(z.literal('')),
  notes: z.string().trim().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CrewMemberInput = z.input<typeof crewMemberSchema>;

// 6. Assign Crew Schema
export const assignCrewSchema = z.object({
  eventId: z.string().uuid('Valid event ID required'),
  crewMemberId: z.string().uuid('Valid crew member ID required'),
  role: eventAssignmentRoleEnum,
  rateOverridePaise: z.number().int().min(0).optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  overrideReason: z.string().trim().optional().nullable(),
});

export type AssignCrewInput = z.input<typeof assignCrewSchema>;

// 7. Crew Unavailability Schema
export const crewUnavailabilitySchema = z.object({
  id: z.string().uuid().optional(),
  crewMemberId: z.string().uuid('Valid crew member ID required'),
  fromTs: z.string().datetime('Must be valid ISO timestamp'),
  toTs: z.string().datetime('Must be valid ISO timestamp'),
  reason: z.string().trim().optional().nullable(),
}).refine((data) => new Date(data.toTs) > new Date(data.fromTs), {
  message: 'End timestamp must be after start timestamp',
  path: ['toTs'],
});

export type CrewUnavailabilityInput = z.input<typeof crewUnavailabilitySchema>;

// 8. Crew Pay Record Schema
export const crewPayRecordSchema = z.object({
  id: z.string().uuid().optional(),
  crewMemberId: z.string().uuid('Valid crew member ID required'),
  bookingId: z.string().uuid('Valid booking ID required'),
  eventId: z.string().uuid().optional().nullable(),
  workDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  agreedPaise: z.number().int().min(0, 'Agreed pay must be non-negative'),
  notes: z.string().trim().optional().nullable(),
});

export type CrewPayRecordInput = z.input<typeof crewPayRecordSchema>;
