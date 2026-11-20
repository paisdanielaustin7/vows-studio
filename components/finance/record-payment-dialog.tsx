'use client';

import React, { useState, useEffect } from 'react';
import { formatINR, toPaise } from '@/lib/money';
import { recordPaymentAction } from '@/server/actions/finance.actions';
import { PaymentMethod } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RecordPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Array<{ id: string; fullName: string }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    clientId: string;
    balancePaise: number;
    issueDate?: string;
  }>;
  preselectedInvoiceId?: string;
  preselectedClientId?: string;
  onSuccess?: () => void;
}

export function RecordPaymentDialog({
  isOpen,
  onClose,
  clients,
  invoices,
  preselectedInvoiceId,
  preselectedClientId,
  onSuccess,
}: RecordPaymentDialogProps) {
  const [clientId, setClientId] = useState(preselectedClientId || clients[0]?.id || '');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [amountRupees, setAmountRupees] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Invoice allocations: map of invoiceId -> allocatedRupees
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available invoices for selected client
  const clientInvoices = invoices.filter((inv) => inv.clientId === clientId && inv.balancePaise > 0);

  // Prefill when preselectedInvoiceId is given
  useEffect(() => {
    if (preselectedInvoiceId) {
      const target = invoices.find((inv) => inv.id === preselectedInvoiceId);
      if (target) {
        setClientId(target.clientId);
        const balRupees = Math.round(target.balancePaise / 100);
        setAmountRupees(balRupees);
        setAllocations({ [target.id]: balRupees });
      }
    }
  }, [preselectedInvoiceId, invoices]);

  useEffect(() => {
    if (preselectedClientId) {
      setClientId(preselectedClientId);
    } else if (!clientId && clients.length > 0) {
      setClientId(clients[0].id);
    }
  }, [preselectedClientId, clients, clientId]);

  // Update allocation handler
  const handleAllocationChange = (invoiceId: string, valRupees: number) => {
    setAllocations({
      ...allocations,
      [invoiceId]: Math.max(0, valRupees),
    });
  };

  // Calculations
  const paymentAmountPaise = Number(toPaise(Number(amountRupees) || 0));
  const totalAllocatedPaise = Object.entries(allocations).reduce((acc, [invId, val]) => {
    // Only count if invoice belongs to this client and val > 0
    if (clientInvoices.some((ci) => ci.id === invId) && val > 0) {
      return acc + Number(toPaise(Number(val) || 0));
    }
    return acc;
  }, 0);

  const unallocatedPaise = paymentAmountPaise - totalAllocatedPaise;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setErrorMsg('Please select a client.');
      return;
    }
    if (paymentAmountPaise <= 0) {
      setErrorMsg('Payment amount must be greater than zero.');
      return;
    }
    if (unallocatedPaise !== 0) {
      setErrorMsg(
        `All funds must be fully allocated to invoices (D-21). Unallocated balance: ${formatINR(
          BigInt(unallocatedPaise)
        )}`
      );
      return;
    }

    // Build payload allocations
    const activeAllocations = Object.entries(allocations)
      .filter(([invId, val]) => clientInvoices.some((ci) => ci.id === invId) && val > 0)
      .map(([invoiceId, val]) => ({
        invoiceId,
        amountPaise: Number(toPaise(val)),
      }));

    if (activeAllocations.length === 0) {
      setErrorMsg('Please allocate payment to at least one invoice.');
      return;
    }

    // Verify no invoice is over-allocated
    for (const alloc of activeAllocations) {
      const inv = clientInvoices.find((ci) => ci.id === alloc.invoiceId);
      if (inv && alloc.amountPaise > inv.balancePaise) {
        setErrorMsg(
          `Allocation to ${inv.invoiceNumber} (${formatINR(
            BigInt(alloc.amountPaise)
          )}) exceeds its outstanding balance (${formatINR(BigInt(inv.balancePaise))}).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await recordPaymentAction({
      clientId,
      paymentDate,
      amountPaise: paymentAmountPaise,
      method,
      referenceNumber: referenceNumber || null,
      notes: notes || null,
      allocations: activeAllocations,
    });

    if (res.error) {
      setErrorMsg(res.error.message);
      setIsSubmitting(false);
    } else {
      setIsSubmitting(false);
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
          <div>
            <h3 className="text-lg font-bold text-on-surface">Record Client Payment</h3>
            <p className="text-xs text-on-surface-variant">
              Collect funds, allocate across open invoices, and generate atomic receipt (RCP).
            </p>
          </div>
          <button onClick={onClose} className="text-outline hover:text-on-surface text-lg">
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-error-container border border-error/30 text-on-error-container text-xs rounded-lg">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">
                Client <span className="text-error">*</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setAllocations({});
                }}
                className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="" disabled>
                  Select client...
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">
                Payment Date <span className="text-error">*</span>
              </label>
              <Input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">
                Payment Amount (₹) <span className="text-error">*</span>
              </label>
              <Input
                type="number"
                min={1}
                required
                value={amountRupees === 0 ? '' : amountRupees}
                placeholder="0"
                onFocus={(e) => e.target.select()}
                onChange={(e) => setAmountRupees(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">
                Payment Method <span className="text-error">*</span>
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="upi">UPI (GPay / PhonePe / QR)</option>
                <option value="cash">Cash</option>
                <option value="card">Credit / Debit Card</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">
                Reference / Transaction UTR #
              </label>
              <Input
                placeholder="UTR / Cheque No. / Transaction ID"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Notes</label>
              <Input
                placeholder="e.g. Advance shoot retainer milestone"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Allocation Section with Unallocated Meter (D-21) */}
          <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                  Invoice Allocations
                </h4>
                <p className="text-[11px] text-on-surface-variant">
                  Select and allocate received amount across open invoices.
                </p>
              </div>

              {/* Real-time Unallocated Meter */}
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-outline block">
                  Unallocated Funds
                </span>
                <span
                  className={`text-xs font-mono font-bold ${
                    unallocatedPaise === 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : unallocatedPaise > 0
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-error'
                  }`}
                >
                  {formatINR(BigInt(unallocatedPaise))}
                </span>
              </div>
            </div>

            {clientInvoices.length === 0 ? (
              <p className="text-xs text-outline py-3 text-center">
                No unpaid invoices found for this client. Issue an advance invoice first (D-21).
              </p>
            ) : (
              <div className="divide-y divide-outline-variant/30 border border-outline-variant/40 rounded-lg bg-surface-container-lowest">
                {clientInvoices.map((inv) => {
                  const balRupees = Math.round(inv.balancePaise / 100);
                  const currentAllocRupees = allocations[inv.id] || 0;
                  return (
                    <div key={inv.id} className="p-3 flex items-center justify-between gap-4 text-xs">
                      <div>
                        <span className="font-semibold text-on-surface block font-mono">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-on-surface-variant">
                          Balance: {formatINR(BigInt(inv.balancePaise))}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAllocationChange(inv.id, balRupees)}
                          className="text-[10px] text-primary hover:underline font-medium"
                        >
                          Max
                        </button>
                        <div className="w-32">
                          <Input
                            type="number"
                            min={0}
                            max={balRupees}
                            value={currentAllocRupees || ''}
                            placeholder="₹0"
                            onChange={(e) =>
                              handleAllocationChange(inv.id, parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/40">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || unallocatedPaise !== 0 || paymentAmountPaise <= 0}
            >
              {isSubmitting ? 'Recording...' : 'Confirm & Record Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
