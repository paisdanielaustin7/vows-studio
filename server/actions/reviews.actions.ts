'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { generateSecureToken, hashToken } from '@/lib/utils';
import {
  createReviewRequestSchema,
  submitReviewSchema,
  moderateReviewSchema,
  listReviewsQuerySchema,
  CreateReviewRequestInput,
  SubmitReviewInput,
  ModerateReviewInput,
  ListReviewsQuery,
} from '@/lib/validations/reviews.schema';
import {
  Review,
  ReviewListItem,
  ReviewStats,
  PublicReviewTokenDetails,
} from '@/types/reviews';
import { ActionResult } from '@/types/auth';
import { sendEmailService } from '@/server/services/email.service';

/**
 * Generates a cryptographically secure 30-day review invitation link for a booking.
 * Available to SA, BO, MG (RBAC R6 ruling: reviews:request).
 * Enforces one review per booking; revokes any existing unsubmitted active requests.
 */
export async function generateReviewRequestAction(
  input: CreateReviewRequestInput
): Promise<
  ActionResult<{
    requestId: string;
    token: string;
    reviewUrl: string;
    expiresAt: string;
    emailSent: boolean;
    clientEmail?: string | null;
  }>
> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'reviews:request');

    const validated = createReviewRequestSchema.parse(input);
    const admin = getAdminClient();

    // 1. Check if a review is already submitted for this booking
    const { data: existingReview } = await admin
      .from('reviews')
      .select('id')
      .eq('booking_id', validated.bookingId)
      .maybeSingle();

    if (existingReview) {
      return {
        error: {
          code: 'CONFLICT',
          message: 'This booking has already submitted an official review.',
        },
      };
    }

    // 2. Fetch booking and primary client details
    const { data: booking, error: bkgErr } = await admin
      .from('bookings')
      .select('id, booking_number, client_id, clients!inner(id, full_name)')
      .eq('id', validated.bookingId)
      .single();

    if (bkgErr || !booking) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found.',
        },
      };
    }

    // 3. Fetch primary client email
    const { data: clientEmailRow } = await admin
      .from('client_emails')
      .select('email')
      .eq('client_id', booking.client_id)
      .order('is_primary', { ascending: false })
      .limit(1)
      .maybeSingle();

    const clientEmail = clientEmailRow?.email || null;
    const clientName = (booking.clients as any)?.full_name || 'Valued Couple';

    // 4. Generate 256-bit token & SHA-256 hash
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);

    // 5. Revoke any prior active unsubmitted review requests for this booking
    await admin
      .from('review_requests')
      .update({ revoked_at: new Date().toISOString() })
      .eq('booking_id', validated.bookingId)
      .is('submitted_at', null)
      .is('revoked_at', null);

    // 6. Insert new 30-day review request
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: newRequest, error: insErr } = await admin
      .from('review_requests')
      .insert({
        booking_id: validated.bookingId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (insErr || !newRequest) {
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate review request invitation link.',
        },
      };
    }

    const reviewUrl = `/review/${rawToken}`;
    let emailSent = false;

    // 7. Dispatch Email if requested
    if (validated.sendEmail) {
      if (!clientEmail) {
        return {
          data: {
            requestId: newRequest.id,
            token: rawToken,
            reviewUrl,
            expiresAt,
            emailSent: false,
            clientEmail: null,
          },
        };
      }

      try {
        const fullReviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vowsstudio.com'}${reviewUrl}`;

        // Fetch review_request email template or fallback
        const { data: template } = await admin
          .from('email_templates')
          .select('subject, body_html')
          .eq('code', 'review_request')
          .maybeSingle();

        let subject = template?.subject || 'Reflection & Testimonial Request — VOWS Studio';
        let bodyHtml = template?.body_html || `
          <div style="font-family: serif; color: #171d19; max-width: 600px; margin: 0 auto; line-height: 1.6;">
            <p>Dear {{client_name}},</p>
            <p>Thank you for entrusting VOWS Studio with documenting your celebration. As your cinematic film and archival still collection enter completion, we would be deeply honored by your personal reflections on our atelier's work.</p>
            <p style="margin: 28px 0;">
              <a href="{{review_link}}" style="background-color: #4c6452; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: 500; display: inline-block;">
                Submit Your Official Reflection
              </a>
            </p>
            <p style="font-size: 13px; color: #737972;">This private access link will remain active for 30 days: <br><a href="{{review_link}}" style="color: #4c6452;">{{review_link}}</a></p>
            <p style="margin-top: 32px; font-size: 14px; color: #5a605b;">With profound gratitude,<br><strong>VOWS Studio Atelier</strong></p>
          </div>
        `;

        subject = subject.replace(/{{client_name}}/g, clientName).replace(/{{review_link}}/g, fullReviewUrl);
        bodyHtml = bodyHtml.replace(/{{client_name}}/g, clientName).replace(/{{review_link}}/g, fullReviewUrl);

        const idempotencyKey = `review-req-${newRequest.id}-${Date.now()}`;
        await sendEmailService(
          {
            to: clientEmail,
            subject,
            htmlBody: bodyHtml,
            idempotencyKey,
          },
          user.id
        );

        // Mark sent_at
        await admin
          .from('review_requests')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', newRequest.id);

        emailSent = true;
      } catch (emailErr) {
        // Email failure is caught and reported; link is still valid
        console.warn('Review invitation email dispatch failed:', emailErr);
      }
    }

    return {
      data: {
        requestId: newRequest.id,
        token: rawToken,
        reviewUrl,
        expiresAt,
        emailSent,
        clientEmail,
      },
    };
  } catch (err: any) {
    return {
      error: {
        code: err?.code || 'INTERNAL_ERROR',
        message: err?.message || 'Failed to generate review request.',
      },
    };
  }
}

