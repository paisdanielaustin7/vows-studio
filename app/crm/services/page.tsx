import * as React from 'react';
import { listServicesAction } from '@/server/actions/catalogue.actions';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ServicesManager } from '@/components/catalogue/services-manager';

export default async function ServicesPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  const res = await listServicesAction();
  const services = res.data || [];
  const canManage = user.role === 'system_admin' || user.role === 'business_owner';

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-on-surface">
          Service Catalogue
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Studio offerings, standard units, historical rates, and website visibility.
        </p>
      </div>

      <ServicesManager initialServices={services} canManage={canManage} />
    </div>
  );
}
