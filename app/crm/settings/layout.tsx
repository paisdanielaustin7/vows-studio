'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Building2,
  Receipt,
  Binary,
  MailCheck,
  Wallet,
  Globe,
  ChevronRight,
} from 'lucide-react';

interface SettingsNavGroup {
  title: string;
  items: {
    title: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    title: 'General',
    items: [
      {
        title: 'Studio Profile',
        description: 'Identity, contacts & branding',
        href: '/crm/settings',
        icon: Building2,
      },
    ],
  },
  {
    title: 'Financial & Billing',
    items: [
      {
        title: 'Billing & GST',
        description: 'GSTIN, SAC codes & bank accounts',
        href: '/crm/settings/billing',
        icon: Receipt,
      },
      {
        title: 'Document Numbering',
        description: 'Prefixes, padding & sequences',
        href: '/crm/settings/numbering',
        icon: Binary,
      },
      {
        title: 'Expense Categories',
        description: 'Production ledger tags',
        href: '/crm/settings/expense-categories',
        icon: Wallet,
      },
    ],
  },
  {
    title: 'Integrations & Comm',
    items: [
      {
        title: 'Email Templates',
        description: 'Quotation & invoice messages',
        href: '/crm/settings/email-templates',
        icon: MailCheck,
      },
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-outline mb-2">
          <span>Studio CRM</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>Configuration</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-primary font-medium">Settings</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-on-surface">
              Studio Settings &amp; Configuration
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Manage global studio identity, brand tokens, taxation rules, document sequences, and templates.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Left Sub-Nav + Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sub-Navigation Sidebar */}
        <aside className="lg:col-span-3">
          <nav className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col gap-5">
            {SETTINGS_NAV.map((group) => (
              <div key={group.title} className="flex flex-col gap-1">
                <div className="px-3 py-1 text-xs uppercase tracking-wider text-outline font-semibold">
                  {group.title}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors',
                        isActive
                          ? 'bg-secondary-container text-on-secondary-container font-medium'
                          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      )}
                    >
                      <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', isActive ? 'text-primary' : 'text-outline')} />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium leading-snug">{item.title}</span>
                        <span className="text-xs text-outline leading-tight">{item.description}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="lg:col-span-9">{children}</div>
      </div>
    </div>
  );
}
