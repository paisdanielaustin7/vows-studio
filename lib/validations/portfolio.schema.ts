import { z } from 'zod';
import { eventTypeEnum } from './sales.schema';

export const portfolioItemSchema = z
  .object({
    title: z.string().trim().min(2, 'Title must be at least 2 characters').max(150, 'Title is too long'),
    eventType: eventTypeEnum,
    description: z.string().trim().max(1000, 'Description is too long').optional().nullable().or(z.literal('')),
    shootDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .optional()
      .nullable()
      .or(z.literal('')),
    coverImagePath: z.string().trim().min(1, 'Cover image path is required'),
    videoUrl: z.string().trim().url('Invalid video URL').optional().nullable().or(z.literal('')),
    tags: z.array(z.string().trim()).default([]),
    sort: z.number().int().optional().default(0),
    isPublished: z.boolean().default(false),
    clientConsentConfirmedAt: z.string().datetime().optional().nullable().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.isPublished) {
      if (!data.clientConsentConfirmedAt || data.clientConsentConfirmedAt.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Client consent must be explicitly confirmed before publishing a portfolio item',
          path: ['clientConsentConfirmedAt'],
        });
      }
    }
  });

export const portfolioImageSchema = z.object({
  storagePath: z.string().trim().min(1, 'Storage path is required'),
  altText: z
    .string()
    .trim()
    .min(5, 'Descriptive alt text is required for accessibility (min 5 characters)')
    .max(300, 'Alt text is too long'),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  sort: z.number().int().default(0),
});

export const updateSiteContentSchema = z.object({
  key: z.string().trim().min(1, 'Key is required'),
  value: z.record(z.string(), z.any()),
});

export const updateSitePageSeoSchema = z.object({
  pageKey: z.string().trim().min(1, 'Page key is required'),
  metaTitle: z.string().trim().max(100).optional().nullable(),
  metaDescription: z.string().trim().max(250).optional().nullable(),
  ogImagePath: z.string().trim().optional().nullable(),
});

export const faqItemSchema = z.object({
  question: z.string().trim().min(3, 'Question is required').max(250),
  answer: z.string().trim().min(5, 'Answer is required').max(2000),
  sort: z.number().int().default(0),
  isPublished: z.boolean().default(true),
});

export type PortfolioItemInput = z.infer<typeof portfolioItemSchema>;
export type PortfolioImageInput = z.infer<typeof portfolioImageSchema>;
export type UpdateSiteContentInput = z.infer<typeof updateSiteContentSchema>;
export type UpdateSitePageSeoInput = z.infer<typeof updateSitePageSeoSchema>;
export type FaqItemInput = z.infer<typeof faqItemSchema>;
