import * as React from 'react';
import { listPackagesAction, listServicesAction } from '@/server/actions/catalogue.actions';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PackagesManager } from '@/components/catalogue/packages-manager';

export default async function PackagesPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  const [pkgRes, svcRes] = await Promise.all([
    listPackagesAction(),
    listServicesAction(),
  ]);

  const packages = pkgRes.data || [];
  const services = svcRes.data || [];
  const canManage = user.role === 'system_admin' || user.role === 'business_owner';

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-on-surface">
          Package Bundles
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Curated studio service bundles, pricing tiers, and inclusions for wedding clients.
        </p>
      </div>

      <PackagesManager
        initialPackages={packages}
        availableServices={services}
        canManage={canManage}
      />
    </div>
  );
}
