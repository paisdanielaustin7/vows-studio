'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Invoice, InvoiceDisplayStatus } from '@/types/finance';
import { formatINR } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface InvoicesTableProps {
  initialInvoices: Invoice[];
  canManage: boolean;
}

export function InvoicesTable({ initialInvoices, canManage }: InvoicesTableProps) {
  const [invoices] = useState<Invoice[]>(initialInvoices);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (inv.clientName && inv.clientName.toLowerCase().includes(search.toLowerCase())) ||
      (inv.bookingNumber && inv.bookingNumber.toLowerCase().includes(search.toLowerCase()));

    const statusMatches =
      selectedStatus === 'all'
        ? true
        : selectedStatus === 'overdue'
        ? inv.displayStatus === 'overdue'
        : inv.status === selectedStatus;

    return matchesSearch && statusMatches;
  });

  const getStatusBadge = (status: InvoiceDisplayStatus) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>;
      case 'partially_paid':
        return <Badge variant="warning">Partially Paid</Badge>;
      case 'overdue':
        return <Badge variant="danger">Overdue</Badge>;
      case 'sent':
        return <Badge variant="info">Sent</Badge>;
      case 'draft':
        return <Badge variant="default">Draft</Badge>;
      case 'cancelled':
        return <Badge variant="muted">Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
            Invoices & Billing Dossier
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Manage tax invoices, overdue tracking, and automated balance synchronization.
          </p>
        </div>
        {canManage && (
          <Link href="/crm/invoices/new">
            <Button className="gap-2">
              <span className="text-base leading-none">+</span>
              Create Invoice
            </Button>
          </Link>
        )}
      </div>

      {/* Filter Matrix */}
      <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-96">
            <Input
              type="text"
              placeholder="Search by invoice #, client, booking..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 text-xs">
            {['all', 'draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'].map(
              (st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap capitalize transition-colors ${
                    selectedStatus === st
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-stone-500">
            No invoices found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`hover:bg-stone-50/70 transition-colors ${
                      inv.displayStatus === 'overdue' ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-stone-900">
                      <Link href={`/crm/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-900">
                      {inv.clientName || 'Client'}
                    </td>
                    <td className="py-3 px-4 text-stone-500">{inv.issueDate}</td>
                    <td className="py-3 px-4 text-stone-500">
                      <span
                        className={
                          inv.displayStatus === 'overdue' ? 'text-red-700 font-semibold' : ''
                        }
                      >
                        {inv.dueDate}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(inv.displayStatus || inv.status)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-stone-900">
                      {formatINR(BigInt(inv.totalPaise))}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-medium">
                      {formatINR(BigInt(inv.paidPaise))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                      {formatINR(BigInt(inv.balancePaise))}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link href={`/crm/invoices/${inv.id}`}>
                        <Button variant="outline" size="sm">
                          View →
                        </Button>
                      </Link>
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
