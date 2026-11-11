/**
 * VOWS Studio — Review & Testimonial Types
 * Reference: DATABASE_SCHEMA §10, §11, BUSINESS_WORKFLOWS §2.8, §3.10, DECISION_LOG D-37
 */

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ReviewRequest {
  id: string;
  booking_id: string;
  token_hash: string;
  expires_at: string;
  sent_at: string | null;
  submitted_at: string | null;
  revoked_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  client_id: string;
  review_request_id: string | null;
  overall_rating: number;
  communication_rating: number | null;
  quality_rating: number | null;
  punctuality_rating: number | null;
  body: string;
  reviewer_name: string;
  event_type: string | null;
  event_date: string | null;
  status: ReviewStatus;
  moderation_note: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewStats {
  totalReviews: number;
  avgOverallRating: number;
  avgCommunicationRating: number;
  avgQualityRating: number;
  avgPunctualityRating: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
}

export interface ReviewListItem extends Review {
  booking_number?: string;
  client_name?: string;
  client_email?: string;
  moderator_name?: string | null;
}

export interface PublicReviewTokenDetails {
  bookingId: string;
  bookingNumber: string;
  coupleName: string;
  clientEmail?: string | null;
  eventTitle: string;
  eventDate: string | null;
  venueName: string | null;
  eventType: string | null;
  expiresAt: string;
  isExpired: boolean;
  isSubmitted: boolean;
  isRevoked: boolean;
}

export interface CreateReviewRequestInput {
  bookingId: string;
  sendEmail?: boolean;
}

export interface SubmitReviewInput {
  token: string;
  overallRating: number;
  communicationRating?: number;
  qualityRating?: number;
  punctualityRating?: number;
  body: string;
  reviewerName: string;
  showcaseConsent?: boolean;
}

export interface ModerateReviewInput {
  reviewId: string;
  status: ReviewStatus;
  moderationNote?: string;
}
