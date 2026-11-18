import { z } from 'zod';
import { enquirySourceEnum, eventTypeEnum } from './sales.schema';

export const publicEnquirySchema = z
  .object({
    guestName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
    guestPhone: z
      .string()
      .trim()
      .regex(/^(\+91[6-9]\d{9}|\+[1-9]\d{6,14})$/, 'Please provide a valid phone number with country code (e.g. +91 98200 44521)'),
    guestEmail: z.string().trim().email('Please provide a valid email address'),
    eventType: eventTypeEnum,
    eventDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .optional()
      .nullable()
      .or(z.literal('')),
    venue: z.string().trim().max(200, 'Venue is too long').optional().nullable().or(z.literal('')),
    guestCount: z
      .union([z.number().int().positive(), z.string().regex(/^\d+$/).transform(Number)])
      .optional()
      .nullable(),
    servicesInterested: z.array(z.string()).default([]),
    budgetRange: z.string().trim().max(100).optional().nullable().or(z.literal('')),
    message: z.string().trim().max(2000, 'Message is too long').optional().nullable().or(z.literal('')),
    source: enquirySourceEnum.default('website'),
    consent: z.boolean().refine((val) => val === true, {
      message: 'You must consent to being contacted by VOWS to submit an enquiry',
    }),
    honeypot: z.string().optional().nullable().or(z.literal('')),
    turnstileToken: z.string().optional().nullable().or(z.literal('')),
  });

export type PublicEnquiryInput = z.infer<typeof publicEnquirySchema>;