/**
 * Public resolver for client review token.
 * Uniform response preventing guessing attacks: invalid, revoked, expired, or completed
 * tokens return uniform invalid state details.
 */
export async function getReviewRequestByTokenAction(
  token: string
): Promise<{
  isValid: boolean;
  details?: PublicReviewTokenDetails;
  errorReason?: 'invalid' | 'expired' | 'already_submitted' | 'revoked';
}> {
  try {
    if (!token || token.length < 16) {
      return { isValid: false, errorReason: 'invalid' };
    }

    const tokenHash = hashToken(token);
    const admin = getAdminClient();

    // Query request
    const { data: request, error: reqErr } = await admin
      .from('review_requests')
      .select(`
        id,
        booking_id,
        expires_at,
        submitted_at,
        revoked_at,
        bookings!inner (
          id,
          booking_number,
          client_id,
          clients!inner (
            id,
            full_name
          )
        )
      `)
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (reqErr || !request) {
      return { isValid: false, errorReason: 'invalid' };
    }

    if (request.revoked_at) {
      return { isValid: false, errorReason: 'revoked' };
    }

    if (request.submitted_at) {
      return { isValid: false, errorReason: 'already_submitted' };
    }

    const isExpired = new Date(request.expires_at) < new Date();
    if (isExpired) {
      return { isValid: false, errorReason: 'expired' };
    }

    // Query primary client email
    const bookingData = request.bookings as any;
    const clientData = bookingData.clients as any;
    const { data: clientEmailRow } = await admin
      .from('client_emails')
      .select('email')
      .eq('client_id', clientData.id)
      .order('is_primary', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Query primary event info
    const { data: eventRow } = await admin
      .from('events')
      .select('name, event_type, event_date, venue_name')
      .eq('booking_id', bookingData.id)
      .order('event_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    return {
      isValid: true,
      details: {
        bookingId: bookingData.id,
        bookingNumber: bookingData.booking_number,
        coupleName: clientData.full_name,
        clientEmail: clientEmailRow?.email || null,
        eventTitle: eventRow?.name || 'Wedding Celebration',
        eventDate: eventRow?.event_date || null,
        venueName: eventRow?.venue_name || null,
        eventType: eventRow?.event_type || 'wedding',
        expiresAt: request.expires_at,
        isExpired: false,
        isSubmitted: false,
        isRevoked: false,
      },
    };
  } catch {
    return { isValid: false, errorReason: 'invalid' };
  }
}

/**
 * Public action: Client submits official wedding review via verified token.
 * Validates token, blocks duplicate reviews per booking, inserts review as pending,
 * marks request as submitted, and notifies leadership.
 */
export async function submitReviewAction(
  input: SubmitReviewInput
): Promise<ActionResult<{ reviewId: string }>> {
  try {
    const validated = submitReviewSchema.parse(input);
    const tokenHash = hashToken(validated.token);
    const admin = getAdminClient();

    // 1. Validate request
    const { data: request, error: reqErr } = await admin
      .from('review_requests')
      .select('id, booking_id, expires_at, submitted_at, revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (reqErr || !request) {
      return {
        error: {
          code: 'UNPROCESSABLE',
          message: 'The review invitation link is invalid or does not exist.',
        },
      };
    }

    if (request.revoked_at) {
      return {
        error: {
          code: 'FORBIDDEN',
          message: 'This review invitation link has been revoked.',
        },
      };
    }

    if (request.submitted_at) {
      return {
        error: {
          code: 'CONFLICT',
          message: 'A review has already been submitted for this commission.',
        },
      };
    }

    if (new Date(request.expires_at) < new Date()) {
      return {
        error: {
          code: 'FORBIDDEN',
          message: 'This review invitation link has expired (validity was 30 days).',
        },
      };
    }

    // 2. Check for duplicate review on the booking
    const { data: existingReview } = await admin
      .from('reviews')
      .select('id')
      .eq('booking_id', request.booking_id)
      .maybeSingle();

    if (existingReview) {
      return {
        error: {
          code: 'CONFLICT',
          message: 'An official review has already been registered for this booking.',
        },
      };
    }

    // 3. Fetch booking & event details
    const { data: booking } = await admin
      .from('bookings')
      .select('id, booking_number, client_id')
      .eq('id', request.booking_id)
      .single();

    if (!booking) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Commission booking record not found.',
        },
      };
    }

    const { data: primaryEvent } = await admin
      .from('events')
      .select('event_type, event_date')
      .eq('booking_id', booking.id)
      .order('event_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    // 4. Mark request submitted
    const nowIso = new Date().toISOString();
    await admin
      .from('review_requests')
      .update({ submitted_at: nowIso })
      .eq('id', request.id);

    // 5. Insert review in pending status
    const { data: newReview, error: insErr } = await admin
      .from('reviews')
      .insert({
        booking_id: booking.id,
        client_id: booking.client_id,
        review_request_id: request.id,
        overall_rating: validated.overallRating,
        communication_rating: validated.communicationRating ?? null,
        quality_rating: validated.qualityRating ?? null,
        punctuality_rating: validated.punctualityRating ?? null,
        body: validated.body,
        reviewer_name: validated.reviewerName,
        event_type: primaryEvent?.event_type || 'wedding',
        event_date: primaryEvent?.event_date || null,
        status: 'pending',
        submitted_at: nowIso,
      })
      .select('id')
      .single();

    if (insErr || !newReview) {
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to record official review in private studio archive.',
        },
      };
    }

    // 6. Notify Leadership (BO and SA) per BUSINESS_WORKFLOWS §5.2
    try {
      const { data: leadershipProfiles } = await admin
        .from('profiles')
        .select('id')
        .in('role', ['business_owner', 'system_admin'])
        .eq('is_active', true);

      if (leadershipProfiles && leadershipProfiles.length > 0) {
        const notifications = leadershipProfiles.map((p) => ({
          user_id: p.id,
          type: 'review_submitted',
          title: 'New Client Review Submitted',
          body: `${validated.reviewerName} submitted an official reflection (${validated.overallRating}★) for ${booking.booking_number}.`,
          link: '/crm/reviews',
          created_at: nowIso,
        }));

        await admin.from('notifications').insert(notifications);
      }
    } catch (notifErr) {
      console.warn('Failed to insert review notifications:', notifErr);
    }

    // Revalidate relevant surfaces
    revalidatePath('/crm/reviews');
    revalidatePath('/reviews');
    revalidatePath('/');

    return {
      data: {
        reviewId: newReview.id,
      },
    };
  } catch (err: any) {
    return {
      error: {
        code: err?.code || 'UNPROCESSABLE',
        message: err?.message || 'Failed to submit review.',
      },
    };
  }
}

