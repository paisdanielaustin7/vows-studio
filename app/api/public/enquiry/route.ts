import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { publicEnquirySchema } from '@/lib/validations/public-enquiry.schema';
import { checkRateLimit, verifyTurnstileToken } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Client IP for Rate Limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || '127.0.0.1';

    // 2. Parse request JSON
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    // Normalize field names
    const normalizedBody = {
      guestName: body.guestName || body.name,
      guestPhone: body.guestPhone || body.phone,
      guestEmail: body.guestEmail || body.email,
      eventType: body.eventType,
      eventDate: body.eventDate,
      venue: body.venue,
      guestCount: body.guestCount,
      servicesInterested: body.servicesInterested || (body.serviceCategory ? [body.serviceCategory] : []),
      budgetRange: body.budgetRange || body.budget,
      message: body.message,
      source: body.source || 'website',
      consent: body.consent !== undefined ? body.consent : body.consentGiven,
      honeypot: body.honeypot !== undefined ? body.honeypot : body.website_fax_code,
      turnstileToken: body.turnstileToken,
    };

    // 3. Honeypot Anti-Spam Trap (silent pass-through for bot traps)
    if (normalizedBody.honeypot && typeof normalizedBody.honeypot === 'string' && normalizedBody.honeypot.trim().length > 0) {
      return NextResponse.json(
        { success: true, message: 'Enquiry received successfully.' },
        { status: 200 }
      );
    }

    // 4. Rate Limiting Check (5 per hour per IP per Master Prompt / SECURITY_PLAN §7.2)
    const rateLimit = await checkRateLimit('public_form', ip);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. You may submit up to 5 enquiries per hour.' },
        { status: 429 }
      );
    }

    // 5. Cloudflare Turnstile CAPTCHA Verification
    if (normalizedBody.turnstileToken) {
      const turnstile = await verifyTurnstileToken(normalizedBody.turnstileToken, ip);
      if (!turnstile.success) {
        return NextResponse.json(
          { error: 'Security verification failed. Please refresh and try again.' },
          { status: 400 }
        );
      }
    }

    // 6. Zod Schema Validation
    const parsed = publicEnquirySchema.safeParse(normalizedBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'Validation error',
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      guestName,
      guestPhone,
      guestEmail,
      eventType,
      eventDate,
      venue,
      guestCount,
      servicesInterested,
      message,
      source,
    } = parsed.data;

    // 7. Insert Enquiry into Database (Enquiry ONLY, no client created per D-11, D-33, CLI-05)
    const adminClient = getAdminClient();
    const { data: enquiry, error: insertError } = await adminClient
      .from('enquiries')
      .insert({
        guest_name: guestName,
        guest_phone: guestPhone,
        guest_email: guestEmail,
        event_type: eventType,
        event_date: eventDate || null,
        venue: venue || null,
        guest_count: guestCount || null,
        services_interested: servicesInterested,
        message: message || null,
        source: source || 'website',
        status: 'new',
        consent_given_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError || !enquiry) {
      return NextResponse.json(
        { error: 'Failed to record enquiry. Please contact studio concierge directly.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        enquiryId: enquiry.id,
        message: 'Your enquiry has been received. Our studio will be in touch within 24-48 hours.',
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error processing enquiry' },
      { status: 500 }
    );
  }
}
