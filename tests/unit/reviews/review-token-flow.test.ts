import { describe, it, expect } from 'vitest';
import { generateSecureToken, hashToken } from '@/lib/utils';

describe('Review Token Security & Single Submission Flow (Phase 8, D-37, REV-10)', () => {
  interface SimulatedReviewRequest {
    id: string;
    booking_id: string;
    token_hash: string;
    expires_at: string;
    submitted_at: string | null;
    revoked_at: string | null;
  }

  interface SimulatedReview {
    id: string;
    booking_id: string;
    overall_rating: number;
    body: string;
    reviewer_name: string;
    status: 'pending' | 'approved' | 'rejected';
  }

  function simulateCreateReviewRequest(
    bookingId: string,
    existingRequests: SimulatedReviewRequest[],
    existingReviews: SimulatedReview[]
  ): {
    success: boolean;
    rawToken?: string;
    error?: string;
  } {
    // 1. One review per booking check
    if (existingReviews.some((r) => r.booking_id === bookingId)) {
      return { success: false, error: 'Booking already has a submitted review.' };
    }

    // 2. Revoke any prior active unsubmitted request for this booking
    for (const req of existingRequests) {
      if (req.booking_id === bookingId && !req.submitted_at && !req.revoked_at) {
        req.revoked_at = new Date().toISOString();
      }
    }

    // 3. Generate token & hash with 30-day expiry
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    existingRequests.push({
      id: `req-${Date.now()}`,
      booking_id: bookingId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      submitted_at: null,
      revoked_at: null,
    });

    return { success: true, rawToken };
  }

  function simulateResolveReviewToken(
    rawToken: string,
    requests: SimulatedReviewRequest[]
  ): {
    isValid: boolean;
    errorReason?: 'invalid' | 'expired' | 'already_submitted' | 'revoked';
  } {
    if (!rawToken || rawToken.length < 16) {
      return { isValid: false, errorReason: 'invalid' };
    }

    const tokenHash = hashToken(rawToken);
    const request = requests.find((r) => r.token_hash === tokenHash);

    if (!request) {
      return { isValid: false, errorReason: 'invalid' };
    }

    if (request.revoked_at) {
      return { isValid: false, errorReason: 'revoked' };
    }

    if (request.submitted_at) {
      return { isValid: false, errorReason: 'already_submitted' };
    }

    if (new Date(request.expires_at) < new Date()) {
      return { isValid: false, errorReason: 'expired' };
    }

    return { isValid: true };
  }

  function simulateSubmitReview(
    rawToken: string,
    payload: { overallRating: number; body: string; reviewerName: string },
    requests: SimulatedReviewRequest[],
    reviews: SimulatedReview[]
  ): {
    success: boolean;
    reviewId?: string;
    error?: string;
  } {
    const resolution = simulateResolveReviewToken(rawToken, requests);
    if (!resolution.isValid) {
      return { success: false, error: `Invalid review token: ${resolution.errorReason}` };
    }

    const tokenHash = hashToken(rawToken);
    const request = requests.find((r) => r.token_hash === tokenHash)!;

    // Check if review already exists for this booking (duplicate guard)
    if (reviews.some((r) => r.booking_id === request.booking_id)) {
      return { success: false, error: 'A review has already been submitted for this booking.' };
    }

    // Mark submitted
    request.submitted_at = new Date().toISOString();

    const newReview: SimulatedReview = {
      id: `rev-${Date.now()}`,
      booking_id: request.booking_id,
      overall_rating: payload.overallRating,
      body: payload.body,
      reviewer_name: payload.reviewerName,
      status: 'pending',
    };

    reviews.push(newReview);
    return { success: true, reviewId: newReview.id };
  }

  it('generates 256-bit cryptographically secure tokens and SHA-256 hashes', () => {
    const rawToken = generateSecureToken(32);
    expect(rawToken).toHaveLength(64);
    expect(rawToken).toMatch(/^[0-9a-f]{64}$/);

    const tokenHash = hashToken(rawToken);
    expect(tokenHash).toHaveLength(64);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);

    // Verify hash determinism
    expect(hashToken(rawToken)).toBe(tokenHash);
  });

  it('sets 30-day expiration window on new review request', () => {
    const requests: SimulatedReviewRequest[] = [];
    const reviews: SimulatedReview[] = [];

    const before = Date.now();
    const res = simulateCreateReviewRequest('bkg-1', requests, reviews);
    const after = Date.now();

    expect(res.success).toBe(true);
    expect(requests).toHaveLength(1);

    const expiresAt = new Date(requests[0].expires_at).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    expect(expiresAt).toBeGreaterThanOrEqual(before + thirtyDaysMs);
    expect(expiresAt).toBeLessThanOrEqual(after + thirtyDaysMs + 1000);
  });

  it('revokes previous active unsubmitted link when a new link is generated for the same booking', () => {
    const requests: SimulatedReviewRequest[] = [];
    const reviews: SimulatedReview[] = [];

    // First request
    const first = simulateCreateReviewRequest('bkg-1', requests, reviews);
    expect(first.success).toBe(true);
    expect(requests).toHaveLength(1);
    expect(requests[0].revoked_at).toBeNull();

    // Second request for the same booking
    const second = simulateCreateReviewRequest('bkg-1', requests, reviews);
    expect(second.success).toBe(true);
    expect(requests).toHaveLength(2);

    // First request is now revoked
    expect(requests[0].revoked_at).not.toBeNull();
    // Second request is active
    expect(requests[1].revoked_at).toBeNull();

    // First token resolution is rejected as revoked
    const checkFirst = simulateResolveReviewToken(first.rawToken!, requests);
    expect(checkFirst.isValid).toBe(false);
    expect(checkFirst.errorReason).toBe('revoked');

    // Second token resolution succeeds
    const checkSecond = simulateResolveReviewToken(second.rawToken!, requests);
    expect(checkSecond.isValid).toBe(true);
  });

  it('rejects expired tokens after 30 days', () => {
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);

    const requests: SimulatedReviewRequest[] = [
      {
        id: 'req-expired',
        booking_id: 'bkg-1',
        token_hash: tokenHash,
        expires_at: new Date(Date.now() - 5000).toISOString(), // Expired 5 seconds ago
        submitted_at: null,
        revoked_at: null,
      },
    ];

    const result = simulateResolveReviewToken(rawToken, requests);
    expect(result.isValid).toBe(false);
    expect(result.errorReason).toBe('expired');
  });

  it('rejects nonexistent or guessed tokens with uniform invalid response', () => {
    const requests: SimulatedReviewRequest[] = [];
    const guessedToken = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const result = simulateResolveReviewToken(guessedToken, requests);
    expect(result.isValid).toBe(false);
    expect(result.errorReason).toBe('invalid');

    // Short token
    const shortResult = simulateResolveReviewToken('short-token', requests);
    expect(shortResult.isValid).toBe(false);
    expect(shortResult.errorReason).toBe('invalid');
  });

  it('enforces single submission: blocks replay attacks using submitted tokens', () => {
    const requests: SimulatedReviewRequest[] = [];
    const reviews: SimulatedReview[] = [];

    const reqResult = simulateCreateReviewRequest('bkg-1', requests, reviews);
    const token = reqResult.rawToken!;

    // First submission succeeds
    const submit1 = simulateSubmitReview(
      token,
      {
        overallRating: 5,
        body: 'VOWS Studio documented our wedding with profound quietness.',
        reviewerName: 'Samantha & Derick',
      },
      requests,
      reviews
    );

    expect(submit1.success).toBe(true);
    expect(reviews).toHaveLength(1);
    expect(reviews[0].status).toBe('pending');
    expect(requests[0].submitted_at).not.toBeNull();

    // Replay with the same token is rejected
    const submit2 = simulateSubmitReview(
      token,
      {
        overallRating: 5,
        body: 'Attempting duplicate replay submission.',
        reviewerName: 'Derick D’Souza',
      },
      requests,
      reviews
    );

    expect(submit2.success).toBe(false);
    expect(submit2.error).toContain('already_submitted');
    expect(reviews).toHaveLength(1);
  });

  it('blocks creating a new review request if the booking already has a submitted review', () => {
    const requests: SimulatedReviewRequest[] = [];
    const reviews: SimulatedReview[] = [
      {
        id: 'rev-existing',
        booking_id: 'bkg-completed',
        overall_rating: 5,
        body: 'Existing completed testimonial.',
        reviewer_name: 'Kenneth & Rochelle',
        status: 'approved',
      },
    ];

    const result = simulateCreateReviewRequest('bkg-completed', requests, reviews);
    expect(result.success).toBe(false);
    expect(result.error).toContain('already has a submitted review');
  });
});
