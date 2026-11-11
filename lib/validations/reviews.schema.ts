import { z } from 'zod';

export const reviewStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const createReviewRequestSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  sendEmail: z.boolean().optional().default(false),
});

export const submitReviewSchema = z.object({
  token: z
    .string({ required_error: 'Review token is required' })
    .min(16, 'Invalid review token')
    .max(128, 'Invalid review token'),
  overallRating: z
    .number({ required_error: 'Overall studio rating is required' })
    .int('Overall rating must be an integer')
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars'),
  communicationRating: z
    .number()
    .int('Communication rating must be an integer')
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars')
    .optional(),
  qualityRating: z
    .number()
    .int('Quality rating must be an integer')
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars')
    .optional(),
  punctualityRating: z
    .number()
    .int('Punctuality rating must be an integer')
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars')
    .optional(),
  body: z
    .string({ required_error: 'Wedding testimonial narrative is required' })
    .trim()
    .min(10, 'Testimonial must be at least 10 characters')
    .max(3000, 'Testimonial cannot exceed 3000 characters'),
  reviewerName: z
    .string({ required_error: 'Reviewer name is required' })
    .trim()
    .min(2, 'Reviewer name must be at least 2 characters')
    .max(150, 'Reviewer name cannot exceed 150 characters'),
  showcaseConsent: z.boolean().optional().default(true),
  honeypot: z.string().optional().nullable().or(z.literal('')),
  turnstileToken: z.string().optional().nullable(),
});

export const moderateReviewSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID'),
  status: reviewStatusSchema,
  moderationNote: z
    .string()
    .trim()
    .max(1000, 'Moderation note cannot exceed 1000 characters')
    .optional()
    .nullable(),
});

export const listReviewsQuerySchema = z.object({
  status: z.enum(['all', 'pending', 'approved', 'rejected']).optional().default('all'),
  search: z.string().trim().optional(),
});

export type CreateReviewRequestInput = z.infer<typeof createReviewRequestSchema>;
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
