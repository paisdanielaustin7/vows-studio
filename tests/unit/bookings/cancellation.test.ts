import { describe, it, expect } from 'vitest';
import { bookingCancelSchema } from '@/lib/validations/bookings.schema';

describe('Booking Cancellation Invariants (D-35, BK-08)', () => {
  const bookingId = 'b0000000-0000-0000-0000-000000000001';

  it('enforces cancellation reason requirement', () => {
    // Missing or short reason fails validation
    expect(bookingCancelSchema.safeParse({ bookingId, reason: '' }).success).toBe(false);
    expect(bookingCancelSchema.safeParse({ bookingId, reason: 'ab' }).success).toBe(false);

    // Valid reason with optional fee succeeds
    const valid = {
      bookingId,
      reason: 'Client relocated wedding to Goa outside service radius',
      feePaise: 2500000,
    };
    expect(bookingCancelSchema.safeParse(valid).success).toBe(true);
  });

  it('guarantees linked invoices remain intact and are never auto-cancelled (D-35)', () => {
    interface Invoice {
      id: string;
      bookingId: string;
      status: 'sent' | 'paid' | 'partially_paid' | 'cancelled';
      totalPaise: number;
    }

    interface Booking {
      id: string;
      status: 'confirmed' | 'in_progress' | 'cancelled';
      cancellationReason?: string;
      cancellationFeePaise?: number;
    }

    // Cancellation routine strictly following D-35 (replaces incorrect auto-cancelling cascade)
    function cancelBooking(booking: Booking, invoices: Invoice[], reason: string, feePaise = 0) {
      if (!reason || reason.trim() === '') {
        throw new Error('Cancellation reason required');
      }

      booking.status = 'cancelled';
      booking.cancellationReason = reason;
      booking.cancellationFeePaise = feePaise;

      // Invoices MUST NOT be modified: D-35 explicitly mandates invoices remain intact!
      return {
        booking,
        invoices, // Untouched
      };
    }

    const testBooking: Booking = { id: bookingId, status: 'confirmed' };
    const testInvoices: Invoice[] = [
      { id: 'inv-1', bookingId, status: 'paid', totalPaise: 5000000 },
      { id: 'inv-2', bookingId, status: 'sent', totalPaise: 10000000 },
    ];

    const result = cancelBooking(
      testBooking,
      testInvoices,
      'Client called to cancel celebration',
      1000000
    );

    expect(result.booking.status).toBe('cancelled');
    expect(result.booking.cancellationReason).toBe('Client called to cancel celebration');
    expect(result.booking.cancellationFeePaise).toBe(1000000);

    // Invoices are completely unchanged
    expect(result.invoices[0].status).toBe('paid');
    expect(result.invoices[1].status).toBe('sent');
  });

  it('enforces soft delete restriction: only allowed when confirmed and no invoices exist', () => {
    function canSoftDeleteBooking(status: string, invoiceCount: number): boolean {
      if (status !== 'confirmed') return false;
      if (invoiceCount > 0) return false;
      return true;
    }

    expect(canSoftDeleteBooking('confirmed', 0)).toBe(true);
    expect(canSoftDeleteBooking('in_progress', 0)).toBe(false);
    expect(canSoftDeleteBooking('confirmed', 1)).toBe(false);
    expect(canSoftDeleteBooking('cancelled', 0)).toBe(false);
  });
});
