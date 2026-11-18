'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Invoice, InvoiceItem } from '@/types/finance';
import { formatINR, toPaise } from '@/lib/money';
import {
  updateInvoiceStatusAction,
  cancelInvoiceAction,
  issueCreditNoteAction,
} from '@/server/actions/finance.actions';
import { RecordPaymentDialog } from '@/components/finance/record-payment-dialog';
import { SendDocumentDialog } from '@/components/common/send-document-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface InvoiceDetailViewProps {
  invoice: Invoice;
  items: InvoiceItem[];
  payments: Array<{
    paymentId: string;
    receiptNumber: string | null;
    paymentDate: string;
    amountPaise: number;
    method: string;
    referenceNumber: string | null;
  }>;
  creditNotes: Array<{
    id: string;
    creditNoteNumber: string;
    issueDate: string;
    totalPaise: number;
    reason: string;
  }>;
  allClients: Array<{ id: string; fullName: string }>;
  canManage: boolean;
}

export function InvoiceDetailView({
  invoice,
  items,
  payments,
  creditNotes,
  allClients,
  canManage,
}: InvoiceDetailViewProps) {
  const router = useRouter();

  // Dialog states
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isSendEmailOpen, setIsSendEmailOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Credit note modal state
  const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
  const [creditReason, setCreditReason] = useState('');
  const [creditAmountRupees, setCreditAmountRupees] = useState(
    Math.round(invoice.balancePaise / 100)
  );
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);

  const isOverdue = invoice.displayStatus === 'overdue';

  const handleSendInvoice = async () => {
    if (!confirm('Mark invoice as SENT to client?')) return;
    const res = await updateInvoiceStatusAction(invoice.id, 'sent');
    if (!res.error) {
      router.refresh();
    }
  };

  const handleCancelInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelError(null);
    setIsSubmittingCancel(true);

    const res = await cancelInvoiceAction({
      invoiceId: invoice.id,
      reason: cancelReason,
    });

    if (res.error) {
      setCancelError(res.error.message);
      setIsSubmittingCancel(false);
    } else {
      setIsSubmittingCancel(false);
      setIsCancelModalOpen(false);
      router.refresh();
    }
  };

  const handleIssueCreditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreditError(null);
    setIsSubmittingCredit(true);

    const creditPaise = Number(toPaise(Number(creditAmountRupees) || 0));

    const res = await issueCreditNoteAction({
      invoiceId: invoice.id,
      issueDate: new Date().toISOString().slice(0, 10),
      reason: creditReason,
      items: [
        {
          description: `Credit Note adjustment: ${creditReason}`,
          quantity: 1,
          unitPricePaise: creditPaise,
        },
      ],
    });

    if (res.error) {
      setCreditError(res.error.message);
      setIsSubmittingCredit(false);
    } else {
      setIsSubmittingCredit(false);
      setIsCreditNoteModalOpen(false);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-outline">
          <Link href="/crm/invoices" className="hover:underline">
            Invoices
          </Link>
          <span>/</span>
          <span className="text-on-surface font-medium font-mono">{invoice.invoiceNumber}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === 'draft' && canManage && (
            <Button variant="outline" size="sm" onClick={handleSendInvoice}>
              Mark as Sent
            </Button>
          )}

          {invoice.paidPaise === 0 && invoice.status !== 'cancelled' && canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(true)}
              className="text-error border-error/30 hover:bg-error/10"
            >
              Cancel Invoice
            </Button>
          )}

          {invoice.balancePaise > 0 && invoice.status !== 'cancelled' && canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreditNoteModalOpen(true)}
            >
              Issue Credit Note
            </Button>
          )}

          {invoice.status !== 'cancelled' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSendEmailOpen(true)}
              className="bg-inverse-surface text-surface hover:opacity-90 border-transparent"
            >
              Send via Email
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/pdf/invoice/${invoice.id}`, '_blank')}
          >
            Download PDF
          </Button>

          {invoice.balancePaise > 0 && invoice.status !== 'cancelled' && canManage && (
            <Button size="sm" onClick={() => setIsRecordPaymentOpen(true)}>
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Overdue Warning Alert Banner */}
      {isOverdue && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold text-sm">Invoice is Overdue</p>
              <p className="text-xs opacity-90">
                Payment was due on {invoice.dueDate}. Outstanding balance of{' '}
                <strong>{formatINR(BigInt(invoice.balancePaise))}</strong> remains unpaid.
              </p>
            </div>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => setIsRecordPaymentOpen(true)}>
              Collect Payment
            </Button>
          )}
        </div>
      )}

      {/* Cancellation Notice Banner */}
      {invoice.status === 'cancelled' && (
        <div className="p-4 bg-surface-container border border-outline-variant rounded-xl text-on-surface-variant space-y-1">
          <p className="font-semibold text-sm text-on-surface">Invoice Cancelled</p>
          <p className="text-xs">
            <strong>Reason:</strong> {invoice.cancelReason || 'No reason specified'}
          </p>
        </div>
      )}

      {/* Main Two-Column Editorial Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Tax Invoice Document (8 cols) */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-sm p-8 space-y-8">
          {/* Header Monogram & Atelier Info */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-outline-variant/40">
            <div>
              <div className="py-1">
                <Image
                  src="/images/logo-light.png"
                  alt="VOWS"
                  width={160}
                  height={55}
                  className="h-10 w-auto object-contain dark:hidden"
                  priority
                />
                <Image
                  src="/images/logo-dark.png"
                  alt="VOWS"
                  width={160}
                  height={55}
                  className="h-10 w-auto object-contain hidden dark:block"
                  priority
                />
              </div>
              <p className="text-xs uppercase tracking-widest text-outline mt-1 font-medium">
                Wedding Cinematic &amp; Stills
              </p>
              <div className="text-xs text-on-surface-variant mt-2 space-y-0.5">
                <p>Mangalore Studio, Karnataka</p>
                <p>
                  GSTIN:{' '}
                  <span className="font-mono font-semibold text-on-surface">29AAACV1234F1Z8</span>
                </p>
              </div>
            </div>

            <div className="text-left md:text-right space-y-1">
              <span className="text-xs uppercase tracking-wider text-outline block font-medium">
                Tax Invoice
              </span>
              <span className="font-mono text-xl font-bold text-on-surface block">
                {invoice.invoiceNumber}
              </span>
              <div className="flex items-center gap-1.5 justify-start md:justify-end pt-1">
                <Badge
                  variant={
                    invoice.status === 'paid'
                      ? 'success'
                      : invoice.status === 'partially_paid'
                      ? 'warning'
                      : isOverdue
                      ? 'danger'
                      : invoice.status === 'sent'
                      ? 'info'
                      : 'default'
                  }
                >
                  {isOverdue ? 'Overdue' : invoice.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Client & Date Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs">
            <div className="space-y-1">
              <span className="uppercase tracking-wider font-semibold text-outline block">
                Billed To
              </span>
              <p className="font-semibold text-on-surface text-sm">{invoice.clientName}</p>
              {invoice.bookingNumber && (
                <p className="text-on-surface-variant">
                  Production Booking:{' '}
                  <Link
                    href={`/crm/bookings/${invoice.bookingId}`}
                    className="font-mono font-medium text-primary hover:underline"
                  >
                    {invoice.bookingNumber}
                  </Link>
                </p>
              )}
            </div>

            <div className="space-y-1 md:text-right">
              <div>
                <span className="text-outline">Issue Date: </span>
                <span className="font-medium text-on-surface">{invoice.issueDate}</span>
              </div>
              <div>
                <span className="text-outline">Payment Due: </span>
                <span className={`font-medium ${isOverdue ? 'text-error font-bold' : 'text-on-surface'}`}>
                  {invoice.dueDate}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/40 text-on-surface-variant uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Service &amp; Deliverable</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-on-surface">
                {items.map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td className="py-3 px-3 text-outline font-mono">{idx + 1}</td>
                    <td className="py-3 px-3 font-medium text-on-surface">{it.description}</td>
                    <td className="py-3 px-3 text-center text-on-surface-variant">{it.quantity}</td>
                    <td className="py-3 px-3 text-right text-on-surface-variant">
                      {formatINR(BigInt(it.unitPricePaise))}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-on-surface">
                      {formatINR(BigInt(it.lineTotalPaise))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculations Breakdown */}
          <div className="border-t border-outline-variant/40 pt-4 flex justify-end">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between text-on-surface-variant">
                <span>Subtotal</span>
                <span className="font-medium text-on-surface">
                  {formatINR(BigInt(invoice.subtotalPaise))}
                </span>
              </div>
              {invoice.discountPaise > 0 && (
                <div className="flex justify-between text-on-surface-variant">
                  <span>Discount</span>
                  <span className="font-medium text-error">
                    -{formatINR(BigInt(invoice.discountPaise))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-on-surface-variant">
                <span>Taxable Amount</span>
                <span className="font-medium text-on-surface">
                  {formatINR(BigInt(invoice.taxableAmountPaise))}
                </span>
              </div>
              {invoice.cgstPaise > 0 && (
                <div className="flex justify-between text-outline">
                  <span>CGST (9%)</span>
                  <span>{formatINR(BigInt(invoice.cgstPaise))}</span>
                </div>
              )}
              {invoice.sgstPaise > 0 && (
                <div className="flex justify-between text-outline">
                  <span>SGST (9%)</span>
                  <span>{formatINR(BigInt(invoice.sgstPaise))}</span>
                </div>
              )}
              {invoice.igstPaise > 0 && (
                <div className="flex justify-between text-outline">
                  <span>IGST (18%)</span>
                  <span>{formatINR(BigInt(invoice.igstPaise))}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-on-surface pt-2 border-t border-outline-variant/40">
                <span>Invoice Total</span>
                <span>{formatINR(BigInt(invoice.totalPaise))}</span>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          {(invoice.notesToClient || invoice.paymentTerms) && (
            <div className="border-t border-outline-variant/40 pt-4 text-xs space-y-2 text-on-surface-variant">
              {invoice.notesToClient && (
                <div>
                  <span className="font-semibold text-on-surface">Notes: </span>
                  <span>{invoice.notesToClient}</span>
                </div>
              )}
              {invoice.paymentTerms && (
                <div>
                  <span className="font-semibold text-on-surface">Payment Terms: </span>
                  <span>{invoice.paymentTerms}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Financial Balances & Transactions (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Balance Card */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/40 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-on-surface">Payment Snapshot</h3>
            <div className="divide-y divide-outline-variant/20 text-xs">
              <div className="py-2.5 flex justify-between text-on-surface-variant">
                <span>Total Invoiced</span>
                <span className="font-semibold text-on-surface">
                  {formatINR(BigInt(invoice.totalPaise))}
                </span>
              </div>
              <div className="py-2.5 flex justify-between text-on-surface-variant">
                <span>Total Received</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatINR(BigInt(invoice.paidPaise))}
                </span>
              </div>
              {invoice.creditedPaise > 0 && (
                <div className="py-2.5 flex justify-between text-on-surface-variant">
                  <span>Credit Notes Applied</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    -{formatINR(BigInt(invoice.creditedPaise))}
                  </span>
                </div>
              )}
              <div className="py-3 flex justify-between text-sm font-bold text-on-surface border-t border-outline-variant/40">
                <span>Balance Outstanding</span>
                <span
                  className={`font-mono text-base ${
                    invoice.balancePaise === 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : isOverdue
                      ? 'text-error'
                      : 'text-on-surface'
                  }`}
                >
                  {formatINR(BigInt(invoice.balancePaise))}
                </span>
              </div>
            </div>

            {invoice.balancePaise > 0 && invoice.status !== 'cancelled' && canManage && (
              <Button
                onClick={() => setIsRecordPaymentOpen(true)}
                className="w-full text-xs"
              >
                Record Payment
              </Button>
            )}
          </div>

          {/* Linked Payments & Receipts */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Payments &amp; Receipts ({payments.length})
            </h4>
            {payments.length === 0 ? (
              <p className="text-xs text-outline py-3 text-center">
                No payments recorded for this invoice yet.
              </p>
            ) : (
              <div className="divide-y divide-outline-variant/20">
                {payments.map((p, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-on-surface block font-mono">
                        {p.receiptNumber || 'Receipt'}
                      </span>
                      <span className="text-outline text-[11px]">
                        {p.paymentDate} • {p.method}
                      </span>
                    </div>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatINR(BigInt(p.amountPaise))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked Credit Notes */}
          {creditNotes.length > 0 && (
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Credit Notes ({creditNotes.length})
              </h4>
              <div className="divide-y divide-outline-variant/20">
                {creditNotes.map((cn) => (
                  <div key={cn.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-on-surface block font-mono">
                        {cn.creditNoteNumber}
                      </span>
                      <span className="text-outline text-[11px]">{cn.reason}</span>
                    </div>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      -{formatINR(BigInt(cn.totalPaise))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        clients={allClients}
        invoices={[
          {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            clientId: invoice.clientId,
            balancePaise: invoice.balancePaise,
          },
        ]}
        preselectedInvoiceId={invoice.id}
        preselectedClientId={invoice.clientId}
        onSuccess={() => router.refresh()}
      />

      {/* Send Document Dialog */}
      <SendDocumentDialog
        isOpen={isSendEmailOpen}
        onClose={() => setIsSendEmailOpen(false)}
        documentType="invoice"
        documentId={invoice.id}
        documentNumber={invoice.invoiceNumber}
        defaultRecipientEmail=""
        defaultSubject={`Tax Invoice ${invoice.invoiceNumber} from VOWS`}
        pdfDownloadUrl={`/api/pdf/invoice/${invoice.id}`}
      />

      {/* Cancel Invoice Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-on-surface">Cancel Invoice</h3>
            <p className="text-xs text-on-surface-variant">
              Cancelling is allowed only when zero payments exist (paid = ₹0). All linked bookings and delivery stages remain intact (D-22 / D-35).
            </p>

            {cancelError && (
              <div className="p-2.5 bg-error-container border border-error/30 text-on-error-container text-xs rounded-lg">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancelInvoice} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Cancellation Reason <span className="text-error">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Scope change requested prior to payment..."
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low text-on-surface p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCancelModalOpen(false)}
                >
                  Close
                </Button>
                <Button type="submit" size="sm" variant="destructive" disabled={isSubmittingCancel}>
                  {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Credit Note Modal */}
      {isCreditNoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-on-surface">Issue Credit Note</h3>
            <p className="text-xs text-on-surface-variant">
              Reduces outstanding balance. Capped at unpaid balance of{' '}
              <strong className="text-on-surface">{formatINR(BigInt(invoice.balancePaise))}</strong> (D-22).
            </p>

            {creditError && (
              <div className="p-2.5 bg-error-container border border-error/30 text-on-error-container text-xs rounded-lg">
                {creditError}
              </div>
            )}

            <form onSubmit={handleIssueCreditNote} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Credit Amount (₹) <span className="text-error">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={Math.round(invoice.balancePaise / 100)}
                  required
                  value={creditAmountRupees}
                  onChange={(e) => setCreditAmountRupees(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Reason <span className="text-error">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="e.g. Complimentary discount or scope waiver"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low text-on-surface p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreditNoteModalOpen(false)}
                >
                  Close
                </Button>
                <Button type="submit" size="sm" disabled={isSubmittingCredit}>
                  {isSubmittingCredit ? 'Issuing...' : 'Issue Credit Note'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
