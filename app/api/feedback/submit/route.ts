import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      clientId,
      clientName,
      shootId,
      eventDate,
      eventType,
      rating,
      serviceRatings,
      review,
      highlights,
      allowSocialSharing,
      createdAt,
    } = body;

    if (!review || !review.trim()) {
      return NextResponse.json(
        { success: false, error: 'Review text is required' },
        { status: 400 }
      );
    }

    const feedbackRecord = {
      id: id || `fb-${Date.now()}`,
      client_id: clientId || 'direct',
      client_name: clientName || 'Valued Couple',
      shoot_id: shootId || null,
      event_date: eventDate || null,
      event_type: eventType || 'Wedding Celebration',
      rating: Number(rating) || 5,
      service_ratings: serviceRatings || {},
      review: review.trim(),
      highlights: highlights || '',
      allow_social_sharing: allowSocialSharing !== false,
      created_at: createdAt || new Date().toISOString(),
    };

    // 1. Save to Supabase Cloud if configured
    if (supabase && isSupabaseConfigured()) {
      const { error } = await supabase.from('lumina_feedback').upsert(feedbackRecord);
      if (error) {
        console.warn('[Feedback API] Supabase upsert note:', error.message);
      }
    }

    // 2. Notify Reuben via Gmail if Gmail SMTP is configured
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (gmailUser && gmailPass) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser.trim(),
            pass: gmailPass.replace(/\s+/g, ''),
          },
        });

        const starDisplay = '★'.repeat(feedbackRecord.rating) + '☆'.repeat(5 - feedbackRecord.rating);

        await transporter.sendMail({
          from: `"VOWS Studio Portal" <${gmailUser.trim()}>`,
          to: gmailUser.trim(),
          subject: `✨ New Client Review (${starDisplay}) from ${feedbackRecord.client_name}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 6px;">
              <h2 style="font-family: Georgia, serif; color: #111; margin-top: 0; text-transform: uppercase;">New Client Testimonial</h2>
              <p style="font-size: 11px; font-family: monospace; color: #777; text-transform: uppercase; letter-spacing: 2px;">VOWS Studio // Feedback Ingest</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
              
              <div style="font-size: 22px; color: #f59e0b; margin-bottom: 8px;">
                ${starDisplay} <span style="font-size: 14px; color: #555;">(${feedbackRecord.rating} / 5 Stars)</span>
              </div>

              <p style="font-size: 15px; font-style: italic; color: #222; background: #f9fafb; padding: 14px; border-left: 3px solid #111; border-radius: 3px;">
                "${feedbackRecord.review}"
              </p>

              ${feedbackRecord.highlights ? `<p style="font-size: 13px; color: #555;"><strong>Favorite Moment / Highlights:</strong> ${feedbackRecord.highlights}</p>` : ''}

              <div style="font-size: 12px; color: #666; margin-top: 20px; padding-top: 14px; border-top: 1px dashed #ddd;">
                <p style="margin: 3px 0;"><strong>Client:</strong> ${feedbackRecord.client_name}</p>
                <p style="margin: 3px 0;"><strong>Event:</strong> ${feedbackRecord.event_type} (${feedbackRecord.event_date || 'Recent'})</p>
                <p style="margin: 3px 0;"><strong>Social Sharing Allowed:</strong> ${feedbackRecord.allow_social_sharing ? 'Yes (Permitted for Instagram & Pitch Deck)' : 'Private'}</p>
              </div>
            </div>
          `,
        });
      } catch (mailErr) {
        console.warn('[Feedback API] Notification email note:', mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted and synchronized successfully!',
      feedback: feedbackRecord,
    });
  } catch (error: any) {
    console.error('[Feedback API] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
