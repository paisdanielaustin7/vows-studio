'use client';

import * as React from 'react';
import { EmailTemplate } from '@/types/sales';
import { updateEmailTemplateAction } from '@/server/actions/settings.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, AlertCircle, Tag } from 'lucide-react';

const MERGE_TAG_HINTS: Record<string, string[]> = {
  quotation: ['{{client_name}}', '{{quotation_number}}', '{{event_date}}', '{{total_amount}}', '{{valid_until}}'],
  invoice: ['{{client_name}}', '{{invoice_number}}', '{{total_amount}}', '{{due_date}}'],
  receipt: ['{{client_name}}', '{{receipt_number}}', '{{invoice_number}}', '{{payment_amount}}'],
  payment_reminder: ['{{client_name}}', '{{invoice_number}}', '{{balance_due}}', '{{due_date}}'],
  review_request: ['{{client_name}}', '{{review_link}}'],
  invitation: ['{{recipient_name}}', '{{role_name}}', '{{invite_link}}'],
  password_reset: ['{{reset_link}}'],
};

export function EmailTemplatesEditor({
  initialTemplates,
  canEdit,
}: {
  initialTemplates: EmailTemplate[];
  canEdit: boolean;
}) {
  const [templates, setTemplates] = React.useState(initialTemplates);
  const [selectedCode, setSelectedCode] = React.useState(initialTemplates[0]?.code || 'quotation');
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const activeTemplate = templates.find((t) => t.code === selectedCode) || templates[0];

  const handleSave = async () => {
    if (!canEdit || !activeTemplate) return;
    setSaving(true);
    setStatus(null);

    const res = await updateEmailTemplateAction({
      code: activeTemplate.code as any,
      subject: activeTemplate.subject,
      bodyHtml: activeTemplate.bodyHtml,
      isActive: activeTemplate.isActive,
    });

    setSaving(false);
    if (res.error) {
      setStatus({ type: 'error', message: res.error.message });
    } else {
      setStatus({ type: 'success', message: `Template for ${activeTemplate.code} saved successfully.` });
    }
  };

  const allowedTags = MERGE_TAG_HINTS[selectedCode] || [];

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

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-outline-variant/30">
        {templates.map((tpl) => (
          <button
            key={tpl.code}
            type="button"
            onClick={() => {
              setSelectedCode(tpl.code);
              setStatus(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCode === tpl.code
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {tpl.code.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {activeTemplate && (
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Subject Line *</label>
            <Input
              value={activeTemplate.subject}
              onChange={(e) => {
                const updated = templates.map((t) =>
                  t.code === selectedCode ? { ...t, subject: e.target.value } : t
                );
                setTemplates(updated);
              }}
              disabled={!canEdit || saving}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-on-surface">HTML Body *</label>
              <div className="flex items-center gap-1.5 text-xs text-outline">
                <Tag className="w-3.5 h-3.5" />
                <span>Allowed Tags:</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 p-2.5 bg-surface-container rounded-lg">
              {allowedTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-surface-container-lowest text-primary font-mono text-xs rounded border border-outline-variant/40"
                >
                  {tag}
                </span>
              ))}
            </div>

            <Textarea
              rows={8}
              value={activeTemplate.bodyHtml}
              onChange={(e) => {
                const updated = templates.map((t) =>
                  t.code === selectedCode ? { ...t, bodyHtml: e.target.value } : t
                );
                setTemplates(updated);
              }}
              disabled={!canEdit || saving}
              className="font-mono text-xs leading-relaxed"
            />
          </div>

          {canEdit && (
            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving Template...
                  </>
                ) : (
                  'Save Template'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
