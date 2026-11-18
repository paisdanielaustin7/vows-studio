'use client';

import * as React from 'react';
import { BusinessSettings } from '@/types/sales';
import { updateBusinessSettingsAction } from '@/server/actions/settings.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function StudioProfileForm({
  initialSettings,
  canEdit,
}: {
  initialSettings: BusinessSettings;
  canEdit: boolean;
}) {
  const [formData, setFormData] = React.useState({
    studioName: initialSettings.studioName || '',
    tagline: initialSettings.tagline || '',
    phone: initialSettings.phone || '',
    email: initialSettings.email || '',
    website: initialSettings.website || '',
    addressLine1: initialSettings.addressLine1 || '',
    addressLine2: initialSettings.addressLine2 || '',
    city: initialSettings.city || '',
    state: initialSettings.state || '',
    stateCode: initialSettings.stateCode || '',
    pincode: initialSettings.pincode || '',
    primaryColor: initialSettings.primaryColor || '#4c6452',
    secondaryColor: initialSettings.secondaryColor || '#ceead2',
    letterheadLayout: initialSettings.letterheadLayout || 'classic',
    emailSignature: initialSettings.emailSignature || '',
  });

  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    setStatus(null);

    const res = await updateBusinessSettingsAction({
      ...initialSettings,
      ...formData,
      defaultQuoteValidityDays: initialSettings.defaultQuoteValidityDays,
      gstEnabled: initialSettings.gstEnabled,
      defaultCgstBps: initialSettings.defaultCgstBps,
      defaultSgstBps: initialSettings.defaultSgstBps,
      defaultIgstBps: initialSettings.defaultIgstBps,
    });

    setSaving(false);
    if (res.error) {
      setStatus({ type: 'error', message: res.error.message });
    } else {
      setStatus({ type: 'success', message: 'Studio profile updated successfully.' });
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

      {/* Identity Card */}
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col gap-5">
        <div>
          <h2 className="text-base font-semibold text-on-surface">Studio Identity</h2>
          <p className="text-xs text-outline mt-0.5">Core brand information appearing on public documents and communications.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Studio Name *</label>
            <Input
              value={formData.studioName}
              onChange={(e) => setFormData({ ...formData, studioName: e.target.value })}
              disabled={!canEdit || saving}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Tagline</label>
            <Input
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              disabled={!canEdit || saving}
              placeholder="Wedding Cinematic & Stills"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Studio Phone</label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={!canEdit || saving}
              placeholder="+91 98400 12345"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Studio Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!canEdit || saving}
              placeholder="hello@vowsstudio.com"
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-medium text-on-surface">Official Website</label>
            <Input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              disabled={!canEdit || saving}
              placeholder="https://vowsstudio.com"
            />
          </div>
        </div>
      </div>

      {/* Address Card */}
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col gap-5">
        <div>
          <h2 className="text-base font-semibold text-on-surface">Studio Location &amp; Address</h2>
          <p className="text-xs text-outline mt-0.5">Physical studio location printed on quotation and tax invoice headers.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-medium text-on-surface">Address Line 1</label>
            <Input
              value={formData.addressLine1}
              onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              disabled={!canEdit || saving}
              placeholder="Door No, Building, Street"
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-medium text-on-surface">Address Line 2</label>
            <Input
              value={formData.addressLine2}
              onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
              disabled={!canEdit || saving}
              placeholder="Area, Landmark"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">City</label>
            <Input
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              disabled={!canEdit || saving}
              placeholder="Chennai"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">State</label>
            <Input
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              disabled={!canEdit || saving}
              placeholder="Tamil Nadu"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">GST State Code (2 digits)</label>
            <Input
              value={formData.stateCode}
              maxLength={2}
              onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
              disabled={!canEdit || saving}
              placeholder="33"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Pincode (6 digits)</label>
            <Input
              value={formData.pincode}
              maxLength={6}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              disabled={!canEdit || saving}
              placeholder="600001"
            />
          </div>
        </div>
      </div>

      {/* Brand Tokens & Email Signature */}
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col gap-5">
        <div>
          <h2 className="text-base font-semibold text-on-surface">Branding &amp; Communication</h2>
          <p className="text-xs text-outline mt-0.5">Colors and signature applied across emails and generated documents.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Primary Brand Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                disabled={!canEdit || saving}
                className="w-10 h-10 rounded border border-outline-variant/40 cursor-pointer p-0"
              />
              <Input
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                disabled={!canEdit || saving}
                placeholder="#4c6452"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Secondary Brand Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.secondaryColor}
                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                disabled={!canEdit || saving}
                className="w-10 h-10 rounded border border-outline-variant/40 cursor-pointer p-0"
              />
              <Input
                value={formData.secondaryColor}
                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                disabled={!canEdit || saving}
                placeholder="#ceead2"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-medium text-on-surface">Default Email Signature</label>
            <Textarea
              rows={3}
              value={formData.emailSignature}
              onChange={(e) => setFormData({ ...formData, emailSignature: e.target.value })}
              disabled={!canEdit || saving}
              placeholder="Warm regards,&#10;Reuben &amp; the VOWS Team"
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
              'Save Profile Settings'
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
