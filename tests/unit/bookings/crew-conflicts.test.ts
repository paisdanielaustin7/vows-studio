import { describe, it, expect } from 'vitest';
import { assignCrewSchema } from '@/lib/validations/bookings.schema';

describe('Crew Scheduling & Conflict Detection (D-34, BK-05, BK-NFR-02)', () => {
  const eventId = 'e0000000-0000-0000-0000-000000000001';
  const crewMemberId = 'c0000000-0000-0000-0000-000000000001';

  it('validates assignment payload with override reason when conflicts exist', () => {
    const payloadWithOverride = {
      eventId,
      crewMemberId,
      role: 'lead_photographer' as const,
      overrideReason: 'Approved by Business Owner due to adjacent venue locations and coordinated timings.',
    };

    const parsed = assignCrewSchema.safeParse(payloadWithOverride);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.overrideReason).toBe(
        'Approved by Business Owner due to adjacent venue locations and coordinated timings.'
      );
    }
  });

  it('simulates conflict resolution logic: rejects without reason when conflict flag is set', () => {
    // Conflict checker simulation mirroring public.check_crew_conflicts
    function simulateAssignCrew(args: {
      hasConflict: boolean;
      overrideReason?: string | null;
    }) {
      if (args.hasConflict && (!args.overrideReason || args.overrideReason.trim() === '')) {
        throw new Error(
          'CREW_CONFLICT: Cannot assign crew member due to scheduling conflict. An explicit override reason is required.'
        );
      }
      return 'assignment-id-123';
    }

    // 1. Without override reason on conflict -> throws
    expect(() =>
      simulateAssignCrew({ hasConflict: true, overrideReason: undefined })
    ).toThrowError(/CREW_CONFLICT/);

    expect(() =>
      simulateAssignCrew({ hasConflict: true, overrideReason: '   ' })
    ).toThrowError(/CREW_CONFLICT/);

    // 2. With override reason on conflict -> succeeds
    const result = simulateAssignCrew({
      hasConflict: true,
      overrideReason: 'Client explicitly requested Reuben Serrao for both events',
    });
    expect(result).toBe('assignment-id-123');

    // 3. No conflict -> succeeds without override reason
    expect(simulateAssignCrew({ hasConflict: false, overrideReason: undefined })).toBe(
      'assignment-id-123'
    );
  });

  it('detects overlapping time intervals on the same date', () => {
    function checkIntervalOverlap(
      startA: string,
      endA: string,
      startB: string,
      endB: string
    ): boolean {
      return startA < endB && endA > startB;
    }

    // Event A: 10:00 to 14:00, Event B: 13:00 to 17:00 (Overlap!)
    expect(checkIntervalOverlap('10:00', '14:00', '13:00', '17:00')).toBe(true);

    // Event A: 09:00 to 12:00, Event B: 14:00 to 18:00 (No Overlap)
    expect(checkIntervalOverlap('09:00', '12:00', '14:00', '18:00')).toBe(false);

    // Event A: 10:00 to 14:00, Event B: 14:00 to 18:00 (Adjacent, boundary non-overlap)
    expect(checkIntervalOverlap('10:00', '14:00', '14:00', '18:00')).toBe(false);
  });

  it('detects unavailability timestamp range intersection', () => {
    function checkUnavailabilityOverlap(
      eventStart: Date,
      eventEnd: Date,
      unavailStart: Date,
      unavailEnd: Date
    ): boolean {
      return eventStart < unavailEnd && eventEnd > unavailStart;
    }

    const eventStart = new Date('2026-11-20T10:00:00Z');
    const eventEnd = new Date('2026-11-20T18:00:00Z');

    // Unavailability completely covers the event
    const leaveAllDay = {
      start: new Date('2026-11-20T00:00:00Z'),
      end: new Date('2026-11-20T23:59:59Z'),
    };
    expect(checkUnavailabilityOverlap(eventStart, eventEnd, leaveAllDay.start, leaveAllDay.end)).toBe(
      true
    );

    // Unavailability outside the event date
    const leaveNextDay = {
      start: new Date('2026-11-21T00:00:00Z'),
      end: new Date('2026-11-21T23:59:59Z'),
    };
    expect(checkUnavailabilityOverlap(eventStart, eventEnd, leaveNextDay.start, leaveNextDay.end)).toBe(
      false
    );
  });
});
