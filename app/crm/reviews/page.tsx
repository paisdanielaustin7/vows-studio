import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { listReviewsAction } from '@/server/actions/reviews.actions';
import { ReviewModerationView } from '@/components/reviews/review-moderation-view';

export const metadata: Metadata = {
  title: 'Client Reviews Moderation — VOWS Studio CRM',
  description: 'Curate verified client feedback and moderate public showcase visibility.',
};

export default async function ReviewsModerationPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  try {
    requirePermission(user, 'reviews:view');
  } catch {
    redirect('/crm');
  }

  const res = await listReviewsAction();
  const initialReviews = res.data?.reviews || [];
  const initialStats = res.data?.stats || {
    totalReviews: 0,
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    avgOverallRating: 5.0,
    avgCommunicationRating: 5.0,
    avgQualityRating: 5.0,
    avgPunctualityRating: 5.0,
  };

  return (
    <div className="w-full">
      <ReviewModerationView
        initialReviews={initialReviews}
        initialStats={initialStats}
        currentUserRole={user.role}
      />
    </div>
  );
}
