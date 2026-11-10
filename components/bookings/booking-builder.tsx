'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBookingAction } from '@/server/actions/booking.actions';
import { toPaise, formatINR } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ClientOption {
  id: string;
  fullName: string;
  primaryPhone: string;
}

interface LineItemDraft {
  description: string;
  quantity: number;
  unitPriceRupees: number;
}

interface BookingBuilderProps {
  clients: ClientOption[];
}

export function BookingBuilder({ clients }: BookingBuilderProps) {
  const router = useRouter();

  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [targetDeliveryDate, setTargetDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');

  const [lines, setLines] = useState<LineItemDraft[]>([
    { description: 'Full Wedding Coverage (Photography & Cinematography)', quantity: 1, unitPriceRupees: 150000 },
  ]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Line item handlers
  const handleAddLine = () => {
    setLines([...lines, { description: '', quantity: 1, unitPriceRupees: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof LineItemDraft, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  // Financial computations
  const calculatedLines = lines.map((l) => {
    const qty = Math.max(1, Number(l.quantity) || 1);
    const unitPricePaise = Number(toPaise(Number(l.unitPriceRupees) || 0));
    const lineTotalPaise = unitPricePaise * qty;
    return {
      description: l.description,
      quantity: qty,
      unitPricePaise,
      lineTotalPaise,
    };
  });

  const contractTotalPaise = calculatedLines.reduce((acc, cur) => acc + cur.lineTotalPaise, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setErrorMsg('Please select a client.');
      return;
    }
    if (lines.some((l) => !l.description.trim())) {
      setErrorMsg('All line items must have a valid description.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await createBookingAction({
      clientId,
      targetDeliveryDate: targetDeliveryDate || null,
      notes: notes || null,
      contractTotalPaise,
      lines: calculatedLines,
    });

    if (res.error) {
      setErrorMsg(res.error.message);
      setIsSubmitting(false);
    } else if (res.data) {
      router.push(`/crm/bookings/${res.data}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-stone-500 mb-1">
            <Link href="/crm/bookings" className="hover:underline">
              Bookings
            </Link>
            <span>/</span>
            <span className="text-stone-900 font-medium">New Booking</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Create New Booking</h1>
          <p className="text-sm text-stone-500">
            Initialise a production booking, line items, and automated 9-stage delivery pipeline.
          </p>
        </div>
        <Link href="/crm/bookings">
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
        {/* Left Column: Client & Details & Line items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-stone-900">Client & Delivery</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full h-9 rounded-md border border-stone-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
                  required
                >
                  <option value="" disabled>
                    Select client...
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.primaryPhone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Target Delivery Date
                </label>
                <Input
                  type="date"
                  value={targetDeliveryDate}
                  onChange={(e) => setTargetDeliveryDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Internal Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special client preferences, high-priority deliverables, coverage requirements..."
                className="w-full rounded-md border border-stone-300 p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
                rows={3}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-stone-900">Contract Deliverables</h2>
                <p className="text-xs text-stone-500">Service line items and deliverables included in this booking contract.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
                + Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {lines.map((l, idx) => {
                const subtotal = (Number(l.quantity) || 1) * (Number(l.unitPriceRupees) || 0);
                return (
                  <div key={idx} className="p-4 rounded-md border border-stone-200 bg-stone-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Item #{idx + 1}</span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div>
                      <Input
                        placeholder="Deliverable description (e.g. Traditional Wedding Photography 2 Days)"
                        value={l.description}
                        onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-stone-600 mb-1">Qty</label>
                        <Input
                          type="number"
                          min={1}
                          value={l.quantity}
                          onChange={(e) => handleLineChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-600 mb-1">Unit Rate (₹)</label>
                        <Input
                          type="number"
                          min={0}
                          value={l.unitPriceRupees}
                          onChange={(e) => handleLineChange(idx, 'unitPriceRupees', parseFloat(e.target.value) || 0)}
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
        </div>

        {/* Right Column: Financial Summary & Submit */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-stone-900">Contract Summary</h2>
            <div className="divide-y divide-stone-100 text-sm">
              <div className="py-2.5 flex justify-between text-stone-600">
                <span>Deliverables Count</span>
                <span className="font-medium text-stone-900">{lines.length} items</span>
              </div>
              <div className="py-2.5 flex justify-between text-stone-600">
                <span>Delivery Pipeline</span>
                <span className="font-medium text-stone-900">9 Stages (Auto)</span>
              </div>
              <div className="py-3 flex justify-between text-base font-bold text-stone-900 border-t border-stone-200">
                <span>Contract Total</span>
                <span className="text-stone-950 font-serif text-lg">{formatINR(BigInt(contractTotalPaise))}</span>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Booking...' : 'Create Booking'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
