'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Payment } from '@/types/finance';
import { formatINR } from '@/lib/money';
import { voidPaymentAction } from '@/server/actions/finance.actions';
import { RecordPaymentDialog } from '@/components/finance/record-payment-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

interface PaymentsTableProps {
  initialPayments: Payment[];
  allClients: Array<{ id: string; fullName: string }>;
  allInvoices: Array<{
    id: string;
    invoiceNumber: string;
    clientId: string;
    balancePaise: number;
  }>;
}

export function PaymentsTable({ initialPayments, allClients, allInvoices }: PaymentsTableProps) {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>(initialPayments);

  useEffect(() => {
    setPayments(initialPayments);
  }, [initialPayments]);
  const [search, setSearch] = useState('');
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  // Void modal state
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidPaymentId, setVoidPaymentId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isSubmittingVoid, setIsSubmittingVoid] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const filtered = payments.filter((p) => {
    return (
      (p.clientName && p.clientName.toLowerCase().includes(search.toLowerCase())) ||
      (p.receiptNumber && p.receiptNumber.toLowerCase().includes(search.toLowerCase())) ||
      (p.referenceNumber && p.referenceNumber.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const handleVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidPaymentId) return;

    setIsSubmittingVoid(true);
    setVoidError(null);

    const res = await voidPaymentAction({
      paymentId: voidPaymentId,
      reason: voidReason,
    });

    if (res.error) {
      setVoidError(res.error.message);
      setIsSubmittingVoid(false);
    } else {
      setIsSubmittingVoid(false);
      setIsVoidModalOpen(false);
      setVoidPaymentId(null);
      setVoidReason('');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">
            Client Payments &amp; Receipts Ledger
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Recorded receipts, multi-invoice allocations, and immutable transaction audit.
          </p>
        </div>
        <Button onClick={() => setIsRecordPaymentOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Record Payment
        </Button>
      </div>

      {/* Filter Matrix */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/40 shadow-sm flex items-center justify-between gap-4">
        <div className="w-full md:w-96">
          <Input
            type="text"
            placeholder="Search by client, receipt #, reference UTR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-outline">
          Showing <strong className="text-on-surface">{filtered.length}</strong> payments
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-outline">
            No payments found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-outline-variant/40 bg-surface-container-low text-on-surface-variant font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Method &amp; Ref</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Allocations</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-on-surface">
                {filtered.map((p) => {
                  const isVoided = p.status === 'voided';
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-surface-container-low/60 transition-colors ${
                        isVoided ? 'bg-surface-container-low/40 opacity-60' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-medium text-on-surface">
                        {p.receiptNumber || 'RCP-RECORD'}
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant">{p.paymentDate}</td>
                      <td className="py-3 px-4 font-medium text-on-surface">
                        {p.clientName || 'Client'}
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant">
                        <span className="capitalize">{p.method.replace('_', ' ')}</span>
                        {p.referenceNumber && (
                          <span className="text-[11px] text-outline block font-mono">
                            {p.referenceNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-on-surface">
                        {formatINR(BigInt(p.amountPaise))}
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant">
                        <div className="space-y-0.5">
                          {(p.allocations || []).map((a, aIdx) => (
                            <span key={aIdx} className="block text-[11px]">
                              {a.invoiceNumber}: {formatINR(BigInt(a.amountPaise))}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={isVoided ? 'danger' : 'success'}>
                          {isVoided ? 'Voided' : 'Recorded'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!isVoided ? (
                          <button
                            type="button"
                            onClick={() => {
                              setVoidPaymentId(p.id);
                              setIsVoidModalOpen(true);
                            }}
                            className="text-error hover:underline font-medium text-xs"
                          >
                            Void
                          </button>
                        ) : (
                          <span className="text-[10px] text-outline" title={p.voidReason || ''}>
                            Voided
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        clients={allClients}
        invoices={allInvoices}
        onSuccess={() => router.refresh()}
      />

      {/* Void Payment Confirmation Modal */}
      {isVoidModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-on-surface">Void Payment</h3>
            <p className="text-xs text-on-surface-variant">
              Voiding reverses all invoice allocations and marks the transaction as voided. Payments cannot be deleted (D-21).
            </p>

            {voidError && (
              <div className="p-2.5 bg-error-container border border-error/30 text-on-error-container text-xs rounded-lg">
                {voidError}
              </div>
            )}

            <form onSubmit={handleVoid} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Void Reason <span className="text-error">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Bank cheque returned unpaid, duplicate transaction..."
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low text-on-surface p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsVoidModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="destructive" disabled={isSubmittingVoid}>
                  {isSubmittingVoid ? 'Voiding...' : 'Confirm Void'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
