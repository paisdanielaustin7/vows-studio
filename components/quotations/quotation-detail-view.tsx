'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Quotation, QuotationItem, QuotationStatus } from '@/types/sales';
import { formatINR } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  updateQuotationStatusAction,
  createQuotationVersionAction,
  deleteDraftQuotationAction,
} from '@/server/actions/quotation.actions';
import { SendDocumentDialog } from '@/components/common/send-document-dialog';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  History,
  Mail,
  Send,
  X,
} from 'lucide-react';

interface QuotationDetailViewProps {
  quotation: Quotation;
  items: QuotationItem[];
  versions: Array<{
    id: string;
    versionNo: number;
    isCurrent: boolean;
    status: QuotationStatus;
    totalPaise: number;
    createdAt: string;
  }>;
}

export function QuotationDetailView({
  quotation: initialQuotation,
  items,
  versions,
}: QuotationDetailViewProps) {
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation>(initialQuotation);
  const [isVersionDrawerOpen, setIsVersionDrawerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSendEmailOpen, setIsSendEmailOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveStatus = quotation.derivedStatus || quotation.status;

  const handleStatusChange = async (newStatus: 'sent' | 'accepted' | 'rejected', rejectionReason?: string) => {
    setIsProcessing(true);
    setErrorMsg(null);
    const res = await updateQuotationStatusAction(quotation.id, newStatus, rejectionReason);
    setIsProcessing(false);
    if (res.error) {
      setErrorMsg(res.error.message);
    } else {
      setQuotation((prev) => ({
        ...prev,
        status: newStatus,
        derivedStatus: newStatus,
        sentAt: newStatus === 'sent' ? new Date().toISOString() : prev.sentAt,
        acceptedAt: newStatus === 'accepted' ? new Date().toISOString() : prev.acceptedAt,
        rejectedAt: newStatus === 'rejected' ? new Date().toISOString() : prev.rejectedAt,
      }));
      router.refresh();
    }
  };

  const handleCreateNewVersion = async () => {
    if (!confirm('Create a new draft version from this quotation?')) return;
    setIsProcessing(true);
    setErrorMsg(null);
    const res = await createQuotationVersionAction(quotation.id);
    setIsProcessing(false);
    if (res.error) {
      setErrorMsg(res.error.message);
    } else {
      router.push(`/crm/quotations/${res.data}`);
    }
  };

  const handleDeleteDraft = async () => {
    if (!confirm('Are you sure you want to delete this draft? This cannot be undone.')) return;
    setIsProcessing(true);
    const res = await deleteDraftQuotationAction(quotation.id);
    setIsProcessing(false);
    if (res.error) {
      setErrorMsg(res.error.message);
    } else {
      router.push('/crm/quotations');
    }
  };

  const getStatusBadge = () => {
    switch (effectiveStatus) {
      case 'accepted':
        return <Badge variant="success">Accepted</Badge>;
      case 'sent':
        return <Badge variant="info">Sent to Client</Badge>;
      case 'expired':
        return <Badge variant="danger">Expired</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'superseded':
        return <Badge variant="muted">Superseded</Badge>;
      case 'draft':
      default:
        return <Badge variant="default">Draft • v{quotation.versionNo}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/crm/quotations"
            className="p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">
            {quotation.quotationNumber}
          </h1>
          {getStatusBadge()}
          <button
            onClick={() => setIsVersionDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-medium text-on-surface-variant transition-colors"
          >
            <History className="w-4 h-4" />
            <span>View {versions.length} version{versions.length > 1 ? 's' : ''}</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {effectiveStatus === 'draft' && (
            <>
              <Button
                variant="outline"
                disabled={isProcessing}
                onClick={handleDeleteDraft}
                className="text-error border-error/30 hover:bg-error/10"
              >
                Delete Draft
              </Button>
              <Button
                disabled={isProcessing}
                onClick={() => handleStatusChange('sent')}
                className="bg-[#4c6452] hover:bg-[#3d5242] text-white flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                Mark as Sent
              </Button>
            </>
          )}

          {effectiveStatus === 'sent' && (
            <>
              <Button
                variant="outline"
                disabled={isProcessing}
                onClick={() => {
                  const reason = prompt('Please enter rejection reason (optional):');
                  handleStatusChange('rejected', reason || undefined);
                }}
                className="text-error border-error/30 hover:bg-error/10"
              >
                Mark Rejected
              </Button>
              <Button
                disabled={isProcessing}
                onClick={() => handleStatusChange('accepted')}
                className="bg-[#4c6452] hover:bg-[#3d5242] text-white flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Accepted
              </Button>
            </>
          )}

          {effectiveStatus !== 'draft' && (
            <Button
              variant="outline"
              disabled={isProcessing}
              onClick={handleCreateNewVersion}
              className="flex items-center gap-1.5"
            >
              <Copy className="w-4 h-4" />
              New Version
            </Button>
          )}

          <Button
            onClick={() => setIsSendEmailOpen(true)}
            className="bg-inverse-surface text-surface hover:opacity-90 flex items-center gap-1.5"
          >
            <Mail className="w-4 h-4" />
            Send via Email
          </Button>

          <Button
            variant="outline"
            onClick={() => window.open(`/api/pdf/quotation/${quotation.id}`, '_blank')}
            className="flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      </div>

      <SendDocumentDialog
        isOpen={isSendEmailOpen}
        onClose={() => setIsSendEmailOpen(false)}
        documentType="quotation"
        documentId={quotation.id}
        documentNumber={quotation.quotationNumber}
        defaultRecipientEmail=""
        defaultSubject={`Quotation ${quotation.quotationNumber} from VOWS Studio`}
        pdfDownloadUrl={`/api/pdf/quotation/${quotation.id}`}
      />

      {errorMsg && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Canvas) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Metadata Card */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/40">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <span className="text-xs uppercase font-medium text-outline block mb-1">Client</span>
                <p className="font-semibold text-base text-on-surface">
                  {quotation.clientName || 'Unnamed Client'}
                </p>
                {quotation.clientGstin && (
                  <p className="text-xs text-outline mt-0.5">GSTIN: {quotation.clientGstin}</p>
                )}
              </div>
              <div>
                <span className="text-xs uppercase font-medium text-outline block mb-1">Event Date</span>
                <p className="font-semibold text-base text-on-surface">
                  {quotation.eventDate
                    ? new Date(quotation.eventDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Not specified'}
                </p>
              </div>
              <div>
                <span className="text-xs uppercase font-medium text-outline block mb-1">Validity</span>
                <p className="font-semibold text-base text-on-surface">
                  {new Date(quotation.validUntil).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
                {effectiveStatus === 'expired' && (
                  <p className="text-xs text-error font-semibold mt-0.5">Quotation Expired</p>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/40 overflow-hidden">
            <div className="p-4 bg-surface-container-low border-b border-outline-variant/40 flex justify-between items-center">
              <h3 className="font-semibold text-sm text-on-surface">Deliverables & Line Items</h3>
              <span className="text-xs text-outline">{items.length} items</span>
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-surface-container-low/50 text-outline text-xs uppercase font-medium border-b border-outline-variant/20">
                <tr>
                  <th className="py-2.5 px-4 w-12">#</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-center w-16">Qty</th>
                  <th className="py-2.5 px-4 text-right w-32">Rate</th>
                  <th className="py-2.5 px-4 text-right w-32">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {items.map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td className="py-3 px-4 text-outline">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-on-surface">{it.description}</p>
                      {it.hsnSacCode && (
                        <p className="text-[11px] text-outline">SAC: {it.hsnSacCode}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-on-surface">{it.quantity}</td>
                    <td className="py-3 px-4 text-right text-on-surface">
                      {formatINR(BigInt(it.unitPricePaise))}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-on-surface">
                      {formatINR(BigInt(it.lineTotalPaise))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes & Terms */}
          {(quotation.notesToClient || quotation.terms) && (
            <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/40 space-y-4">
              {quotation.notesToClient && (
                <div>
                  <h4 className="text-xs uppercase font-semibold text-outline mb-1">Notes to Client</h4>
                  <p className="text-sm text-on-surface whitespace-pre-wrap">{quotation.notesToClient}</p>
                </div>
              )}
              {quotation.terms && (
                <div className="pt-3 border-t border-outline-variant/30">
                  <h4 className="text-xs uppercase font-semibold text-outline mb-1">Terms & Conditions</h4>
                  <p className="text-xs text-on-surface-variant whitespace-pre-wrap font-mono">
                    {quotation.terms}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Financial Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/40 space-y-4">
            <h3 className="font-semibold text-base text-on-surface border-b border-outline-variant/30 pb-3">
              Financial Breakdown
            </h3>

            <div className="flex justify-between items-center text-sm">
              <span className="text-on-surface-variant">Subtotal</span>
              <span className="font-medium text-on-surface">
                {formatINR(BigInt(quotation.subtotalPaise))}
              </span>
            </div>

            {quotation.discountPaise > 0 && (
              <div className="flex justify-between items-center text-sm text-error">
                <span>
                  Discount{' '}
                  {quotation.discountType === 'percent' && quotation.discountBps
                    ? `(${quotation.discountBps / 100}%)`
                    : ''}
                </span>
                <span>-{formatINR(BigInt(quotation.discountPaise))}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm pt-2 border-t border-outline-variant/20 font-medium">
              <span className="text-on-surface">Taxable Amount</span>
              <span className="text-on-surface">{formatINR(BigInt(quotation.taxablePaise))}</span>
            </div>

            {quotation.gstApplied && quotation.taxType !== 'none' && (
              <div className="pt-2 border-t border-outline-variant/20 space-y-1.5 text-xs text-outline">
                {quotation.taxType === 'cgst_sgst' ? (
                  <>
                    <div className="flex justify-between">
                      <span>CGST (9%)</span>
                      <span>{formatINR(BigInt(quotation.cgstPaise))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST (9%)</span>
                      <span>{formatINR(BigInt(quotation.sgstPaise))}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>IGST (18%)</span>
                    <span>{formatINR(BigInt(quotation.igstPaise))}</span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t-2 border-outline-variant/40 space-y-1">
              <span className="text-xs uppercase font-semibold text-outline">Grand Total</span>
              <div className="text-2xl font-bold text-on-surface">
                {formatINR(BigInt(quotation.totalPaise))}
              </div>
              <p className="text-[11px] text-outline">Inclusive of applicable taxes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Version History Drawer / Modal */}
      {isVersionDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-surface-container-lowest h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
              <div>
                <h3 className="font-bold text-lg text-on-surface">Version History</h3>
                <p className="text-xs text-outline">{quotation.quotationNumber}</p>
              </div>
              <button
                onClick={() => setIsVersionDrawerOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {versions.map((ver) => (
                <div
                  key={ver.id}
                  className={`p-4 rounded-xl border transition-all ${
                    ver.id === quotation.id
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant/40 bg-surface-container-low/40 hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-on-surface">
                      Version {ver.versionNo}
                    </span>
                    <Badge variant={ver.status === 'accepted' ? 'success' : 'default'}>
                      {ver.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-outline">
                    <span>
                      {new Date(ver.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="font-semibold text-on-surface">
                      {formatINR(BigInt(ver.totalPaise))}
                    </span>
                  </div>
                  {ver.id !== quotation.id && (
                    <div className="mt-3 text-right">
                      <Link href={`/crm/quotations/${ver.id}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setIsVersionDrawerOpen(false)}
                        >
                          Switch to v{ver.versionNo}
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
