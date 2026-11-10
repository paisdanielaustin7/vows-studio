'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createInvoiceAction } from '@/server/actions/finance.actions';
import { formatINR, toPaise, percentOf } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BookingOption {
  id: string;
  bookingNumber: string;
  clientId: string;
  clientName: string;
  lines: Array<{
    description: string;
    quantity: number;
    unitPricePaise: number;
  }>;
}

interface InvoiceBuilderProps {
  bookings: BookingOption[];
}

interface ItemDraft {
  description: string;
  quantity: number;
  unitPriceRupees: number;
}

export function InvoiceBuilder({ bookings }: InvoiceBuilderProps) {
  const router = useRouter();

  const [selectedBookingId, setSelectedBookingId] = useState(bookings[0]?.id || '');
  const activeBooking = bookings.find((b) => b.id === selectedBookingId);

  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  const [notesToClient, setNotesToClient] = useState('Payment due upon receipt of invoice.');
  const [paymentTerms, setPaymentTerms] = useState('Net 14 days via NEFT / UPI / Bank Transfer');

  // Discount
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // GST
  const [gstType, setGstType] = useState<'cgst_sgst' | 'igst' | 'none'>('cgst_sgst');

  // Items
  const [items, setItems] = useState<ItemDraft[]>(
    activeBooking?.lines.length
      ? activeBooking.lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPriceRupees: Math.round(l.unitPricePaise / 100),
        }))
      : [{ description: 'Wedding Photography & Cinematography Services', quantity: 1, unitPriceRupees: 100000 }]
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When booking changes, prefill lines
  const handleBookingChange = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    const bk = bookings.find((b) => b.id === bookingId);
    if (bk && bk.lines.length > 0) {
      setItems(
        bk.lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPriceRupees: Math.round(l.unitPricePaise / 100),
        }))
      );
    }
  };

  // Line helpers
  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPriceRupees: 0 }]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: keyof ItemDraft, val: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: val };
    setItems(updated);
  };

  // Calculations
  const calculatedItems = items.map((it) => {
    const qty = Math.max(1, Number(it.quantity) || 1);
    const ratePaise = Number(toPaise(Number(it.unitPriceRupees) || 0));
    return {
      description: it.description,
      quantity: qty,
      unitPricePaise: ratePaise,
      lineTotalPaise: qty * ratePaise,
    };
  });

  const subtotalPaise = calculatedItems.reduce((acc, cur) => acc + cur.lineTotalPaise, 0);

  let discountPaise = 0;
  if (discountType === 'percent' && discountValue > 0) {
    const bps = Math.round(discountValue * 100);
    discountPaise = Number(percentOf(BigInt(subtotalPaise), bps));
  } else if (discountType === 'fixed' && discountValue > 0) {
    discountPaise = Math.min(subtotalPaise, Number(toPaise(discountValue)));
  }

  const taxableAmountPaise = Math.max(0, subtotalPaise - discountPaise);

  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if (gstType === 'cgst_sgst') {
    // 9% CGST + 9% SGST = 18%
    cgstPaise = Number(percentOf(BigInt(taxableAmountPaise), 900));
    sgstPaise = Number(percentOf(BigInt(taxableAmountPaise), 900));
  } else if (gstType === 'igst') {
    // 18% IGST
    igstPaise = Number(percentOf(BigInt(taxableAmountPaise), 1800));
  }

  const totalTaxPaise = cgstPaise + sgstPaise + igstPaise;
  const totalPaise = taxableAmountPaise + totalTaxPaise;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking) {
      setErrorMsg('Please select a production booking.');
      return;
    }
    if (items.some((it) => !it.description.trim())) {
      setErrorMsg('All line items must have a valid description.');
      return;
    }
    if (dueDate < issueDate) {
      setErrorMsg('Due date cannot be before issue date.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await createInvoiceAction({
      bookingId: activeBooking.id,
      clientId: activeBooking.clientId,
      issueDate,
      dueDate,
      notesToClient: notesToClient || null,
      internalNotes: null,
      terms: null,
      paymentTerms: paymentTerms || null,
      discountType: discountType === 'none' ? null : discountType,
      discountValue: discountType === 'none' ? null : discountValue,
      cgstRateBps: gstType === 'cgst_sgst' ? 900 : 0,
      sgstRateBps: gstType === 'cgst_sgst' ? 900 : 0,
      igstRateBps: gstType === 'igst' ? 1800 : 0,
      items: calculatedItems,
    });

    if (res.error) {
      setErrorMsg(res.error.message);
      setIsSubmitting(false);
    } else if (res.data) {
      router.push(`/crm/invoices/${res.data}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-stone-500 mb-1">
            <Link href="/crm/invoices" className="hover:underline">
              Invoices
            </Link>
            <span>/</span>
            <span className="text-stone-900 font-medium">New Tax Invoice</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Issue Tax Invoice</h1>
          <p className="text-sm text-stone-500">
            Generate milestone or advance tax invoice tied to a production booking contract.
          </p>
        </div>
        <Link href="/crm/invoices">
          <Button variant="outline" size="sm">
            Cancel
          </Button>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form & Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-stone-900">Contract & Entity Reference</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Booking Contract <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedBookingId}
                  onChange={(e) => handleBookingChange(e.target.value)}
                  className="w-full h-9 rounded-md border border-stone-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
                  required
                >
                  <option value="" disabled>
                    Select booking...
                  </option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bookingNumber} — {b.clientName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Billed Client</label>
                <div className="h-9 flex items-center px-3 bg-stone-100 rounded-md text-sm font-medium text-stone-900">
                  {activeBooking?.clientName || 'Select booking to view client'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Issue Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Payment Due Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-stone-900">Billed Services & Deliverables</h2>
                <p className="text-xs text-stone-500">
                  Itemised services, deliverables, or milestone payment calls.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                + Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => {
                const subtotal = (Number(it.quantity) || 1) * (Number(it.unitPriceRupees) || 0);
                return (
                  <div key={idx} className="p-4 rounded-md border border-stone-200 bg-stone-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                        Item #{idx + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div>
                      <Input
                        placeholder="Deliverable description (e.g. Milestone 1 Retainer: 50% Booking Advance)"
                        value={it.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-stone-600 mb-1">Qty</label>
                        <Input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-600 mb-1">Unit Rate (₹)</label>
                        <Input
                          type="number"
                          min={0}
                          value={it.unitPriceRupees}
                          onChange={(e) =>
                            handleItemChange(idx, 'unitPriceRupees', parseFloat(e.target.value) || 0)
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-600 mb-1">Subtotal (₹)</label>
                        <div className="h-9 flex items-center px-3 text-sm font-semibold text-stone-800 bg-stone-100 rounded-md">
                          ₹{subtotal.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-stone-900">Notes & Payment Terms</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Notes to Client</label>
                <Input
                  value={notesToClient}
                  onChange={(e) => setNotesToClient(e.target.value)}
                  placeholder="Thank you for choosing VOWS Studio..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Payment Instructions</label>
                <Input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Account details, UPI IDs, or payment links..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Calculations & Submit */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-stone-900">Tax & Discounts</h2>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">GST Taxation</label>
              <select
                value={gstType}
                onChange={(e) => setGstType(e.target.value as any)}
                className="w-full h-9 rounded-md border border-stone-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
              >
                <option value="cgst_sgst">Intra-State GST (9% CGST + 9% SGST = 18%)</option>
                <option value="igst">Inter-State GST (18% IGST)</option>
                <option value="none">Zero Tax / Exempt</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Discount</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="h-9 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
                >
                  <option value="none">No Discount</option>
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed (₹)</option>
                </select>
                <Input
                  type="number"
                  min={0}
                  disabled={discountType === 'none'}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 5000'}
                />
              </div>
            </div>

            <div className="divide-y divide-stone-100 text-sm pt-2">
              <div className="py-2.5 flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span className="font-medium text-stone-900">{formatINR(BigInt(subtotalPaise))}</span>
              </div>
              {discountPaise > 0 && (
                <div className="py-2.5 flex justify-between text-stone-600">
                  <span>Discount</span>
                  <span className="font-medium text-red-600">-{formatINR(BigInt(discountPaise))}</span>
                </div>
              )}
              <div className="py-2.5 flex justify-between text-stone-600">
                <span>Taxable Amount</span>
                <span className="font-medium text-stone-900">{formatINR(BigInt(taxableAmountPaise))}</span>
              </div>
              {gstType === 'cgst_sgst' && (
                <>
                  <div className="py-2 flex justify-between text-xs text-stone-500">
                    <span>CGST (9%)</span>
                    <span>{formatINR(BigInt(cgstPaise))}</span>
                  </div>
                  <div className="py-2 flex justify-between text-xs text-stone-500">
                    <span>SGST (9%)</span>
                    <span>{formatINR(BigInt(sgstPaise))}</span>
                  </div>
                </>
              )}
              {gstType === 'igst' && (
                <div className="py-2 flex justify-between text-xs text-stone-500">
                  <span>IGST (18%)</span>
                  <span>{formatINR(BigInt(igstPaise))}</span>
                </div>
              )}
              <div className="py-3 flex justify-between text-base font-bold text-stone-900 border-t border-stone-200">
                <span>Total Amount Due</span>
                <span className="text-stone-950 font-serif text-lg">{formatINR(BigInt(totalPaise))}</span>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Invoice...' : 'Generate Invoice Draft'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
