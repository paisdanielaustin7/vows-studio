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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-lg font-serif font-bold text-stone-900 capitalize">
              Send {documentType.replace('_', ' ')}
            </h3>
            <p className="text-xs text-stone-500">
              Transmit document #{documentNumber} with official PDF attachment
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 font-bold p-1"
          >
            ✕
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2">
            <div className="text-emerald-600 text-3xl">✓</div>
            <p className="text-sm font-semibold text-stone-900">Email Delivered</p>
            <p className="text-xs text-stone-500">
              Document successfully sent to {recipientEmail}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
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
              <label className="text-xs font-semibold text-stone-700 block mb-1">
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
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Personalized Note (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personalized message to the client..."
                rows={3}
                disabled={isSending}
                className="w-full text-xs p-2.5 rounded-md border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>

            <div className="bg-stone-50 p-3 rounded-md border border-stone-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-stone-700">
                <span>📎</span>
                <span className="font-mono">{documentNumber}.pdf</span>
                <span className="text-stone-400">(Auto-attached)</span>
              </div>
              <a
                href={pdfDownloadUrl}
                target="_blank"
                rel="noreferrer"
                className="text-stone-900 hover:underline font-medium"
              >
                Preview PDF
              </a>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-900 space-y-1">
                <p className="font-semibold">Transmission Failed</p>
                <p>{error}</p>
                <div className="pt-1">
                  <a
                    href={pdfDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block bg-white border border-red-300 text-red-800 px-2 py-1 rounded text-[11px] font-medium hover:bg-red-50"
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
                className="bg-stone-900 hover:bg-stone-800 text-white"
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
