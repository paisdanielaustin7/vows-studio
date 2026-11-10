'use client';

import React, { useState } from 'react';
import { GmailStatus } from '@/lib/gmail/types';
import {
  disconnectGmailAction,
  updateGmailSenderSettingsAction,
  testSendEmailAction,
} from '@/server/actions/gmail.actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface GmailSettingsCardProps {
  initialStatus: GmailStatus;
  canManage: boolean;
}

export function GmailSettingsCard({
  initialStatus,
  canManage,
}: GmailSettingsCardProps) {
  const [status, setStatus] = useState<GmailStatus>(initialStatus);
  const [fromName, setFromName] = useState(initialStatus.fromName || '');
  const [replyTo, setReplyTo] = useState(initialStatus.replyTo || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const isConnected = status.status === 'connected';
  const needsReconnect = status.status === 'needs_reconnect';

  const handleSaveSettings = async () => {
    if (!canManage) return;
    setIsSaving(true);
    setSaveSuccess(false);

    const res = await updateGmailSenderSettingsAction({ fromName, replyTo });
    setIsSaving(false);
    if (!res.error) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleDisconnect = async () => {
    if (!canManage) return;
    if (!confirm('Are you sure you want to disconnect Gmail? Outgoing emails will be disabled until reconnected.')) {
      return;
    }

    const res = await disconnectGmailAction();
    if (!res.error) {
      setStatus({
        status: 'disconnected',
        googleEmail: null,
        fromName: null,
        replyTo: null,
        connectedAt: null,
        lastError: null,
      });
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.trim()) return;
    setIsSendingTest(true);
    setTestResult(null);

    const res = await testSendEmailAction(testEmail.trim());
    setIsSendingTest(false);

    if (res.error) {
      setTestResult({ success: false, message: res.error.message });
    } else {
      setTestResult({
        success: true,
        message: `Test email successfully transmitted! Message ID: ${res.data?.messageId}`,
      });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-serif text-stone-900 tracking-tight">
              Gmail Transmission Integration
            </h2>
            <Badge
              variant={
                isConnected
                  ? 'success'
                  : needsReconnect
                  ? 'warning'
                  : 'default'
              }
              className="text-xs uppercase"
            >
              {status.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Studio sender pipeline for quotations, tax invoices, payment receipts, and password resets
          </p>
        </div>

        {canManage && (
          <div>
            {!isConnected ? (
              <Button
                onClick={() => {
                  window.location.href = '/api/auth/gmail/connect';
                }}
                className="bg-stone-900 hover:bg-stone-800 text-white"
              >
                {needsReconnect ? 'Reconnect Gmail' : 'Connect with Google'}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleDisconnect}
                className="text-red-700 border-red-200 hover:bg-red-50 text-xs"
              >
                Disconnect Account
              </Button>
            )}
          </div>
        )}
      </div>

      {needsReconnect && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
          <p className="font-bold">⚠️ Reconnection Required</p>
          <p>
            Google authorization token has expired or was revoked. Please click &ldquo;Reconnect Gmail&rdquo; above to re-authorize.
          </p>
        </div>
      )}

      {isConnected && status.googleEmail && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-lg border border-stone-200">
            <div>
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Connected Google Account
              </span>
              <span className="font-mono text-sm font-medium text-stone-900">
                {status.googleEmail}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Connected At
              </span>
              <span className="text-sm text-stone-700">
                {status.connectedAt ? new Date(status.connectedAt).toLocaleString() : 'Active'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Sender Display Name
              </label>
              <Input
                placeholder="e.g. VOWS Studio by Reuben"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                disabled={!canManage}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Reply-To Email (Optional)
              </label>
              <Input
                placeholder="e.g. contact@vowsstudio.com"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                disabled={!canManage}
              />
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-3 pt-2">
              <Button
                size="sm"
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="bg-stone-900 text-white"
              >
                {isSaving ? 'Saving...' : 'Save Sender Profile'}
              </Button>
              {saveSuccess && (
                <span className="text-xs text-emerald-700 font-medium">
                  ✓ Sender settings updated
                </span>
              )}
            </div>
          )}

          {/* Test Send Section */}
          {canManage && (
            <div className="border-t border-stone-100 pt-5 space-y-3">
              <h3 className="text-sm font-semibold text-stone-900">Send Test Transmission</h3>
              <p className="text-xs text-stone-500">
                Send a sample verification message to ensure Google quota and MIME transmission are healthy.
              </p>
              <div className="flex items-center gap-3 max-w-md">
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendTest}
                  disabled={isSendingTest || !testEmail.trim()}
                  className="whitespace-nowrap"
                >
                  {isSendingTest ? 'Transmitting...' : 'Send Test'}
                </Button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg text-xs ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-red-50 text-red-900 border border-red-200'
                  }`}
                >
                  {testResult.message}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!isConnected && (
        <div className="p-4 bg-stone-50 rounded-lg text-xs text-stone-600 space-y-2 border border-dashed border-stone-200">
          <p>
            No active Gmail connection found. Outgoing documents (quotations, invoices, receipts) will require manual PDF download until a Google account is authorized.
          </p>
          <p className="text-[11px] text-stone-400">
            Authorization requires the <code>gmail.send</code> and <code>openid</code> scopes. No email reading or inbox access is ever requested or permitted.
          </p>
        </div>
      )}
    </div>
  );
}
