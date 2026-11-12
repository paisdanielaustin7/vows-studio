'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendDocumentEmailAction } from '@/server/actions/gmail.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SendDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'quotation' | 'invoice' | 'receipt' | 'credit_note';
  documentId: string;
  documentNumber: string;
  defaultRecipientEmail: string;
  defaultSubject: string;
  pdfDownloadUrl: string;
}

export function SendDocumentDialog({
  isOpen,
  onClose,
  documentType,
  documentId,
  documentNumber,
  defaultRecipientEmail,
  defaultSubject,
  pdfDownloadUrl,
}: SendDocumentDialogProps) {
  const router = useRouter();
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Generate stable idempotency key on component mount / dialog opening
  const [idempotencyKey] = useState(
    () => `send-${documentType}-${documentId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!recipientEmail.trim() || !subject.trim()) {
      setError('Please provide a recipient email and subject line.');
      return;
    }

    setIsSending(true);
    setError(null);

    const res = await sendDocumentEmailAction({
      documentType,
      documentId,
      recipientEmail: recipientEmail.trim(),
      subject: subject.trim(),
      messageText: message.trim() || undefined,
      idempotencyKey,
    });

    setIsSending(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      setSuccess(true);
      router.refresh();
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
          <div>
            <h3 className="text-lg font-bold text-on-surface capitalize">
              Send {documentType.replace('_', ' ')}
            </h3>
            <p className="text-xs text-outline">
              Transmit document #{documentNumber} with official PDF attachment
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface font-bold p-1"
          >
            ✕
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2">
            <div className="text-emerald-600 dark:text-emerald-400 text-3xl">✓</div>
            <p className="text-sm font-semibold text-on-surface">Email Delivered</p>
            <p className="text-xs text-outline">
              Document successfully sent to {recipientEmail}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1">
                Recipient Email
              </label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="client@example.com"
                disabled={isSending}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1">
                Subject
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject line..."
                disabled={isSending}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1">
                Personalized Note (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personalized message to the client..."
                rows={3}
                disabled={isSending}
                className="w-full text-xs p-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span>📎</span>
                <span className="font-mono">{documentNumber}.pdf</span>
                <span className="text-outline">(Auto-attached)</span>
              </div>
              <a
                href={pdfDownloadUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Preview PDF
              </a>
            </div>

            {error && (
              <div className="p-3 bg-error-container border border-error/30 rounded-lg text-xs text-on-error-container space-y-1">
                <p className="font-semibold">Transmission Failed</p>
                <p>{error}</p>
                <div className="pt-1">
                  <a
                    href={pdfDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block bg-surface-container-lowest border border-error/40 text-error px-2 py-1 rounded text-[11px] font-medium hover:bg-error/10"
                  >
                    Download PDF Instead
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={onClose} disabled={isSending}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending || !recipientEmail.trim()}
                className="bg-primary hover:bg-primary-dark text-on-primary"
              >
                {isSending ? 'Transmitting...' : 'Send Email'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
