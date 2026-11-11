import React from 'react';
import type { Metadata } from 'next';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listPortfolioItemsAction } from '@/server/actions/portfolio.actions';
import { PortfolioClient } from './portfolio-client';

export const metadata: Metadata = {
  title: 'Portfolio & Showcase Manager — VOWS Studio CRM',
};

export default async function CrmPortfolioPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  // Check roles: SA, BO, MG can manage; Staff, Crew can view
  const canManage = ['system_admin', 'business_owner', 'manager'].includes(user.role);

  const res = await listPortfolioItemsAction(true);
  const items = res.data || [];

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <PortfolioClient initialItems={items} canManage={canManage} />
    </div>
  );
}
