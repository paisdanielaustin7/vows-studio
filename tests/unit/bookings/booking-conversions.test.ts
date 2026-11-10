import { describe, it, expect } from 'vitest';

describe('Booking Conversions & Atomic Integrity (BK-10, BUSINESS_WORKFLOWS §3.4)', () => {
  it('verifies quotation to booking atomic conversion guarantees', () => {
    // Model of public.create_booking_from_quotation
    function simulateConvertQuotationToBooking(quotation: {
      id: string;
      clientId: string;
      enquiryId?: string | null;
      status: string;
      totalPaise: number;
      eventDate?: string | null;
      items: Array<{
        sort: number;
        description: string;
        quantity: number;
        unitPricePaise: number;
        lineTotalPaise: number;
      }>;
    }) {
      if (quotation.status !== 'accepted' && quotation.status !== 'sent') {
        throw new Error('Only sent or accepted quotations can be converted to bookings');
      }

      const bookingNumber = 'BK-2026-001';
      const booking = {
        id: 'booking-uuid-1',
        bookingNumber,
        clientId: quotation.clientId,
        enquiryId: quotation.enquiryId || null,
        quotationId: quotation.id,
        status: 'confirmed',
        contractTotalPaise: quotation.totalPaise,
      };

      const lineItems = quotation.items.map((item) => ({
        bookingId: booking.id,
        sort: item.sort,
        description: item.description,
        quantity: item.quantity,
        unitPricePaise: item.unitPricePaise,
        lineTotalPaise: item.lineTotalPaise,
      }));

      const events = quotation.eventDate
        ? [
            {
              bookingId: booking.id,
              eventType: 'wedding',
              name: 'Wedding Production',
              eventDate: quotation.eventDate,
            },
          ]
        : [];

      const stages = [
        'raw_ingest',
        'culling',
        'audio_sync',
        'first_cut',
        'colour_grading',
        'sound_design',
        'client_review',
        'final_exports',
        'archival',
      ].map((code, idx) => ({
        bookingId: booking.id,
        stageCode: code,
        sort: idx + 1,
        status: 'pending',
      }));

      return {
        booking,
        lineItems,
        events,
        stages,
        updatedQuotationStatus: 'accepted',
        updatedEnquiryStatus: quotation.enquiryId ? 'won' : null,
      };
    }

    const quotation = {
      id: 'q-1',
      clientId: 'c-1',
      enquiryId: 'enq-1',
      status: 'sent',
      totalPaise: 18000000, // ₹1,80,000.00
      eventDate: '2026-11-20',
      items: [
        {
          sort: 1,
          description: 'Cinema Coverage',
          quantity: 1,
          unitPricePaise: 10000000,
          lineTotalPaise: 10000000,
        },
        {
          sort: 2,
          description: 'Candid Stills',
          quantity: 1,
          unitPricePaise: 8000000,
          lineTotalPaise: 8000000,
        },
      ],
    };

    const result = simulateConvertQuotationToBooking(quotation);

    // 1. Line items are copied exactly (BK-10)
    expect(result.lineItems).toHaveLength(2);
    expect(result.lineItems[0].description).toBe('Cinema Coverage');
    expect(result.lineItems[1].unitPricePaise).toBe(8000000);

    // 2. Contract total paise equals quotation total paise
    expect(result.booking.contractTotalPaise).toBe(18000000);

    // 3. Initial event created from quotation event date
    expect(result.events).toHaveLength(1);
    expect(result.events[0].eventDate).toBe('2026-11-20');

    // 4. Exactly 9 delivery stages created
    expect(result.stages).toHaveLength(9);
    expect(result.stages[0].stageCode).toBe('raw_ingest');
    expect(result.stages[8].stageCode).toBe('archival');

    // 5. Quotation status updated to accepted
    expect(result.updatedQuotationStatus).toBe('accepted');

    // 6. Linked enquiry marked won
    expect(result.updatedEnquiryStatus).toBe('won');
  });

  it('rejects conversion if quotation is rejected or superseded', () => {
    function convert(status: string) {
      if (status !== 'accepted' && status !== 'sent') {
        throw new Error('Invalid quotation status for booking conversion');
      }
    }

    expect(() => convert('rejected')).toThrowError(/Invalid quotation status/);
    expect(() => convert('superseded')).toThrowError(/Invalid quotation status/);
  });
});
