'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Client, Service, Package, BusinessSettings } from '@/types/sales';
import { formatINR, applyDiscount, apportionDiscount, computeGst, fromRupees } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createQuotationAction, updateQuotationStatusAction } from '@/server/actions/quotation.actions';

interface QuotationBuilderProps {
  clients: Client[];
  services: Service[];
  packages: Package[];
  settings?: BusinessSettings | null;
  initialClientId?: string;
  initialEnquiryId?: string;
  initialEventDate?: string;
}

interface BuilderLineItem {
  id: string;
  serviceId?: string | null;
  packageId?: string | null;
  description: string;
  quantity: number;
  unitPricePaise: number;
  hsnSacCode?: string;
  cgstBps?: number;
  sgstBps?: number;
  igstBps?: number;
}

export function QuotationBuilder({
  clients,
  services,
  packages,
  settings,
  initialClientId,
  initialEnquiryId,
  initialEventDate,
}: QuotationBuilderProps) {
  const router = useRouter();

  // Form State
  const [clientId, setClientId] = useState<string>(initialClientId || (clients[0]?.id ?? ''));
  const [enquiryId] = useState<string>(initialEnquiryId || '');
  const [eventDate, setEventDate] = useState<string>(initialEventDate || '');
  
  // Default validUntil: 14 days from today
  const defaultValidDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  }, []);
  const [validUntil, setValidUntil] = useState<string>(defaultValidDate);

  const [gstApplied, setGstApplied] = useState<boolean>(settings?.gstEnabled ?? true);
  const [taxType, setTaxType] = useState<'none' | 'cgst_sgst' | 'igst'>('cgst_sgst');

  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountPercent, setDiscountPercent] = useState<number>(0); // e.g. 10 for 10%
  const [discountFixedRupees, setDiscountFixedRupees] = useState<number>(0);

  const [notesToClient, setNotesToClient] = useState<string>(
    'Thank you for considering VOWS Studio to capture your celebration. We are honored to tell your story.'
  );
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [terms, setTerms] = useState<string>(
    '1. 20% advance booking deposit required to lock dates.\n2. 60% due on the first day of production.\n3. 20% due upon delivery of final deliverables.'
  );

  // Line Items
  const [items, setItems] = useState<BuilderLineItem[]>([
    {
      id: 'item-1',
      description: 'Cinematography & Stills — Main Wedding Day Coverage',
      quantity: 1,
      unitPricePaise: 15000000, // ₹1,50,000.00
      hsnSacCode: '998386',
      cgstBps: 900,
      sgstBps: 900,
      igstBps: 1800,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Client
  const selectedClient = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);

  // Financial Calculations using lib/money
  const financials = useMemo(() => {
    const lineTotals = items.map((item) => ({
      ...item,
      lineTotalPaise: item.quantity * item.unitPricePaise,
    }));

    const subtotalPaise = lineTotals.reduce((acc, it) => acc + BigInt(it.lineTotalPaise), 0n);

    let discInput = null;
    if (discountType === 'percent' && discountPercent > 0) {
      discInput = { type: 'percent' as const, value: Math.round(discountPercent * 100) };
    } else if (discountType === 'fixed' && discountFixedRupees > 0) {
      discInput = { type: 'fixed' as const, value: fromRupees(discountFixedRupees) };
    }

    const { discountAmount, taxableBase } = applyDiscount(subtotalPaise, discInput);

    const linesForApportionment = lineTotals.map((it) => ({
      id: it.id,
      amount: BigInt(it.lineTotalPaise),
    }));
    const apportionedDiscounts = apportionDiscount(linesForApportionment, discountAmount);

    let totalCgstPaise = 0n;
    let totalSgstPaise = 0n;
    let totalIgstPaise = 0n;

    const computedItems = lineTotals.map((item) => {
      const lineDisc = apportionedDiscounts.get(item.id) || 0n;
      const lineTaxable = BigInt(item.lineTotalPaise) - lineDisc;

      let lineCgst = 0n;
      let lineSgst = 0n;
      let lineIgst = 0n;

      if (gstApplied && taxType !== 'none') {
        if (taxType === 'cgst_sgst') {
          const rateBps = (item.cgstBps ?? 900) + (item.sgstBps ?? 900);
          const gst = computeGst(lineTaxable, rateBps, false);
          lineCgst = gst.cgstPaise;
          lineSgst = gst.sgstPaise;
        } else if (taxType === 'igst') {
          const rateBps = item.igstBps ?? 1800;
          const gst = computeGst(lineTaxable, rateBps, true);
          lineIgst = gst.igstPaise;
        }
      }

      totalCgstPaise += lineCgst;
      totalSgstPaise += lineSgst;
      totalIgstPaise += lineIgst;

      return {
        ...item,
        lineDiscountPaise: Number(lineDisc),
        lineTaxablePaise: Number(lineTaxable),
        cgstPaise: Number(lineCgst),
        sgstPaise: Number(lineSgst),
        igstPaise: Number(lineIgst),
      };
    });

    const taxPaise = totalCgstPaise + totalSgstPaise + totalIgstPaise;
    const totalPaise = taxableBase + taxPaise;

    return {
      subtotalPaise: Number(subtotalPaise),
      discountPaise: Number(discountAmount),
      taxablePaise: Number(taxableBase),
      cgstPaise: Number(totalCgstPaise),
      sgstPaise: Number(totalSgstPaise),
      igstPaise: Number(totalIgstPaise),
      taxPaise: Number(taxPaise),
      totalPaise: Number(totalPaise),
      computedItems,
    };
  }, [items, discountType, discountPercent, discountFixedRupees, gstApplied, taxType]);

  // Line Item Handlers
  const handleAddItem = (type: 'service' | 'package' | 'custom', templateId?: string) => {
    if (type === 'service' && templateId) {
      const s = services.find((srv) => srv.id === templateId);
      if (s) {
        setItems((prev) => [
          ...prev,
          {
            id: `item-${Date.now()}`,
            serviceId: s.id,
            description: s.name + (s.description ? ` — ${s.description}` : ''),
            quantity: 1,
            unitPricePaise: s.currentPricePaise || 0,
            hsnSacCode: '998386',
            cgstBps: 900,
            sgstBps: 900,
            igstBps: 1800,
          },
        ]);
        return;
      }
    }

    if (type === 'package' && templateId) {
      const p = packages.find((pkg) => pkg.id === templateId);
      if (p) {
        setItems((prev) => [
          ...prev,
          {
            id: `item-${Date.now()}`,
            packageId: p.id,
            description: p.name + (p.description ? ` — ${p.description}` : ''),
            quantity: 1,
            unitPricePaise: p.currentPricePaise || 0,
            hsnSacCode: '998386',
            cgstBps: 900,
            sgstBps: 900,
            igstBps: 1800,
          },
        ]);
        return;
      }
    }

    // Default custom item
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: 'Custom Production Service',
        quantity: 1,
        unitPricePaise: 2500000, // ₹25,000
        hsnSacCode: '998386',
        cgstBps: 900,
        sgstBps: 900,
        igstBps: 1800,
      },
    ]);
  };

  const handleUpdateItem = (id: string, updates: Partial<BuilderLineItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...updates } : it)));
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      alert('Quotation must contain at least one line item.');
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Submit Handler
  const handleSave = async (markAsSent = false) => {
    if (!clientId) {
      setErrorMsg('Please select a client.');
      return;
    }
    if (!validUntil) {
      setErrorMsg('Please set a validity date.');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('Add at least one line item.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      clientId,
      enquiryId: enquiryId || undefined,
      eventDate: eventDate || undefined,
      validUntil,
      subtotalPaise: financials.subtotalPaise,
      discountType: discountType === 'none' ? undefined : discountType,
      discountBps: discountType === 'percent' ? Math.round(discountPercent * 100) : undefined,
      discountFixedPaise: discountType === 'fixed' ? Number(fromRupees(discountFixedRupees)) : undefined,
      discountPaise: financials.discountPaise,
      taxablePaise: financials.taxablePaise,
      cgstPaise: financials.cgstPaise,
      sgstPaise: financials.sgstPaise,
      igstPaise: financials.igstPaise,
      taxPaise: financials.taxPaise,
      totalPaise: financials.totalPaise,
      gstApplied,
      taxType,
      businessGstin: settings?.gstin || null,
      clientGstin: selectedClient?.gstin || null,
      placeOfSupplyStateCode: '29', // Default Karnataka
      notesToClient,
      internalNotes,
      terms,
      items: financials.computedItems.map((ci) => ({
        serviceId: ci.serviceId || null,
        packageId: ci.packageId || null,
        description: ci.description,
        quantity: ci.quantity,
        unitPricePaise: ci.unitPricePaise,
        lineTotalPaise: ci.lineTotalPaise,
        hsnSacCode: ci.hsnSacCode || null,
        cgstBps: ci.cgstBps ?? 900,
        sgstBps: ci.sgstBps ?? 900,
        igstBps: ci.igstBps ?? 1800,
        lineDiscountPaise: ci.lineDiscountPaise,
        lineTaxablePaise: ci.lineTaxablePaise,
        cgstPaise: ci.cgstPaise,
        sgstPaise: ci.sgstPaise,
        igstPaise: ci.igstPaise,
      })),
    };

    const res = await createQuotationAction(payload);
    if (res.error) {
      setErrorMsg(res.error.message);
      setIsSubmitting(false);
      return;
    }

    const createdId = res.data!;
    if (markAsSent) {
      await updateQuotationStatusAction(createdId, 'sent');
    }

    router.push(`/crm/quotations/${createdId}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-on-surface">New Quotation</h1>
          <p className="text-sm text-outline">Compose production package, apportion discounts, and lock estimates.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleSave(false)}
            className="flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            Save Draft
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave(true)}
            className="bg-[#4c6452] hover:bg-[#3d5242] text-white flex items-center gap-2"
          >
            <span>Send to Client</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main 2-Column Grid (70% Canvas / 30% Sticky Financials) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Canvas) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Client & Booking Context */}
          <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/40 space-y-4">
            <h2 className="text-base font-semibold text-on-surface">Client & Event Context</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-outline uppercase mb-1">Client</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                >
                  <option value="">Select a client...</option>
                  {clients.map((c) => {
                    const phone = c.phones.find((p) => p.isPrimary)?.phoneE164 || c.phones[0]?.phoneE164;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.fullName} {phone ? `(${phone})` : ''}
                      </option>
                    );
                  })}
                </select>
                {selectedClient && (
                  <p className="text-xs text-outline mt-1 truncate">
                    {selectedClient.emails.find((e) => e.isPrimary)?.email || selectedClient.emails[0]?.email || 'No email on file'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-outline uppercase mb-1">Event Date</label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-outline uppercase mb-1">Valid Until</label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            </div>
          </section>

          {/* Line Items Table */}
          <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/40 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-on-surface">Deliverables & Line Items</h2>
              <div className="flex items-center gap-2">
                {packages.length > 0 && (
                  <select
                    className="h-8 px-2 text-xs rounded border border-outline-variant/50 bg-surface-container-low"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddItem('package', e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">+ Add Package...</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} ({formatINR(BigInt(pkg.currentPricePaise || 0))})
                      </option>
                    ))}
                  </select>
                )}
                {services.length > 0 && (
                  <select
                    className="h-8 px-2 text-xs rounded border border-outline-variant/50 bg-surface-container-low"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddItem('service', e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">+ Add Service...</option>
                    {services.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.name} ({formatINR(BigInt(srv.currentPricePaise || 0))})
                      </option>
                    ))}
                  </select>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddItem('custom')}
                  className="h-8 text-xs"
                >
                  + Custom Item
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const lineTotal = item.quantity * item.unitPricePaise;
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg bg-surface-container-low/50 border border-outline-variant/30 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                  >
                    <span className="text-xs font-bold text-outline w-5">{index + 1}.</span>
                    <div className="flex-1 space-y-1 w-full">
                      <Input
                        value={item.description}
                        onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                        placeholder="Description of service/equipment..."
                        className="h-9 text-sm font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-20">
                        <label className="text-[10px] text-outline uppercase block">Qty</label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                          }
                          className="h-9 text-sm text-center"
                        />
                      </div>
                      <div className="w-32">
                        <label className="text-[10px] text-outline uppercase block">Unit Price (₹)</label>
                        <Input
                          type="number"
                          min={0}
                          value={item.unitPricePaise / 100}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateItem(item.id, { unitPricePaise: Math.round(val * 100) });
                          }}
                          className="h-9 text-sm text-right"
                        />
                      </div>
                      <div className="w-28 text-right">
                        <label className="text-[10px] text-outline uppercase block">Total</label>
                        <span className="text-sm font-semibold text-on-surface">
                          {formatINR(BigInt(lineTotal))}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-error hover:bg-error/10 h-8 w-8 p-0 mt-3"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Notes & Terms */}
          <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/40 space-y-4">
            <h2 className="text-base font-semibold text-on-surface">Notes & Terms</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-outline uppercase mb-1">Notes to Client</label>
                <textarea
                  value={notesToClient}
                  onChange={(e) => setNotesToClient(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-outline uppercase mb-1">Internal Notes</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={3}
                  placeholder="Private notes (not visible to client)..."
                  className="w-full p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface resize-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-outline uppercase mb-1">Contract Terms</label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
              />
            </div>
          </section>
        </div>

        {/* Right Column: Sticky Financials (30%) */}
        <div className="lg:col-span-4 sticky top-24 space-y-6">
          <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/40 space-y-5">
            <h2 className="text-base font-semibold text-on-surface flex items-center justify-between">
              <span>Financial Summary</span>
              <span className="material-symbols-outlined text-outline text-lg">calculate</span>
            </h2>

            {/* Subtotal */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-on-surface-variant">Subtotal</span>
              <span className="font-medium text-on-surface">{formatINR(BigInt(financials.subtotalPaise))}</span>
            </div>

            {/* Discount Section */}
            <div className="pt-3 border-t border-outline-variant/30 space-y-2">
              <div className="flex justify-between items-center text-xs uppercase font-medium text-outline">
                <span>Discount</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('none');
                      setDiscountPercent(0);
                      setDiscountFixedRupees(0);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      discountType === 'none' ? 'bg-secondary-container font-semibold' : 'hover:bg-surface-container'
                    }`}
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      discountType === 'percent' ? 'bg-secondary-container font-semibold' : 'hover:bg-surface-container'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      discountType === 'fixed' ? 'bg-secondary-container font-semibold' : 'hover:bg-surface-container'
                    }`}
                  >
                    ₹ Fixed
                  </button>
                </div>
              </div>

              {discountType === 'percent' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    placeholder="Discount %"
                    className="h-8 text-sm"
                  />
                  <span className="text-xs text-outline">%</span>
                </div>
              )}

              {discountType === 'fixed' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-outline">₹</span>
                  <Input
                    type="number"
                    min={0}
                    value={discountFixedRupees}
                    onChange={(e) => setDiscountFixedRupees(parseFloat(e.target.value) || 0)}
                    placeholder="Discount in Rupees"
                    className="h-8 text-sm"
                  />
                </div>
              )}

              {financials.discountPaise > 0 && (
                <div className="flex justify-between items-center text-sm text-error">
                  <span>Discount Applied</span>
                  <span>-{formatINR(BigInt(financials.discountPaise))}</span>
                </div>
              )}
            </div>

            {/* Taxable Base */}
            <div className="flex justify-between items-center text-sm pt-3 border-t border-outline-variant/30 font-medium">
              <span className="text-on-surface-variant">Taxable Base</span>
              <span className="text-on-surface">{formatINR(BigInt(financials.taxablePaise))}</span>
            </div>

            {/* GST Controls */}
            <div className="pt-3 border-t border-outline-variant/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-outline uppercase">GST Configuration</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gstApplied}
                    onChange={(e) => setGstApplied(e.target.checked)}
                    className="rounded border-outline-variant"
                  />
                  <span className="text-xs text-on-surface">Apply GST</span>
                </label>
              </div>

              {gstApplied && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setTaxType('cgst_sgst')}
                      className={`p-2 rounded border text-center transition-colors ${
                        taxType === 'cgst_sgst'
                          ? 'border-primary bg-primary/10 font-semibold text-primary'
                          : 'border-outline-variant/50 text-outline'
                      }`}
                    >
                      Intra-State (18%)
                      <span className="block text-[10px] text-outline">CGST 9% + SGST 9%</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxType('igst')}
                      className={`p-2 rounded border text-center transition-colors ${
                        taxType === 'igst'
                          ? 'border-primary bg-primary/10 font-semibold text-primary'
                          : 'border-outline-variant/50 text-outline'
                      }`}
                    >
                      Inter-State (18%)
                      <span className="block text-[10px] text-outline">IGST 18%</span>
                    </button>
                  </div>

                  {taxType === 'cgst_sgst' && (
                    <div className="space-y-1 text-xs text-outline pt-1">
                      <div className="flex justify-between">
                        <span>CGST (9%)</span>
                        <span>{formatINR(BigInt(financials.cgstPaise))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST (9%)</span>
                        <span>{formatINR(BigInt(financials.sgstPaise))}</span>
                      </div>
                    </div>
                  )}

                  {taxType === 'igst' && (
                    <div className="flex justify-between text-xs text-outline pt-1">
                      <span>IGST (18%)</span>
                      <span>{formatINR(BigInt(financials.igstPaise))}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Grand Total */}
            <div className="pt-4 border-t-2 border-outline-variant/40 space-y-1">
              <span className="text-xs font-semibold uppercase text-outline tracking-wider">Grand Total</span>
              <div className="text-2xl font-bold text-on-surface">
                {formatINR(BigInt(financials.totalPaise))}
              </div>
              <p className="text-[11px] text-outline">Exact paise arithmetic via lib/money</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
