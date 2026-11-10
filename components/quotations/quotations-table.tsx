'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Quotation } from '@/types/sales';
import { formatINR } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deleteDraftQuotationAction } from '@/server/actions/quotation.actions';

interface QuotationsTableProps {
  initialQuotations: Quotation[];
}

export function QuotationsTable({ initialQuotations }: QuotationsTableProps) {
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const matchesSearch =
        q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.clientName && q.clientName.toLowerCase().includes(searchTerm.toLowerCase()));

      const effectiveStatus = q.derivedStatus || q.status;
      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'draft' && effectiveStatus === 'draft') ||
        (selectedStatus === 'sent' && effectiveStatus === 'sent') ||
        (selectedStatus === 'accepted' && effectiveStatus === 'accepted') ||
        (selectedStatus === 'rejected' && effectiveStatus === 'rejected') ||
        (selectedStatus === 'expired' && effectiveStatus === 'expired');

      return matchesSearch && matchesStatus;
    });
  }, [quotations, searchTerm, selectedStatus]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft quotation? This cannot be undone.')) {
      return;
    }
    setIsDeleting(id);
    const res = await deleteDraftQuotationAction(id);
    setIsDeleting(null);
    if (res.error) {
      alert(`Error: ${res.error.message}`);
    } else {
      setQuotations((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const getStatusBadge = (q: Quotation) => {
    const status = q.derivedStatus || q.status;
    switch (status) {
      case 'accepted':
        return <Badge variant="success">Accepted</Badge>;
      case 'sent':
        return <Badge variant="info">Sent</Badge>;
      case 'expired':
        return <Badge variant="danger">Expired</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'superseded':
        return <Badge variant="muted">Superseded</Badge>;
      case 'draft':
      default:
        return <Badge variant="default">Draft v{q.versionNo}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-on-surface">Quotations</h1>
          <p className="text-sm text-outline">Manage bespoke pricing, estimates, and customer acceptances.</p>
        </div>
        <Link href="/crm/quotations/new">
          <Button className="bg-[#4c6452] hover:bg-[#3d5242] text-white">
            <span className="material-symbols-outlined text-[18px] mr-1">add</span>
            New Quotation
          </Button>
        </Link>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/40">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {['all', 'draft', 'sent', 'accepted', 'rejected', 'expired'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedStatus(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                selectedStatus === tab
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search quotes or clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/40 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-surface-container-low text-on-surface-variant font-medium border-b border-outline-variant/40">
            <tr>
              <th className="py-3 px-4">Quotation #</th>
              <th className="py-3 px-4">Client</th>
              <th className="py-3 px-4">Version</th>
              <th className="py-3 px-4">Valid Until</th>
              <th className="py-3 px-4 text-right">Subtotal</th>
              <th className="py-3 px-4 text-right">Discount</th>
              <th className="py-3 px-4 text-right">Tax (GST)</th>
              <th className="py-3 px-4 text-right font-semibold">Total</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20 text-on-surface">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-outline">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-4xl text-outline/60">receipt_long</span>
                    <p>No quotations found matching your filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((q) => (
                <tr key={q.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-primary">
                    <Link href={`/crm/quotations/${q.id}`} className="hover:underline flex items-center gap-1">
                      {q.quotationNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-medium text-on-surface">
                    {q.clientName || 'Unnamed Client'}
                  </td>
                  <td className="py-3 px-4 text-outline">
                    v{q.versionNo} {q.isCurrent ? <span className="text-xs text-primary font-bold">(Current)</span> : ''}
                  </td>
                  <td className="py-3 px-4 text-on-surface-variant">
                    {new Date(q.validUntil).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-4 text-right">{formatINR(BigInt(q.subtotalPaise))}</td>
                  <td className="py-3 px-4 text-right text-error">
                    {q.discountPaise > 0 ? `-${formatINR(BigInt(q.discountPaise))}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right text-on-surface-variant">
                    {q.taxPaise > 0 ? formatINR(BigInt(q.taxPaise)) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-on-surface">
                    {formatINR(BigInt(q.totalPaise))}
                  </td>
                  <td className="py-3 px-4 text-center">{getStatusBadge(q)}</td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <Link href={`/crm/quotations/${q.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-on-surface-variant hover:text-on-surface">
                        View
                      </Button>
                    </Link>
                    {q.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDeleting === q.id}
                        onClick={() => handleDelete(q.id)}
                        className="h-8 px-2 text-error hover:bg-error/10"
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
