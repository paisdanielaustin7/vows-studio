'use client';

import React, { useState, useEffect } from 'react';
import { Invoice, StudioSettings, UserAccount } from '@/types';
import {
  FileText,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Lock,
  Landmark,
  CloudUpload,
  Check,
  ExternalLink,
  Edit3,
} from 'lucide-react';
import { generateInvoicePDF, resolvePDFPalette, getInvoicePDFBase64 } from '@/lib/pdfGenerator';
import { defaultStudioSettings } from '@/lib/catalogDefaults';
import { formatCurrencyINR, maskClientName, maskAmount } from '@/lib/formatters';

interface InvoicesViewProps {
  invoices: Invoice[];
  settings?: StudioSettings;
  currentUser?: UserAccount;
  onUpdateInvoice?: (invoice: Invoice) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ invoices, settings, currentUser, onUpdateInvoice }) => {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(invoices[0] || null);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveSuccessMsg, setDriveSuccessMsg] = useState<string | null>(null);

  // Manual Invoice Editing State (Point 16)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editIssueDate, setEditIssueDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editTotal, setEditTotal] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editStatus, setEditStatus] = useState<Invoice['status']>('UNPAID');

  const canViewFinances = currentUser ? currentUser.canViewFinances : true;
  const isDemo = currentUser?.role === 'PRODUCT_DEMO';

  // Keep selectedInvoice in sync if invoices list updates
  useEffect(() => {
    if (invoices && invoices.length > 0) {
      if (!selectedInvoice || !invoices.some((i) => i.id === selectedInvoice.id)) {
        setSelectedInvoice(invoices[0]);
      } else {
        const refreshed = invoices.find((i) => i.id === selectedInvoice.id);
        if (refreshed) setSelectedInvoice(refreshed);
      }
    } else {
      setSelectedInvoice(null);
    }
  }, [invoices, selectedInvoice]);

  // Global Escape key listener (Point 18)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEditModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenEdit = (inv: Invoice) => {
    setEditInvoiceNumber(inv.invoiceNumber);
    setEditClientName(inv.clientName);
    setEditBrand(inv.brand);
    setEditIssueDate(inv.issueDate);
    setEditDueDate(inv.dueDate);
    setEditTotal(inv.totalAmount.toString());
    setEditBalance(inv.balanceDue.toString());
    setEditStatus(inv.status);
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const total = parseFloat(editTotal) || selectedInvoice.totalAmount;
    const balance = parseFloat(editBalance) >= 0 ? parseFloat(editBalance) : 0;

    const updated: Invoice = {
      ...selectedInvoice,
      invoiceNumber: editInvoiceNumber,
      clientName: editClientName,
      brand: editBrand,
      issueDate: editIssueDate,
      dueDate: editDueDate,
      subtotal: total,
      totalAmount: total,
      balanceDue: balance,
      status: editStatus,
    };

    if (onUpdateInvoice) {
      onUpdateInvoice(updated);
    }
    setSelectedInvoice(updated);
    setShowEditModal(false);
  };

  const effectiveSettings = settings || defaultStudioSettings;
  const previewPalette = resolvePDFPalette(effectiveSettings);
  const previewBg = `rgb(${previewPalette.bg.join(',')})`;
  const previewText = `rgb(${previewPalette.text.join(',')})`;
  const previewStrip = `rgb(${previewPalette.strip.join(',')})`;
  const previewMuted = `rgb(${previewPalette.muted.join(',')})`;
  const previewAccent = `rgb(${previewPalette.accent.join(',')})`;

  const formatCurrency = (val: number) => {
    if (!canViewFinances) return 'Rs. ••••••/-';
    if (isDemo) return maskAmount(val, true);
    return formatCurrencyINR(val);
  };

  const handleSaveInvoiceToDrive = async (inv: Invoice) => {
    setIsUploadingToDrive(true);
    setDriveSuccessMsg(null);

    try {
      const pdfBase64 = getInvoicePDFBase64(inv, effectiveSettings);
      const clientId = inv.clientId || `CLI-${inv.invoiceNumber.replace(/[^0-9]/g, '') || '01'}`;
      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientName: inv.clientName,
          docType: 'INVOICE',
          fileName: `Invoice for ${inv.clientName}.pdf`,
          pdfBase64,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const updated = { ...inv, driveFileUrl: data.fileUrl };
        if (onUpdateInvoice) {
          onUpdateInvoice(updated);
        }
        setSelectedInvoice(updated);
        setDriveSuccessMsg(data.message || `Archived to Drive under client folder "${data.folderName}"`);
        setTimeout(() => setDriveSuccessMsg(null), 5000);
      } else {
        alert(`Google Drive Upload Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Network error saving to Google Drive: ${err?.message}`);
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-bone-border dark:border-obsidian-border">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.25em] text-bone-muted dark:text-obsidian-muted mb-1">
            <span>Commercial Finance</span>
            <span>//</span>
            <span className="text-vermillion font-bold">Client Retainers & Settlement</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-serif font-black tracking-tight text-carbon dark:text-white uppercase">
            Billing & Invoices
          </h1>
        </div>

        <button
          onClick={() => alert('New invoice draft initialised.')}
          className="px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-xs font-mono uppercase tracking-widest bg-carbon text-bone dark:bg-white dark:text-carbon hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all flex items-center gap-1.5 sm:gap-2"
        >
          <FileText size={14} />
          <span>Draft New Invoice</span>
        </button>
      </div>

      {/* Grid: Invoice List (Left) + Detailed Invoice Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-start">
        {/* Invoices List */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-bone-muted dark:text-obsidian-muted block">
            Archived & Active Invoices ({invoices.length})
          </span>
          <div className="space-y-2">
            {invoices.length === 0 && (
              <div className="p-6 border border-dashed border-bone-border dark:border-obsidian-border text-center text-xs font-mono text-bone-muted dark:text-obsidian-muted">
                No invoices issued yet. Invoices generated from shoot orders will appear here.
              </div>
            )}
            {invoices.map((inv) => {
              const isSelected = selectedInvoice?.id === inv.id;
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`p-4 border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-2 border-carbon dark:border-white bg-bone-card dark:bg-obsidian-card shadow-brutalist-light dark:shadow-brutalist-dark'
                      : 'border-bone-border dark:border-obsidian-border bg-bone-card/60 dark:bg-obsidian-card/40 hover:border-carbon dark:hover:border-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="font-bold text-carbon dark:text-white">{inv.invoiceNumber}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 uppercase tracking-widest font-bold border ${
                        inv.status === 'PAID'
                          ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                          : inv.status === 'OVERDUE'
                          ? 'border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10'
                          : 'border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <h3 className="font-serif text-base font-bold text-carbon dark:text-white">
                    {inv.brand}
                  </h3>
                  <div className="mt-2 flex items-center justify-between text-xs font-mono">
                    <span className="text-bone-muted dark:text-obsidian-muted">
                      Due: {inv.dueDate}
                    </span>
                    <span className="font-bold text-carbon dark:text-white">
                      {formatCurrency(inv.totalAmount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Invoice Details Deck (Strictly Light Mode Paper / PDF Theme) */}
        {selectedInvoice ? (
          <div
            className="lg:col-span-7 border-2 border-carbon dark:border-white p-4 sm:p-6 lg:p-8 shadow-xl space-y-5 sm:space-y-6 max-h-none lg:max-h-[calc(100vh-140px)] overflow-visible lg:overflow-y-auto"
            style={{ backgroundColor: previewBg, color: previewText }}
          >
            {/* Header: Pure LUMINA Branding */}
            <div
              className="flex items-start justify-between pb-3 border-b"
              style={{ borderColor: previewStrip }}
            >
              <div>
                <span className="font-serif font-black text-lg sm:text-xl tracking-widest uppercase block">
                  {effectiveSettings.studioName}
                </span>
                <span className="text-[8.5px] font-mono text-[#6e7d76] uppercase tracking-wider block">
                  {effectiveSettings.tagline}
                </span>
                <span className="text-[8.5px] font-mono text-[#6e7d76] uppercase tracking-wider block mt-0.5">
                  {effectiveSettings.hasGst && effectiveSettings.gstin
                    ? `TAX INVOICE // GSTIN: ${effectiveSettings.gstin}`
                    : 'STUDIO INVOICE // Non-GST Enterprise'}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold block">{selectedInvoice.invoiceNumber}</span>
                <span
                  className={`text-[9px] font-mono uppercase px-2 py-0.5 font-bold inline-block mt-1 ${
                    selectedInvoice.status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : selectedInvoice.status === 'OVERDUE'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {selectedInvoice.status}
                </span>
              </div>
            </div>

            {/* Title & Dates */}
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-tight">
                {effectiveSettings.hasGst && effectiveSettings.gstin ? 'Tax Invoice' : 'Studio Invoice'}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
                <span className="text-[#3b4741]">
                  <strong>Issue Date:</strong> {selectedInvoice.issueDate}
                </span>
                <span className="text-[#6e7d76]">•</span>
                <span className="text-vermillion font-bold">
                  <strong>Due Date:</strong> {selectedInvoice.dueDate}
                </span>
              </div>
            </div>

            {/* Quoted / Billed to Client */}
            <div className="font-mono text-[11px] space-y-0.5">
              <span className="font-bold uppercase text-[9.5px] text-[#6e7d76] block mb-0.5">
                Billed to Client:
              </span>
              <p className="font-bold text-xs text-[#0f1714]">{selectedInvoice.clientName}</p>
              <p className="text-[#3b4741]">{selectedInvoice.brand}</p>
            </div>

            {/* Deliverables List Table (Scope only, no split pricing - Item 21) */}
            <div className="border border-[#d8e2dc] rounded-sm overflow-hidden bg-white/70">
              <div
                className="px-3.5 py-1.5 flex justify-between font-mono text-[11px] font-bold text-[#19231e]"
                style={{ backgroundColor: previewStrip }}
              >
                <span>Deliverables & Scope of Production</span>
                <span>Coverage</span>
              </div>
              <div className="divide-y divide-[#e4ede7] text-[11px] font-mono bg-white/80">
                {selectedInvoice.items.map((item) => (
                  <div key={item.id} className="p-3 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-[#0f1714] block">{item.description}</span>
                    </div>
                    <span className="text-[10px] text-[#5a6962] italic">
                      Included in Package
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Calculation */}
            <div className="pt-2 border-t border-[#d8e2dc] space-y-1.5 text-xs font-mono text-right">
              <div className="flex justify-between">
                <span className="text-[#5a6962] uppercase">Subtotal</span>
                <span className="font-bold text-[#0f1714]">{formatCurrency(selectedInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5a6962] uppercase">
                  {effectiveSettings.hasGst ? 'Integrated GST (18% CGST/SGST Included)' : 'GST Registration'}
                </span>
                <span className="text-[#0f1714]">
                  {effectiveSettings.hasGst ? '₹0.00' : 'Not Applicable (Small Business)'}
                </span>
              </div>
              <div
                className="flex justify-between text-sm sm:text-base font-black px-3 py-2 border border-[#d8e2dc] rounded-sm"
                style={{ backgroundColor: previewStrip, color: previewText }}
              >
                <span className="uppercase font-serif">Total Invoiced</span>
                <span>{formatCurrency(selectedInvoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold pt-1">
                <span className="uppercase text-[#5a6962]">Remaining Balance Due</span>
                <span className={selectedInvoice.balanceDue > 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                  {selectedInvoice.balanceDue > 0 ? formatCurrency(selectedInvoice.balanceDue) : 'PAYMENT CLEARED IN FULL'}
                </span>
              </div>
            </div>

            {/* Banking Remittance Card (Printed on Page 2 / Invoice Settlement) */}
            {effectiveSettings.bankingDetails && (
              <div className="p-3 bg-white/90 border border-[#d8e2dc] rounded-sm text-[10px] font-mono space-y-1 text-[#3b4741]">
                <div className="flex items-center gap-1.5 font-bold uppercase text-[#0f1714]">
                  <Landmark size={12} className="text-vermillion" />
                  <span>Banking Remittance (NEFT / RTGS / IMPS / UPI)</span>
                </div>
                <p>
                  <strong>Beneficiary:</strong> {effectiveSettings.bankingDetails.accountName}
                </p>
                <p>
                  <strong>Bank:</strong> {effectiveSettings.bankingDetails.bankName}, {effectiveSettings.bankingDetails.branch}
                </p>
                <p>
                  <strong>A/C:</strong> {effectiveSettings.bankingDetails.accountNumber} &nbsp;|&nbsp;{' '}
                  <strong>IFSC:</strong> {effectiveSettings.bankingDetails.ifscCode}
                  {effectiveSettings.bankingDetails.upiId && (
                    <>
                      &nbsp;|&nbsp; <strong>UPI:</strong> {effectiveSettings.bankingDetails.upiId}
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Drive Storage Status Banner */}
            {driveSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-mono flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>{driveSuccessMsg}</span>
                </div>
              </div>
            )}

            {/* Signoff Footer */}
            <div className="pt-2 border-t border-[#d8e2dc] flex items-center justify-between text-[11px] font-mono font-bold text-[#0f1714]">
              <span>{effectiveSettings.contactPerson.toUpperCase()} // STUDIO PRINCIPAL</span>
              <span>{effectiveSettings.contactPhone}</span>
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-[#d8e2dc] flex flex-wrap gap-2.5">
              <button
                onClick={() => handleOpenEdit(selectedInvoice)}
                className="py-2.5 px-3 text-xs font-mono uppercase tracking-widest border border-[#0f1714] text-[#0f1714] hover:bg-[#0f1714] hover:text-white transition-all flex items-center justify-center gap-1.5 font-bold"
                title="Edit invoice details manually"
              >
                <Edit3 size={13} />
                <span>Edit Invoice</span>
              </button>

              <button
                onClick={() => generateInvoicePDF(selectedInvoice, effectiveSettings)}
                className="flex-1 min-w-[150px] py-2.5 text-xs font-mono uppercase tracking-widest bg-[#0f1714] text-white hover:bg-vermillion transition-all flex items-center justify-center gap-2 font-bold shadow-md"
              >
                <Download size={14} />
                <span>Download PDF</span>
              </button>

              <button
                onClick={() => handleSaveInvoiceToDrive(selectedInvoice)}
                disabled={isUploadingToDrive}
                className="flex-1 min-w-[150px] py-2.5 text-xs font-mono uppercase tracking-widest border border-[#0f1714] text-[#0f1714] hover:bg-[#0f1714] hover:text-white transition-all flex items-center justify-center gap-2 font-bold disabled:opacity-50"
              >
                <CloudUpload size={14} className={isUploadingToDrive ? 'animate-bounce' : ''} />
                <span>{isUploadingToDrive ? 'Archiving...' : 'Save to Drive'}</span>
              </button>

              {selectedInvoice.driveFileUrl && (
                <a
                  href={selectedInvoice.driveFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 text-xs font-mono uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 font-bold"
                  title="Open stored file on Google Drive"
                >
                  <ExternalLink size={13} />
                  <span>Drive</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 p-12 border-2 border-dashed border-bone-border text-center text-bone-muted font-mono text-xs">
            No invoice selected. Select an invoice on the left to preview.
          </div>
        )}
      </div>

      {/* Edit Invoice Modal (Point 16) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-carbon/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-bone-card dark:bg-obsidian-card border-2 border-carbon dark:border-white p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-bone-border dark:border-obsidian-border">
              <div>
                <span className="text-[9.5px] font-mono text-vermillion uppercase font-bold block">
                  Commercial Adjustment
                </span>
                <h3 className="font-serif text-lg font-bold uppercase text-carbon dark:text-white">
                  Edit Invoice: {editInvoiceNumber}
                </h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-xs font-mono text-bone-muted hover:text-carbon dark:hover:text-white font-bold"
              >
                ✕ [Esc]
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-[11px] font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] uppercase text-bone-muted mb-0.5">Invoice Number</label>
                  <input
                    type="text"
                    required
                    value={editInvoiceNumber}
                    onChange={(e) => setEditInvoiceNumber(e.target.value)}
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-bone-muted mb-0.5">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Invoice['status'])}
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                  >
                    <option value="UNPAID">UNPAID</option>
                    <option value="PARTIAL">PARTIAL</option>
                    <option value="PAID">PAID</option>
                    <option value="OVERDUE">OVERDUE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] uppercase text-bone-muted mb-0.5">Client Name</label>
                  <input
                    type="text"
                    required
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-bone-muted mb-0.5">Package / Brand</label>
                  <input
                    type="text"
                    required
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] uppercase text-bone-muted mb-0.5">Issue Date</label>
                  <input
                    type="text"
                    required
                    value={editIssueDate}
                    onChange={(e) => setEditIssueDate(e.target.value)}
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-bone-muted mb-0.5">Due Date</label>
                  <input
                    type="text"
                    required
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border">
                <div>
                  <label className="block text-[9px] uppercase text-bone-muted mb-0.5">Total Amount (INR)</label>
                  <input
                    type="number"
                    required
                    value={editTotal}
                    onChange={(e) => {
                      const newTot = e.target.value;
                      setEditTotal(newTot);
                      const totNum = parseFloat(newTot) || 0;
                      if (effectiveSettings.advancePaymentEnabled) {
                        if (effectiveSettings.advancePaymentType === 'PERCENTAGE') {
                          const pct = effectiveSettings.advancePaymentPercentage || 50;
                          const adv = (totNum * pct) / 100;
                          setEditBalance((totNum - adv).toString());
                        } else {
                          const fix = effectiveSettings.advancePaymentFixedAmount || 15000;
                          setEditBalance(Math.max(0, totNum - fix).toString());
                        }
                      }
                    }}
                    className="w-full p-2 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-serif font-black text-base outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="block text-[9px] uppercase text-bone-muted">Balance Due (INR)</label>
                    <button
                      type="button"
                      onClick={() => setEditBalance('0')}
                      className="text-[9px] text-emerald-600 hover:underline"
                    >
                      Clear to 0
                    </button>
                  </div>
                  <input
                    type="number"
                    required
                    value={editBalance}
                    onChange={(e) => setEditBalance(e.target.value)}
                    className="w-full p-2 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-serif font-black text-base outline-none text-rose-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-carbon text-bone dark:bg-white dark:text-carbon font-bold uppercase tracking-widest hover:bg-vermillion transition-all"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 border border-bone-border dark:border-obsidian-border uppercase text-xs"
                >
                  ✕ [Esc] Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
