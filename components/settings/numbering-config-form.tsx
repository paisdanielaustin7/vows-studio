'use client';

import * as React from 'react';
import { DocumentNumberConfig } from '@/types/sales';
import { updateDocumentNumberConfigAction } from '@/server/actions/settings.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const DOC_TYPE_LABELS: Record<string, string> = {
  QT: 'Quotations',
  INV: 'Tax Invoices',
  RCP: 'Payment Receipts',
  BK: 'Event Bookings',
  CN: 'Credit Notes',
};

export function NumberingConfigForm({
  initialConfigs,
  isSystemAdmin,
}: {
  initialConfigs: DocumentNumberConfig[];
  isSystemAdmin: boolean;
}) {
  const [configs, setConfigs] = React.useState(initialConfigs);
  const [savingDoc, setSavingDoc] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleUpdate = async (cfg: DocumentNumberConfig) => {
    if (!isSystemAdmin) return;
    setSavingDoc(cfg.docType);
    setStatus(null);

    const res = await updateDocumentNumberConfigAction({
      docType: cfg.docType,
      prefix: cfg.prefix,
      padding: Number(cfg.padding),
      yearFormat: cfg.yearFormat,
      fyStartMonth: Number(cfg.fyStartMonth),
    });

    setSavingDoc(null);
    if (res.error) {
      setStatus({ type: 'error', message: res.error.message });
    } else {
      setStatus({ type: 'success', message: `Sequence configuration for ${cfg.docType} saved.` });
    }
  };

  return (
    <div className="flex flex-col gap-6">
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

      <div className="p-4 bg-surface-container rounded-xl border border-outline-variant/30 flex items-start gap-3 text-xs text-on-surface-variant">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-on-surface">Atomic Financial Year Rollover (April 1 IST)</p>
          <p className="mt-0.5">
            Document sequences automatically roll over to 000001 at midnight on the start of the financial year.
            Only System Administrators can modify sequence configuration rules.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {configs.map((cfg, index) => {
          const previewNumber = `${cfg.prefix}-${cfg.yearFormat === 'YY' ? '26' : '2026'}-${'1'.padStart(
            cfg.padding,
            '0'
          )}`;

          return (
            <div
              key={cfg.docType}
              className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col gap-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-on-surface">
                      {DOC_TYPE_LABELS[cfg.docType] || cfg.docType}
                    </span>
                    <span className="px-2 py-0.5 bg-surface-container font-mono text-[11px] rounded text-outline font-medium">
                      {cfg.docType}
                    </span>
                  </div>
                  <span className="text-xs text-outline">Format: Prefix-Year-Sequence</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-outline">Preview:</span>
                  <span className="px-3 py-1 bg-secondary-container/60 font-mono text-xs font-semibold text-on-secondary-container rounded-md">
                    {previewNumber}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Prefix</label>
                  <Input
                    value={cfg.prefix}
                    onChange={(e) => {
                      const updated = [...configs];
                      updated[index] = { ...cfg, prefix: e.target.value.toUpperCase() };
                      setConfigs(updated);
                    }}
                    disabled={!isSystemAdmin || savingDoc === cfg.docType}
                    maxLength={8}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Zero Padding</label>
                  <Input
                    type="number"
                    value={cfg.padding}
                    onChange={(e) => {
                      const updated = [...configs];
                      updated[index] = { ...cfg, padding: Math.max(1, Math.min(10, Number(e.target.value))) };
                      setConfigs(updated);
                    }}
                    disabled={!isSystemAdmin || savingDoc === cfg.docType}
                    min={1}
                    max={10}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Year Format</label>
                  <select
                    value={cfg.yearFormat}
                    onChange={(e) => {
                      const updated = [...configs];
                      updated[index] = { ...cfg, yearFormat: e.target.value as 'YYYY' | 'YY' };
                      setConfigs(updated);
                    }}
                    disabled={!isSystemAdmin || savingDoc === cfg.docType}
                    className="h-9 px-3 py-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-sm text-on-surface"
                  >
                    <option value="YYYY">YYYY (2026)</option>
                    <option value="YY">YY (26)</option>
                  </select>
                </div>

                <div className="flex justify-end">
                  {isSystemAdmin && (
                    <Button
                      onClick={() => handleUpdate(cfg)}
                      disabled={savingDoc === cfg.docType}
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      {savingDoc === cfg.docType ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