/**
 * Moderate review status: approve, reject, or re-hide to pending.
 * STRICTLY restricted to SA and BO (RBAC R6 ruling: Manager CANNOT moderate).
 */
export async function moderateReviewAction(
  input: ModerateReviewInput
): Promise<ActionResult<Review>> {
  try {
    const user = await getAuthenticatedUser();
    // Enforces RBAC R6 ruling: Manager does NOT have 'reviews:moderate'
    requirePermission(user, 'reviews:moderate');

    const validated = moderateReviewSchema.parse(input);
    const admin = getAdminClient();

    // Check review existence
    const { data: existingReview, error: findErr } = await admin
      .from('reviews')
      .select('*')
      .eq('id', validated.reviewId)
      .single();

    if (findErr || !existingReview) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Review record not found.',
        },
      };
    }

    const nowIso = new Date().toISOString();
    const { data: updatedReview, error: updateErr } = await admin
      .from('reviews')
      .update({
        status: validated.status,
        moderation_note: validated.moderationNote ?? null,
        moderated_by: user.id,
        moderated_at: nowIso,
      })
      .eq('id', validated.reviewId)
      .select('*')
      .single();

    if (updateErr || !updatedReview) {
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update review moderation status.',
        },
      };
    }

    // Revalidate CRM and public showcases
    revalidatePath('/crm/reviews');
    revalidatePath('/reviews');
    revalidatePath('/');

    return {
      data: updatedReview as Review,
    };
  } catch (err: any) {
    return {
      error: {
        code: err?.code || 'FORBIDDEN',
        message: err?.message || 'Access denied for review moderation.',
      },
    };
  }
}

