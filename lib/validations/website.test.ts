import { describe, it, expect } from 'vitest';
import { publicEnquirySchema } from './public-enquiry.schema';
import {
  portfolioItemSchema,
  portfolioImageSchema,
  updateSiteContentSchema,
  updateSitePageSeoSchema,
  faqItemSchema,
} from './portfolio.schema';

describe('Public Website & Portfolio Validations (Phase 7)', () => {
  describe('publicEnquirySchema', () => {
    const validEnquiry = {
      guestName: 'Derick Dsouza',
      guestPhone: '+919820044521',
      guestEmail: 'derick@example.com',
      eventType: 'wedding' as const,
      eventDate: '2026-12-15',
      venue: 'St. Aloysius Chapel, Mangalore',
      guestCount: 250,
      servicesInterested: ['Photography', 'Cinematography'],
      budgetRange: '₹3,00,000 - ₹5,00,000',
      message: 'Looking for documentary style coverage for our wedding.',
      source: 'instagram' as const,
      consent: true,
      honeypot: '',
      turnstileToken: 'sample-token',
    };

    it('validates a complete, valid enquiry', () => {
      const parsed = publicEnquirySchema.parse(validEnquiry);
      expect(parsed.guestName).toBe('Derick Dsouza');
      expect(parsed.consent).toBe(true);
      expect(parsed.guestCount).toBe(250);
    });

    it('transforms string guestCount to integer', () => {
      const parsed = publicEnquirySchema.parse({
        ...validEnquiry,
        guestCount: '350',
      });
      expect(parsed.guestCount).toBe(350);
    });

    it('accepts null or empty eventDate and venue', () => {
      const parsed = publicEnquirySchema.parse({
        ...validEnquiry,
        eventDate: '',
        venue: null,
        guestCount: null,
      });
      expect(parsed.eventDate).toBe('');
      expect(parsed.venue).toBeNull();
    });

    it('rejects if consent is false or omitted', () => {
      expect(() =>
        publicEnquirySchema.parse({
          ...validEnquiry,
          consent: false,
        })
      ).toThrow(/consent/i);
    });

    it('rejects invalid email', () => {
      expect(() =>
        publicEnquirySchema.parse({
          ...validEnquiry,
          guestEmail: 'invalid-email',
        })
      ).toThrow(/valid email/i);
    });

    it('rejects invalid phone format', () => {
      expect(() =>
        publicEnquirySchema.parse({
          ...validEnquiry,
          guestPhone: '12345',
        })
      ).toThrow(/valid phone number/i);
    });

    it('rejects short names', () => {
      expect(() =>
        publicEnquirySchema.parse({
          ...validEnquiry,
          guestName: 'A',
        })
      ).toThrow(/at least 2 characters/i);
    });

    it('rejects invalid date format', () => {
      expect(() =>
        publicEnquirySchema.parse({
          ...validEnquiry,
          eventDate: '15-12-2026',
        })
      ).toThrow(/YYYY-MM-DD/i);
    });
  });

  describe('portfolioItemSchema', () => {
    const validPortfolioDraft = {
      title: 'Neil & Alisha — Coastal Solemnization',
      eventType: 'wedding' as const,
      description: 'Goa heritage chapel solemnization',
      shootDate: '2026-02-14',
      coverImagePath: 'https://vows.studio/images/hero.jpg',
      videoUrl: 'https://vimeo.com/76979871',
      tags: ['35mm Film', 'Goa'],
      sort: 1,
      isPublished: false,
    };

    it('accepts an unpublished portfolio item without client consent', () => {
      const parsed = portfolioItemSchema.parse(validPortfolioDraft);
      expect(parsed.isPublished).toBe(false);
      expect(parsed.clientConsentConfirmedAt).toBeUndefined();
    });

    it('allows publishing when clientConsentConfirmedAt is provided', () => {
      const parsed = portfolioItemSchema.parse({
        ...validPortfolioDraft,
        isPublished: true,
        clientConsentConfirmedAt: '2026-02-10T10:00:00.000Z',
      });
      expect(parsed.isPublished).toBe(true);
      expect(parsed.clientConsentConfirmedAt).toBe('2026-02-10T10:00:00.000Z');
    });

    it('strictly REJECTS publishing when client consent is missing or empty', () => {
      expect(() =>
        portfolioItemSchema.parse({
          ...validPortfolioDraft,
          isPublished: true,
        })
      ).toThrow(/Client consent must be explicitly confirmed/i);

      expect(() =>
        portfolioItemSchema.parse({
          ...validPortfolioDraft,
          isPublished: true,
          clientConsentConfirmedAt: '',
        })
      ).toThrow(/Client consent must be explicitly confirmed/i);
    });

    it('accepts optional nullable description, shootDate, and videoUrl', () => {
      const parsed = portfolioItemSchema.parse({
        ...validPortfolioDraft,
        description: null,
        shootDate: '',
        videoUrl: '',
      });
      expect(parsed.description).toBeNull();
      expect(parsed.shootDate).toBe('');
    });

    it('rejects invalid videoUrl', () => {
      expect(() =>
        portfolioItemSchema.parse({
          ...validPortfolioDraft,
          videoUrl: 'not-a-url',
        })
      ).toThrow(/Invalid video URL/i);
    });
  });

  describe('portfolioImageSchema', () => {
    it('validates image with descriptive alt text', () => {
      const parsed = portfolioImageSchema.parse({
        storagePath: 'portfolio/wedding-1.jpg',
        altText: 'Bride and groom walking through heritage courtyard in golden hour light',
        width: 1600,
        height: 1000,
        sort: 1,
      });
      expect(parsed.altText).toContain('heritage courtyard');
      expect(parsed.sort).toBe(1);
    });

    it('enforces minimum alt text length for accessibility', () => {
      expect(() =>
        portfolioImageSchema.parse({
          storagePath: 'portfolio/wedding-1.jpg',
          altText: 'Pic',
        })
      ).toThrow(/Descriptive alt text is required/i);
    });
  });

  describe('updateSiteContentSchema, updateSitePageSeoSchema, faqItemSchema', () => {
    it('validates site content update', () => {
      const parsed = updateSiteContentSchema.parse({
        key: 'home_hero',
        value: { tagline: 'Sacred Vows. Timeless Light.' },
      });
      expect(parsed.key).toBe('home_hero');
    });

    it('validates SEO meta payload', () => {
      const parsed = updateSitePageSeoSchema.parse({
        pageKey: 'home',
        metaTitle: 'VOWS — Wedding Cinematic & Stills',
        metaDescription: 'Documentary wedding cinema and 35mm photography.',
        ogImagePath: '/og-home.jpg',
      });
      expect(parsed.metaTitle).toBe('VOWS — Wedding Cinematic & Stills');
    });

    it('validates FAQ item payload', () => {
      const parsed = faqItemSchema.parse({
        question: 'When will we receive our wedding film and photo monograph?',
        answer: 'Our standard delivery timeline is 8 to 12 weeks from your shoot wrap date.',
        sort: 1,
        isPublished: true,
      });
      expect(parsed.question).toContain('wedding film');
      expect(parsed.isPublished).toBe(true);
    });
  });
});
