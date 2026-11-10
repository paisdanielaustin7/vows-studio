'use client';

import * as React from 'react';
import Link from 'next/link';
import { Client, Quotation } from '@/types/sales';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/money';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Clock,
  ChevronRight,
  Plus,
  ArrowLeft,
  Building,
} from 'lucide-react';

export function ClientProfileView({
  client,
  activities,
  quotations,
  canManage,
}: {
  client: Client;
  activities: any[];
  quotations: Quotation[];
  canManage: boolean;
}) {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'quotations' | 'activity'>('overview');

  const primaryPhone = client.phones.find((p) => p.isPrimary) || client.phones[0];
  const primaryEmail = client.emails.find((e) => e.isPrimary) || client.emails[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Back button and breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-outline">
        <Link href="/crm/clients" className="hover:text-primary flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Clients
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-on-surface font-medium">{client.fullName}</span>
      </div>

      {/* Profile Header Hero */}
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-serif text-2xl font-bold shrink-0">
            {client.fullName.charAt(0)}
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-2xl font-bold text-on-surface">{client.fullName}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
              {primaryPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-outline" />
                  {primaryPhone.phoneE164}
                </span>
              )}
              {primaryEmail && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-outline" />
                  {primaryEmail.email}
                </span>
              )}
              {client.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-outline" />
                  {client.city}, {client.state || ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-3">
            <Link href={`/crm/quotations/new?clientId=${client.id}`}>
              <Button size="sm" className="text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />
                New Quotation
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-1 ${
            activeTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          Overview &amp; Contacts
        </button>
        <button
          onClick={() => setActiveTab('quotations')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-1 ${
            activeTab === 'quotations'
              ? 'border-primary text-primary'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          Quotations ({quotations.length})
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-1 ${
            activeTab === 'activity'
              ? 'border-primary text-primary'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          Activity Feed ({activities.length})
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Details Card */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              Phone Numbers ({client.phones.length}/3)
            </h3>
            <div className="flex flex-col gap-2">
              {client.phones.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container/50 text-xs"
                >
                  <span className="font-mono font-medium">{p.phoneE164}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-outline">{p.label || 'Mobile'}</span>
                    {p.isPrimary && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-secondary-container text-on-secondary-container font-semibold">
                        Primary
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2 pt-2 border-t border-outline-variant/20">
              <Mail className="w-4 h-4 text-primary" />
              Email Addresses ({client.emails.length}/2)
            </h3>
            <div className="flex flex-col gap-2">
              {client.emails.length === 0 ? (
                <span className="text-xs text-outline italic">No emails recorded</span>
              ) : (
                client.emails.map((e, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container/50 text-xs"
                  >
                    <span className="font-medium">{e.email}</span>
                    {e.isPrimary && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-secondary-container text-on-secondary-container font-semibold">
                        Primary
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Billing & Notes Card */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <Building className="w-4 h-4 text-primary" />
              Billing Address &amp; GSTIN
            </h3>
            <div className="flex flex-col gap-1.5 text-xs text-on-surface-variant">
              <div>
                <span className="text-outline">Address: </span>
                {client.addressLine1 || client.city ? (
                  <span>
                    {[client.addressLine1, client.addressLine2, client.city, client.state, client.pincode]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                ) : (
                  <span className="text-outline italic">None recorded</span>
                )}
              </div>
              <div>
                <span className="text-outline">Client GSTIN: </span>
                <span className="font-mono">{client.gstin || 'Unregistered'}</span>
              </div>
              <div>
                <span className="text-outline">Referral Source: </span>
                <span className="capitalize">{client.referralSource?.replace('_', ' ') || 'Other'}</span>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-on-surface pt-2 border-t border-outline-variant/20">
              Notes
            </h3>
            <p className="text-xs text-outline leading-relaxed">
              {client.notes || 'No internal client notes added.'}
            </p>
          </div>
        </div>
      )}

      {/* Tab: Quotations */}
      {activeTab === 'quotations' && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container/50 text-xs text-outline uppercase font-semibold">
                <th className="py-3 px-4">Quotation #</th>
                <th className="py-3 px-4">Event Date</th>
                <th className="py-3 px-4">Valid Until</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-sm">
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-outline text-sm">
                    No quotations generated for this client yet.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-surface-container/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-on-surface">
                      {q.quotationNumber} (v{q.versionNo})
                    </td>
                    <td className="py-3 px-4 text-xs text-on-surface-variant font-mono">
                      {q.eventDate || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-outline font-mono">{q.validUntil}</td>
                    <td className="py-3 px-4 font-medium text-on-surface">
                      {formatINR(BigInt(q.totalPaise))}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary-container text-on-secondary-container capitalize">
                        {q.derivedStatus || q.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/crm/quotations/${q.id}`}
                        className="text-xs text-primary font-medium hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Activity Feed */}
      {activeTab === 'activity' && (
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col gap-4">
          {activities.length === 0 ? (
            <span className="text-xs text-outline italic">No activities recorded yet.</span>
          ) : (
            <div className="flex flex-col divide-y divide-outline-variant/20">
              {activities.map((a) => (
                <div key={a.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-surface-container text-primary mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-on-surface">
                        {a.action.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-xs text-outline">
                        Performed by {a.profiles?.full_name || 'System User'}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-outline whitespace-nowrap">
                    {new Date(a.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
