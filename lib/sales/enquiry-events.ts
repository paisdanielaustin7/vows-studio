import { EnquiryEventItem, EventType } from '@/types/sales';

/**
 * Safely extracts events array from an enquiry record.
 * Handles:
 * 1. Native `row.events` array (when database migration 030 is applied and schema cache is fresh)
 * 2. Embedded events JSON marker inside `row.notes` (when schema cache was pending during insert)
 * 3. Fallback single primary event synthesized from `row.event_type`, `row.event_date`, `row.venue`
 */
export function extractEventsFromEnquiryRow(row: any): EnquiryEventItem[] {
  if (!row) return [];

  // Case 1: Native events array
  if (Array.isArray(row.events) && row.events.length > 0) {
    return row.events.map((e: any, idx: number) => ({
      id: e.id || String(idx + 1),
      name: e.name || 'Celebration Event',
      eventType: (e.eventType || e.event_type || 'wedding') as EventType,
      eventDate: e.eventDate || e.event_date || '',
      venue: e.venue || e.venue_name || '',
    }));
  }

  // Case 2: Embedded in notes
  if (row.notes && typeof row.notes === 'string') {
    const match = row.notes.match(/<!-- EVENTS_DATA:(.*?) -->/);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((e: any, idx: number) => ({
            id: e.id || String(idx + 1),
            name: e.name || 'Celebration Event',
            eventType: (e.eventType || e.event_type || 'wedding') as EventType,
            eventDate: e.eventDate || e.event_date || '',
            venue: e.venue || e.venue_name || '',
          }));
        }
      } catch {
        // Ignore parse error
      }
    }
  }

  // Case 3: Synthesize single event from primary fields
  if (row.event_date || row.event_type) {
    const type = (row.event_type || 'wedding') as EventType;
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    return [
      {
        id: '1',
        name: `${label} Event`,
        eventType: type,
        eventDate: row.event_date || '',
        venue: row.venue || '',
      },
    ];
  }

  return [];
}

/**
 * Strips internal metadata markers (e.g. <!-- EVENTS_DATA:... -->) from notes for presentation.
 */
export function cleanNotesForDisplay(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const cleaned = notes.replace(/<!-- EVENTS_DATA:.*? -->/g, '').trim();
  return cleaned.length > 0 ? cleaned : null;
}
