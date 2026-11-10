import { describe, it, expect } from 'vitest';
import {
  bookingSchema,
  bookingCancelSchema,
  studioEventSchema,
  crewMemberSchema,
  assignCrewSchema,
  crewUnavailabilitySchema,
  crewPayRecordSchema,
} from './bookings.schema';

describe('Bookings & Crew Validation Schemas (100% Coverage)', () => {
  const validUuid1 = 'a0000000-0000-0000-0000-000000000001';
  const validUuid2 = 'a0000000-0000-0000-0000-000000000002';

  describe('bookingSchema', () => {
    it('validates a valid booking with line items', () => {
      const valid = {
        clientId: validUuid1,
        contractTotalPaise: 15000000,
        targetDeliveryDate: '2026-12-31',
        lines: [
          {
            description: 'Main Wedding Coverage',
            quantity: 1,
            unitPricePaise: 15000000,
            lineTotalPaise: 15000000,
          },
        ],
      };
      const parsed = bookingSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('rejects booking with empty lines or invalid client ID', () => {
      const invalid = {
        clientId: 'invalid-uuid',
        contractTotalPaise: 100,
        lines: [],
      };
      const parsed = bookingSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('bookingCancelSchema', () => {
    it('validates cancellation with reason and optional fee', () => {
      const valid = {
        bookingId: validUuid1,
        reason: 'Client rescheduled wedding to next year',
        feePaise: 2500000,
      };
      expect(bookingCancelSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects cancellation without reason', () => {
      const invalid = {
        bookingId: validUuid1,
        reason: '  ',
      };
      expect(bookingCancelSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('studioEventSchema', () => {
    it('validates a valid event with start and end times', () => {
      const valid = {
        bookingId: validUuid1,
        eventType: 'wedding',
        name: 'Nuptials & Reception',
        eventDate: '2026-11-20',
        startTime: '10:00',
        endTime: '18:00',
        venueName: 'St. Aloysius Chapel',
      };
      expect(studioEventSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects event when end time is before start time', () => {
      const invalid = {
        bookingId: validUuid1,
        eventType: 'wedding',
        name: 'Nuptials',
        eventDate: '2026-11-20',
        startTime: '18:00',
        endTime: '10:00',
        venueName: 'Church',
      };
      const parsed = studioEventSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('crewMemberSchema', () => {
    it('validates valid crew member with bank details', () => {
      const valid = {
        fullName: 'Arjun Verma',
        role: 'photographer',
        crewType: 'freelancer',
        phone: '+919876543210',
        email: 'arjun@example.com',
        ratePaise: 2500000,
        rateUnit: 'per_day',
        bankDetails: {
          accountHolder: 'Arjun Verma',
          accountNumber: '1234567890',
          bankName: 'HDFC Bank',
          ifsc: 'HDFC0001234',
        },
      };
      expect(crewMemberSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects crew member with invalid phone or name', () => {
      const invalid = {
        fullName: 'A',
        role: 'photographer',
        crewType: 'freelancer',
        phone: '123',
      };
      expect(crewMemberSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('assignCrewSchema', () => {
    it('validates crew assignment with optional override reason', () => {
      const valid = {
        eventId: validUuid1,
        crewMemberId: validUuid2,
        role: 'lead_photographer',
        overrideReason: 'Approved by Business Owner due to adjacent venue',
      };
      expect(assignCrewSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('crewUnavailabilitySchema', () => {
    it('validates unavailability period', () => {
      const valid = {
        crewMemberId: validUuid1,
        fromTs: '2026-12-01T00:00:00Z',
        toTs: '2026-12-05T00:00:00Z',
        reason: 'Annual leave',
      };
      expect(crewUnavailabilitySchema.safeParse(valid).success).toBe(true);
    });

    it('rejects unavailability when toTs is before fromTs', () => {
      const invalid = {
        crewMemberId: validUuid1,
        fromTs: '2026-12-05T00:00:00Z',
        toTs: '2026-12-01T00:00:00Z',
      };
      expect(crewUnavailabilitySchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('crewPayRecordSchema', () => {
    it('validates crew pay record', () => {
      const valid = {
        crewMemberId: validUuid1,
        bookingId: validUuid2,
        agreedPaise: 2500000,
        workDates: ['2026-11-20'],
        notes: 'Agreed 1-day rate',
      };
      expect(crewPayRecordSchema.safeParse(valid).success).toBe(true);
    });
  });
});