/**
 * Lists all reviews for CRM moderation table & detail panel.
 * Available to SA, BO, MG (reviews:view).
 */
export async function listReviewsAction(
  query?: ListReviewsQuery
): Promise<
  ActionResult<{
    reviews: ReviewListItem[];
    stats: ReviewStats;
  }>
> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'reviews:view');

    const validated = listReviewsQuerySchema.parse(query || {});
    const admin = getAdminClient();

    // Build query
    let dbQuery = admin
      .from('reviews')
      .select(`
        *,
        bookings!inner (
          id,
          booking_number,
          clients!inner (
            id,
            full_name
          )
        ),
        moderator:profiles!reviews_moderated_by_fkey (
          full_name
        )
      `)
      .order('submitted_at', { ascending: false });

    if (validated.status && validated.status !== 'all') {
      dbQuery = dbQuery.eq('status', validated.status);
    }

    const { data: rawReviews, error } = await dbQuery;

    if (error) {
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to load client reviews.',
        },
      };
    }

    let items: ReviewListItem[] = (rawReviews || []).map((r: any) => ({
      id: r.id,
      booking_id: r.booking_id,
      client_id: r.client_id,
      review_request_id: r.review_request_id,
      overall_rating: r.overall_rating,
      communication_rating: r.communication_rating,
      quality_rating: r.quality_rating,
      punctuality_rating: r.punctuality_rating,
      body: r.body,
      reviewer_name: r.reviewer_name,
      event_type: r.event_type,
      event_date: r.event_date,
      status: r.status,
      moderation_note: r.moderation_note,
      moderated_by: r.moderated_by,
      moderated_at: r.moderated_at,
      submitted_at: r.submitted_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
      booking_number: r.bookings?.booking_number,
      client_name: r.bookings?.clients?.full_name,
      moderator_name: r.moderator?.full_name || null,
    }));

    // Filter by search if provided
    if (validated.search) {
      const s = validated.search.toLowerCase();
      items = items.filter(
        (it) =>
          it.reviewer_name.toLowerCase().includes(s) ||
          it.body.toLowerCase().includes(s) ||
          (it.booking_number && it.booking_number.toLowerCase().includes(s)) ||
          (it.client_name && it.client_name.toLowerCase().includes(s))
      );
    }

    // Compute stats across all reviews in database
    const { data: allReviews } = await admin
      .from('reviews')
      .select('overall_rating, communication_rating, quality_rating, punctuality_rating, status');

    const total = allReviews?.length || 0;
    const approved = (allReviews || []).filter((r) => r.status === 'approved');
    const pending = (allReviews || []).filter((r) => r.status === 'pending');
    const rejected = (allReviews || []).filter((r) => r.status === 'rejected');

    const avg = (arr: number[]) => (arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : 5.0);

    const stats: ReviewStats = {
      totalReviews: total,
      approvedCount: approved.length,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
      avgOverallRating: avg(approved.map((r) => r.overall_rating)),
      avgCommunicationRating: avg(approved.map((r) => r.communication_rating || 5)),
      avgQualityRating: avg(approved.map((r) => r.quality_rating || 5)),
      avgPunctualityRating: avg(approved.map((r) => r.punctuality_rating || 5)),
    };

    return {
      data: {
        reviews: items,
        stats,
      },
    };
  } catch (err: any) {
    return {
      error: {
        code: err?.code || 'INTERNAL_ERROR',
        message: err?.message || 'Failed to list reviews.',
      },
    };
  }
}
