'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CreditNote } from '@/types/finance';
import { formatINR } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface CreditNotesTableProps {
  initialCreditNotes: CreditNote[];
}

export function CreditNotesTable({ initialCreditNotes }: CreditNotesTableProps) {
  const [creditNotes] = useState<CreditNote[]>(initialCreditNotes);
  const [search, setSearch] = useState('');

  const filtered = creditNotes.filter((cn) => {
    return (
      cn.creditNoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      (cn.clientName && cn.clientName.toLowerCase().includes(search.toLowerCase())) ||
      (cn.invoiceNumber && cn.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
      cn.reason.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
            Credit Notes Ledger
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Issued credit adjustments linked directly to invoices (D-22).
          </p>
        </div>
      </div>

      {/* Filter Matrix */}
      <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm flex items-center justify-between gap-4">
        <div className="w-full md:w-96">
          <Input
            type="text"
            placeholder="Search by CN #, invoice, client, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-stone-500">
          Showing <strong>{filtered.length}</strong> credit notes
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-stone-500">
            No credit notes recorded. Credit notes are issued from invoice detail pages.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">CN #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Linked Invoice</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Credit Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((cn) => (
                  <tr key={cn.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-stone-900">
                      {cn.creditNoteNumber}
                    </td>
                    <td className="py-3 px-4 text-stone-600">{cn.issueDate}</td>
                    <td className="py-3 px-4 font-medium text-stone-900">
                      {cn.clientName || 'Client'}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <Link
                        href={`/crm/invoices/${cn.invoiceId}`}
                        className="text-stone-700 hover:underline"
                      >
                        {cn.invoiceNumber || 'INV'} →
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-stone-600 max-w-xs truncate" title={cn.reason}>
                      {cn.reason}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                      -{formatINR(BigInt(cn.totalPaise))}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="warning">{cn.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
