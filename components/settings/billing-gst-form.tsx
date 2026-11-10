'use client';

import * as React from 'react';
import { BusinessSettings } from '@/types/sales';
import { updateBusinessSettingsAction } from '@/server/actions/settings.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

export function BillingGstForm({
  initialSettings,
  canEdit,
}: {
  initialSettings: BusinessSettings;
  canEdit: boolean;
}) {
  const [formData, setFormData] = React.useState({
    gstEnabled: initialSettings.gstEnabled ?? false,
    gstin: initialSettings.gstin || '',
    pan: initialSettings.pan || '',
    defaultCgstBps: initialSettings.defaultCgstBps || 900,
    defaultSgstBps: initialSettings.defaultSgstBps || 900,
    defaultIgstBps: initialSettings.defaultIgstBps || 1800,
    bankName: initialSettings.bankName || '',
    bankAccountHolder: initialSettings.bankAccountHolder || '',
    bankAccountNumber: initialSettings.bankAccountNumber || '',
    bankIfsc: initialSettings.bankIfsc || '',
    upiId: initialSettings.upiId || '',
    defaultQuoteValidityDays: initialSettings.defaultQuoteValidityDays || 30,
    defaultQuoteTerms: initialSettings.defaultQuoteTerms || '',
    defaultInvoiceTerms: initialSettings.defaultInvoiceTerms || '',
    defaultPaymentTerms: initialSettings.defaultPaymentTerms || '',
    receiptNote: initialSettings.receiptNote || '',
  });

  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    setStatus(null);

    const res = await updateBusinessSettingsAction({
      studioName: initialSettings?.studioName || 'VOWS Studio',
      letterheadLayout: initialSettings?.letterheadLayout || 'classic',
      phone: initialSettings?.phone || null,
      email: initialSettings?.email || null,
      website: initialSettings?.website || null,
      addressLine1: initialSettings?.addressLine1 || null,
      addressLine2: initialSettings?.addressLine2 || null,
      city: initialSettings?.city || null,
      state: initialSettings?.state || null,
      stateCode: initialSettings?.stateCode || null,
      pincode: initialSettings?.pincode || null,
      primaryColor: initialSettings?.primaryColor || null,
      secondaryColor: initialSettings?.secondaryColor || null,
      logoPath: initialSettings?.logoPath || null,
      emailSignature: initialSettings?.emailSignature || null,
      socialLinks: initialSettings?.socialLinks || null,
      ...formData,
      defaultCgstBps: Number(formData.defaultCgstBps),
      defaultSgstBps: Number(formData.defaultSgstBps),
      defaultIgstBps: Number(formData.defaultIgstBps),
      defaultQuoteValidityDays: Number(formData.defaultQuoteValidityDays),
    });

    setSaving(false);
    if (res.error) {
      setStatus({ type: 'error', message: res.error.message });
    } else {
      setStatus({ type: 'success', message: 'Billing & taxation settings updated.' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {status && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
            status.type === 'success'
              ? 'bg-secondary-container/50 text-on-secondary-container border border-secondary-container'
              : 'bg-error-container/50 text-error border border-error-container'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-primary" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-error" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      {/* GST Mode Card */}
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-on-surface">Goods &amp; Services Tax (GST)</h2>
            <p className="text-xs text-outline mt-0.5">Toggle statutory tax compliance on quotations, invoices and receipts.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.gstEnabled}
              onChange={(e) => setFormData({ ...formData, gstEnabled: e.target.checked })}
              disabled={!canEdit || saving}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {formData.gstEnabled ? (
          <div className="p-3.5 bg-secondary-container/30 border border-secondary-container rounded-lg flex items-center gap-2.5 text-xs text-on-secondary-container">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span>GST mode is <strong>ACTIVE</strong>. CGST, SGST and IGST calculations are enabled across sales modules.</span>
          </div>
        ) : (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>GST mode is <strong>DISABLED</strong>. All sales documents will be generated as non-tax bills of supply. Toggling state writes an audit log event.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Studio GSTIN (15 digits)</label>
            <Input
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
              disabled={!canEdit || saving}
              placeholder="33AAAAA0000A1Z5"
              maxLength={15}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Permanent Account Number (PAN)</label>
            <Input
              value={formData.pan}
              onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
              disabled={!canEdit || saving}
              placeholder="AAAAA0000A"
              maxLength={10}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Default Intra-State CGST Rate (basis points)</label>
            <Input
              type="number"
              value={formData.defaultCgstBps}
              onChange={(e) => setFormData({ ...formData, defaultCgstBps: Number(e.target.value) })}
              disabled={!canEdit || saving}
              placeholder="900"
            />
            <span className="text-[11px] text-outline">900 bps = 9.00%</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Default Intra-State SGST Rate (basis points)</label>
            <Input
              type="number"
              value={formData.defaultSgstBps}
              onChange={(e) => setFormData({ ...formData, defaultSgstBps: Number(e.target.value) })}
              disabled={!canEdit || saving}
              placeholder="900"
            />
            <span className="text-[11px] text-outline">900 bps = 9.00%</span>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-medium text-on-surface">Default Inter-State IGST Rate (basis points)</label>
            <Input
              type="number"
              value={formData.defaultIgstBps}
              onChange={(e) => setFormData({ ...formData, defaultIgstBps: Number(e.target.value) })}
              disabled={!canEdit || saving}
              placeholder="1800"
            />
            <span className="text-[11px] text-outline">1800 bps = 18.00%</span>
          </div>
        </div>
      </div>

      {/* Bank & Payment Details */}
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col gap-5">
        <div>
          <h2 className="text-base font-semibold text-on-surface">Banking &amp; Settlement Details</h2>
          <p className="text-xs text-outline mt-0.5">Bank transfer instructions printed on customer invoices and quotations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Bank Name</label>
            <Input
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              disabled={!canEdit || saving}
              placeholder="HDFC Bank"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Account Holder Name</label>
            <Input
              value={formData.bankAccountHolder}
              onChange={(e) => setFormData({ ...formData, bankAccountHolder: e.target.value })}
              disabled={!canEdit || saving}
              placeholder="VOWS Studio LLP"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Account Number</label>
            <Input
              value={formData.bankAccountNumber}
              onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
              disabled={!canEdit || saving}
              placeholder="50200012345678"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">IFSC Code</label>
            <Input
              value={formData.bankIfsc}
              onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
              disabled={!canEdit || saving}
              placeholder="HDFC0001234"
              maxLength={11}
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-medium text-on-surface">UPI ID / VPA</label>
            <Input
              value={formData.upiId}
              onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
              disabled={!canEdit || saving}
              placeholder="vowsstudio@hdfcbank"
            />
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col gap-5">
        <div>
          <h2 className="text-base font-semibold text-on-surface">Default Terms &amp; Policies</h2>
          <p className="text-xs text-outline mt-0.5">Prefilled terms appearing automatically when building new quotations and invoices.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Quotation Validity (Days)</label>
            <Input
              type="number"
              value={formData.defaultQuoteValidityDays}
              onChange={(e) => setFormData({ ...formData, defaultQuoteValidityDays: Number(e.target.value) })}
              disabled={!canEdit || saving}
              min={1}
              max={365}
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-medium text-on-surface">Default Quotation Terms</label>
            <Textarea
              rows={3}
              value={formData.defaultQuoteTerms}
              onChange={(e) => setFormData({ ...formData, defaultQuoteTerms: e.target.value })}
              disabled={!canEdit || saving}
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-medium text-on-surface">Default Invoice Terms</label>
            <Textarea
              rows={2}
              value={formData.defaultInvoiceTerms}
              onChange={(e) => setFormData({ ...formData, defaultInvoiceTerms: e.target.value })}
              disabled={!canEdit || saving}
            />
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving Changes...
              </>
            ) : (
              'Save Billing Settings'
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
