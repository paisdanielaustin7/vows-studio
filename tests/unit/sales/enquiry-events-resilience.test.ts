import { describe, it, expect } from 'vitest';
import {
  extractEventsFromEnquiryRow,
  cleanNotesForDisplay,
} from '@/lib/sales/enquiry-events';

describe('Enquiry Events Schema Cache Resilience', () => {
  it('extracts events from native row.events array when schema cache has column', () => {
    const row = {
      id: 'enq-1',
      events: [
        { id: '1', name: 'Roce Ceremony', eventType: 'wedding', eventDate: '2026-12-14', venue: 'Milagres Hall' },
        { id: '2', name: 'Wedding Nuptials', eventType: 'wedding', eventDate: '2026-12-15', venue: 'Cathedral' },
      ],
    };
    const events = extractEventsFromEnquiryRow(row);
    expect(events).toHaveLength(2);
    expect(events[0].name).toBe('Roce Ceremony');
    expect(events[0].eventDate).toBe('2026-12-14');
    expect(events[1].name).toBe('Wedding Nuptials');
    expect(events[1].eventDate).toBe('2026-12-15');
  });

  it('extracts events from notes metadata marker when events column was missing during insert', () => {
    const rawEvents = [
      { id: '1', name: 'Haldi', eventType: 'wedding', eventDate: '2026-11-20', venue: 'Courtyard' },
      { id: '2', name: 'Reception', eventType: 'reception', eventDate: '2026-11-21', venue: 'Grand Ballroom' },
    ];
    const row = {
      id: 'enq-2',
      events: null, // column missing or null
      notes: `Special client.\n\nSchedule:\n• Event 1: Haldi\n• Event 2: Reception\n<!-- EVENTS_DATA:${JSON.stringify(rawEvents)} -->`,
    };
    const events = extractEventsFromEnquiryRow(row);
    expect(events).toHaveLength(2);
    expect(events[0].name).toBe('Haldi');
    expect(events[0].eventDate).toBe('2026-11-20');
    expect(events[1].name).toBe('Reception');
    expect(events[1].eventType).toBe('reception');
  });

  it('synthesizes single primary event from row fields when neither events nor marker exists', () => {
    const row = {
      id: 'enq-3',
      events: null,
      notes: 'Just standard notes',
      event_type: 'engagement',
      event_date: '2026-12-28',
      venue: 'City Hotel',
    };
    const events = extractEventsFromEnquiryRow(row);
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('Engagement Event');
    expect(events[0].eventType).toBe('engagement');
    expect(events[0].eventDate).toBe('2026-12-28');
    expect(events[0].venue).toBe('City Hotel');
  });

  it('returns empty array when row is empty or null', () => {
    expect(extractEventsFromEnquiryRow(null)).toEqual([]);
    expect(extractEventsFromEnquiryRow({})).toEqual([]);
  });

  it('cleans hidden metadata markers from notes for display', () => {
    const rawEvents = [{ id: '1', name: 'Roce' }];
    const notesWithMarker = `Prefers evening call.\nSchedule:\n• Event 1: Roce\n<!-- EVENTS_DATA:${JSON.stringify(rawEvents)} -->`;
    const cleaned = cleanNotesForDisplay(notesWithMarker);
    expect(cleaned).not.toContain('EVENTS_DATA');
    expect(cleaned).toContain('Prefers evening call.');
    expect(cleaned).toContain('Schedule:');
  });

  it('handles cleanNotesForDisplay with null or undefined notes', () => {
    expect(cleanNotesForDisplay(null)).toBeNull();
    expect(cleanNotesForDisplay(undefined)).toBeNull();
    expect(cleanNotesForDisplay('   <!-- EVENTS_DATA:[{}] -->   ')).toBeNull();
  });
});
