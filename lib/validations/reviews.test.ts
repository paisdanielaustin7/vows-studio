import { describe, it, expect } from 'vitest';
import {
  reviewStatusSchema,
  createReviewRequestSchema,
  submitReviewSchema,
  moderateReviewSchema,
  listReviewsQuerySchema,
} from './reviews.schema';

describe('Reviews Validation Schemas (Phase 8)', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  describe('reviewStatusSchema', () => {
    it('accepts valid review statuses', () => {
      expect(reviewStatusSchema.parse('pending')).toBe('pending');
      expect(reviewStatusSchema.parse('approved')).toBe('approved');
      expect(reviewStatusSchema.parse('rejected')).toBe('rejected');
    });

    it('rejects invalid review status', () => {
      expect(() => reviewStatusSchema.parse('archived')).toThrow();
      expect(() => reviewStatusSchema.parse('')).toThrow();
    });
  });

  describe('createReviewRequestSchema', () => {
    it('accepts valid booking UUID and default sendEmail flag', () => {
      const parsed = createReviewRequestSchema.parse({
        bookingId: validUuid,
      });
      expect(parsed.bookingId).toBe(validUuid);
      expect(parsed.sendEmail).toBe(false);
    });

    it('accepts explicit sendEmail boolean flag', () => {
      const parsed = createReviewRequestSchema.parse({
        bookingId: validUuid,
        sendEmail: true,
      });
      expect(parsed.sendEmail).toBe(true);
    });

    it('rejects non-UUID bookingId', () => {
      expect(() =>
        createReviewRequestSchema.parse({
          bookingId: 'not-a-uuid',
        })
      ).toThrow(/Invalid booking ID/);
    });
  });

  describe('submitReviewSchema', () => {
    const validSubmission = {
      token: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
      overallRating: 5,
      communicationRating: 5,
      qualityRating: 5,
      punctualityRating: 4,
      body: 'VOWS captured our Goan sunset nuptials with profound reverence and beauty.',
      reviewerName: 'Samantha & Derick D’Souza',
      showcaseConsent: true,
    };

    it('validates a complete, authentic review submission', () => {
      const parsed = submitReviewSchema.parse(validSubmission);
      expect(parsed.overallRating).toBe(5);
      expect(parsed.communicationRating).toBe(5);
      expect(parsed.qualityRating).toBe(5);
      expect(parsed.punctualityRating).toBe(4);
      expect(parsed.reviewerName).toBe('Samantha & Derick D’Souza');
      expect(parsed.showcaseConsent).toBe(true);
    });

    it('defaults showcaseConsent to true when omitted', () => {
      const { showcaseConsent, ...withoutConsent } = validSubmission;
      const parsed = submitReviewSchema.parse(withoutConsent);
      expect(parsed.showcaseConsent).toBe(true);
    });

    it('allows category sub-ratings, honeypot, and turnstileToken to be optional', () => {
      const parsed = submitReviewSchema.parse({
        token: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
        overallRating: 4,
        body: 'Magnificent documentary cinematography from the atelier.',
        reviewerName: 'Rohan & Nikita',
        honeypot: '',
        turnstileToken: 'test-token-pass',
      });
      expect(parsed.overallRating).toBe(4);
      expect(parsed.communicationRating).toBeUndefined();
      expect(parsed.qualityRating).toBeUndefined();
      expect(parsed.punctualityRating).toBeUndefined();
      expect(parsed.honeypot).toBe('');
      expect(parsed.turnstileToken).toBe('test-token-pass');
    });

    it('rejects token shorter than 16 characters or longer than 128 characters', () => {
      expect(() =>
        submitReviewSchema.parse({
          ...validSubmission,
          token: 'short',
        })
      ).toThrow(/Invalid review token/);

      expect(() =>
        submitReviewSchema.parse({
          ...validSubmission,
          token: 'a'.repeat(129),
        })
      ).toThrow(/Invalid review token/);
    });

    it('rejects overall rating outside 1 to 5 range or non-integer', () => {
      expect(() =>
        submitReviewSchema.parse({
          ...validSubmission,
          overallRating: 0,
        })
      ).toThrow(/Rating must be at least 1 star/);

      expect(() =>
        submitReviewSchema.parse({
          ...validSubmission,
          overallRating: 6,
        })
      ).toThrow(/Rating cannot exceed 5 stars/);

      expect(() =>
        submitReviewSchema.parse({
          ...validSubmission,
          overallRating: 4.5,
        })
      ).toThrow(/Overall rating must be an integer/);
    });

    it('rejects category ratings outside 1 to 5 range or non-integer', () => {
      expect(() =>
        submitReviewSchema.parse({
          ...validSubmission,
          communicationRating: 0,
        })
      ).toThrow(/Rating must be at least 1 star/);

      expect(() =>
        submitReviewSchema.parse({
          ...validSubmission,
          qualityRating: 6,
        })
      ).toThrow(/Rating cannot exceed 5 stars/);

      expect(() =>
        submitReviewSchema.parse({
          ...validSubmission,
          punctualityRating: 3.5,
        })
      ).toThrow(/Punctuality rating must be an integer/);
    });

    it('enforces minimum 10 characters on testimonial narrative', () => {
      expect(() =>
        submitReviewSchema.parse({
          ...validSubmission,
          body: 'Great job', // 9 characters
        })
      ).toThrow(/Testimonial must be at least 10 characters/);

      expect(() =>
        submitReviewSchema.parse({
          ...validSubmission,
          body: '          ', // 10 spaces trimmed to 0
        })
      ).toThrow(/Testimonial must be at least 10 characters/);
    });

    it('rejects testimonial narrative exceeding 3000 characters', () => {
      expect(() =>
        submitReviewSchema.parse({
          ...validSubmission,
          body: 'A'.repeat(3001),
        })
      ).toThrow(/Testimonial cannot exceed 3000 characters/);
    });

    it('rejects reviewer name shorter than 2 characters or exceeding 150 characters', () => {
      expect(() =>
        submitReviewSchema.parse({
          ...validSubmission,
          reviewerName: 'A',
        })
      ).toThrow(/Reviewer name must be at least 2 characters/);

      expect(() =>
        submitReviewSchema.parse({
          ...validSubmission,
          reviewerName: 'A'.repeat(151),
        })
      ).toThrow(/Reviewer name cannot exceed 150 characters/);
    });
  });

  describe('moderateReviewSchema', () => {
    it('accepts valid approval with or without moderation note', () => {
      const parsed = moderateReviewSchema.parse({
        reviewId: validUuid,
        status: 'approved',
      });
      expect(parsed.status).toBe('approved');
      expect(parsed.moderationNote).toBeUndefined();

      const parsedWithNote = moderateReviewSchema.parse({
        reviewId: validUuid,
        status: 'approved',
        moderationNote: 'Verified against Booking BKG-2025-019',
      });
      expect(parsedWithNote.moderationNote).toBe('Verified against Booking BKG-2025-019');
    });

    it('accepts rejection with note', () => {
      const parsed = moderateReviewSchema.parse({
        reviewId: validUuid,
        status: 'rejected',
        moderationNote: 'Unverified client commission details',
      });
      expect(parsed.status).toBe('rejected');
      expect(parsed.moderationNote).toBe('Unverified client commission details');
    });

    it('accepts re-hide to pending', () => {
      const parsed = moderateReviewSchema.parse({
        reviewId: validUuid,
        status: 'pending',
        moderationNote: 'Temporary client NDA embargo',
      });
      expect(parsed.status).toBe('pending');
    });

    it('rejects invalid review UUID', () => {
      expect(() =>
        moderateReviewSchema.parse({
          reviewId: 'not-valid-uuid',
          status: 'approved',
        })
      ).toThrow(/Invalid review ID/);
    });

    it('rejects moderation note exceeding 1000 characters', () => {
      expect(() =>
        moderateReviewSchema.parse({
          reviewId: validUuid,
          status: 'rejected',
          moderationNote: 'N'.repeat(1001),
        })
      ).toThrow(/Moderation note cannot exceed 1000 characters/);
    });
  });

  describe('listReviewsQuerySchema', () => {
    it('defaults status to all and accepts optional search', () => {
      const parsed = listReviewsQuerySchema.parse({});
      expect(parsed.status).toBe('all');
      expect(parsed.search).toBeUndefined();

      const filtered = listReviewsQuerySchema.parse({
        status: 'pending',
        search: 'Samantha',
      });
      expect(filtered.status).toBe('pending');
      expect(filtered.search).toBe('Samantha');
    });
  });
});
