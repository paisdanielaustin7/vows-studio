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
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Info,
} from 'lucide-react';

interface GmailSettingsCardProps {
  initialStatus: GmailStatus;
  canManage: boolean;
  isConfigured?: boolean;
  queryError?: string;
  justConnected?: boolean;
  appUrl?: string;
}

export function GmailSettingsCard({
  initialStatus,
  canManage,
  isConfigured = true,
  queryError,
  justConnected,
  appUrl = 'https://vows-studio-one.vercel.app',
}: GmailSettingsCardProps) {
  const [status, setStatus] = useState<GmailStatus>(initialStatus);
  const [fromName, setFromName] = useState(initialStatus.fromName || '');
  const [replyTo, setReplyTo] = useState(initialStatus.replyTo || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(!isConfigured);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const isConnected = status.status === 'connected';
  const needsReconnect = status.status === 'needs_reconnect';

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

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

  const getErrorMessage = (err: string) => {
    switch (err) {
      case 'oauth_credentials_missing':
        return 'Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured in your Vercel project environment variables.';
      case 'google_oauth_access_denied':
        return 'Access was denied on the Google authentication screen.';
      case 'invalid_oauth_state':
        return 'Authentication session timed out or CSRF state mismatch. Please click Connect with Google again.';
      case 'token_exchange_failed':
        return 'Failed to exchange authorization code with Google. Please verify that GOOGLE_CLIENT_SECRET matches your Google Cloud Console configuration.';
      case 'gmail_disabled_in_demo':
        return 'Gmail transmission is disabled in Demo Mode.';
      case 'unauthorized_role':
        return 'Only System Administrators and Business Owners can manage Gmail integration.';
      default:
        if (err.startsWith('google_oauth_')) {
          return `Google OAuth Error: ${err.replace('google_oauth_', '')}`;
        }
        return 'Authentication failed. Please verify your Google Cloud configuration and try again.';
    }
  };

  const redirectUri = `${appUrl.replace(/\/$/, '')}/api/auth/gmail/callback`;
  const originUrl = appUrl.replace(/\/$/, '');

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 overflow-hidden shadow-xs space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/30 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-on-surface tracking-tight">
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
          <p className="text-xs text-outline mt-1">
            Studio sender pipeline for quotations, tax invoices, payment receipts, and password resets
          </p>
        </div>

        {canManage && (
          <div>
            {!isConnected ? (
              <Button
                onClick={() => {
                  if (!isConfigured) {
                    setShowSetupGuide(true);
                    return;
                  }
                  window.location.href = '/api/auth/gmail/connect';
                }}
                className="bg-primary hover:bg-primary-dark text-on-primary font-medium"
              >
                {needsReconnect ? 'Reconnect Gmail' : 'Connect with Google'}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleDisconnect}
                className="text-error border-error/30 hover:bg-error/10 text-xs"
              >
                Disconnect Account
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Success Notification */}
      {justConnected && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Google Account Successfully Connected!</p>
            <p className="mt-0.5 text-emerald-700 dark:text-emerald-300">
              Your studio is now linked to send emails directly via the Gmail API. All outbound quotations, invoices, and receipts will be dispatched from this account.
            </p>
          </div>
        </div>
      )}

      {/* Query Error Notification */}
      {queryError && (
        <div className="p-4 bg-error-container/30 border border-error/40 rounded-xl flex items-start gap-3 text-xs text-on-error-container">
          <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">OAuth Authorization Issue</p>
            <p>{getErrorMessage(queryError)}</p>
          </div>
        </div>
      )}

      {/* Not Configured Alert & Guide Toggle */}
      {!isConfigured && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Google Cloud OAuth 2.0 Credentials Required</p>
                <p className="mt-1 text-amber-800 dark:text-amber-300 leading-relaxed">
                  Before clicking <strong>Connect with Google</strong>, Google requires a registered OAuth 2.0 Client ID for this web application. Without this, Google halts the login with <code>Error 401: invalid_client (&quot;The OAuth client was not found&quot;)</code>.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSetupGuide((prev) => !prev)}
              className="text-xs shrink-0 border-amber-500/40 hover:bg-amber-500/10"
            >
              {showSetupGuide ? (
                <>
                  Hide Setup Guide <ChevronUp className="w-3.5 h-3.5 ml-1" />
                </>
              ) : (
                <>
                  View Setup Guide <ChevronDown className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>

          {showSetupGuide && (
            <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-4">
              <div className="space-y-2">
                <p className="font-bold text-xs uppercase tracking-wider text-amber-950 dark:text-amber-100">
                  Quick 4-Step Setup Procedure:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed">
                  <li>
                    Go to the{' '}
                    <a
                      href="https://console.cloud.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline inline-flex items-center gap-1 hover:text-amber-700 dark:hover:text-amber-100"
                    >
                      Google Cloud Console <ExternalLink className="w-3 h-3 inline" />
                    </a>
                    , create or select a project (e.g. <code>VOWS-Studio-CRM</code>), and enable the <strong>Gmail API</strong> under <strong>APIs & Services &gt; Library</strong>.
                  </li>
                  <li>
                    In <strong>OAuth consent screen</strong>, select <strong>External</strong>, set the App Name to <code>VOWS Studio CRM</code>, and add scopes:{' '}
                    <code>gmail.send</code>, <code>openid</code>, and <code>email</code>. (Publish status: <strong>In Production</strong>).
                  </li>
                  <li>
                    Under <strong>Credentials &gt; Create Credentials &gt; OAuth client ID</strong>, choose <strong>Web application</strong>. Enter the exact URLs below:
                  </li>
                </ol>
              </div>

              {/* URL Reference Cards */}
              <div className="grid grid-cols-1 gap-3 bg-surface-container-lowest/80 p-3 rounded-lg border border-amber-500/30">
                <div>
                  <span className="text-[11px] font-semibold text-outline uppercase block mb-1">
                    Authorized JavaScript Origins
                  </span>
                  <div className="flex items-center justify-between bg-surface-container-low px-2.5 py-1.5 rounded font-mono text-xs">
                    <span className="truncate select-all">{originUrl}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(originUrl, 'origin')}
                      className="ml-2 text-primary hover:text-primary-dark p-1 rounded"
                      title="Copy Origin"
                    >
                      {copiedKey === 'origin' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-outline uppercase block mb-1">
                    Authorized Redirect URI
                  </span>
                  <div className="flex items-center justify-between bg-surface-container-low px-2.5 py-1.5 rounded font-mono text-xs">
                    <span className="truncate select-all">{redirectUri}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(redirectUri, 'redirect')}
                      className="ml-2 text-primary hover:text-primary-dark p-1 rounded"
                      title="Copy Redirect URI"
                    >
                      {copiedKey === 'redirect' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs">
                  4. Copy your <strong>Client ID</strong> and <strong>Client Secret</strong>, and add them to your <strong>Vercel Project Settings &gt; Environment Variables</strong>:
                </p>
                <div className="bg-surface-container-lowest/90 p-3 rounded-lg border border-amber-500/30 font-mono text-[11px] space-y-1 text-on-surface">
                  <div className="flex items-center justify-between">
                    <span>GOOGLE_CLIENT_ID=&quot;&lt;your-client-id&gt;.apps.googleusercontent.com&quot;</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>GOOGLE_CLIENT_SECRET=&quot;&lt;your-client-secret&gt;&quot;</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>NEXT_PUBLIC_APP_URL=&quot;{originUrl}&quot;</span>
                  </div>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  After saving the environment variables on Vercel, redeploy your project (or push a commit) so the keys take effect, then return here to click <strong>Connect with Google</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {needsReconnect && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <p className="font-bold">⚠️ Reconnection Required</p>
          <p>
            Google authorization token has expired or was revoked. Please click &ldquo;Reconnect Gmail&rdquo; above to re-authorize.
          </p>
        </div>
      )}

      {isConnected && status.googleEmail && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant/40">
            <div>
              <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block">
                Connected Google Account
              </span>
              <span className="font-mono text-sm font-medium text-on-surface">
                {status.googleEmail}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block">
                Connected At
              </span>
              <span className="text-sm text-on-surface-variant">
                {status.connectedAt ? new Date(status.connectedAt).toLocaleString() : 'Active'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1">
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
              <label className="text-xs font-semibold text-on-surface block mb-1">
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
                className="bg-primary hover:bg-primary-dark text-on-primary"
              >
                {isSaving ? 'Saving...' : 'Save Sender Profile'}
              </Button>
              {saveSuccess && (
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  ✓ Sender settings updated
                </span>
              )}
            </div>
          )}

          {/* Test Send Section */}
          {canManage && (
            <div className="border-t border-outline-variant/30 pt-5 space-y-3">
              <h3 className="text-sm font-semibold text-on-surface">Send Test Transmission</h3>
              <p className="text-xs text-outline">
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
                  className={`p-3 rounded-xl text-xs ${
                    testResult.success
                      ? 'bg-secondary-container text-on-secondary-container border border-secondary-container'
                      : 'bg-error-container text-on-error-container border border-error/30'
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
        <div className="p-4 bg-surface-container-low rounded-xl text-xs text-on-surface-variant space-y-2 border border-dashed border-outline-variant/60">
          <p>
            No active Gmail connection found. Outgoing documents (quotations, invoices, receipts) will require manual PDF download until a Google account is authorized.
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-outline">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              Authorization requires the <code>gmail.send</code> and <code>openid</code> scopes. No email reading or inbox access is ever requested or permitted.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
