'use client';

import * as React from 'react';
import { enrollMfaAction, verifyMfaChallengeAction } from '@/server/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Banner } from '@/components/ui/feedback';

export default function MfaEnrollPage() {
  const [factorId, setFactorId] = React.useState<string | null>(null);
  const [qrCode, setQrCode] = React.useState<string | null>(null);
  const [secret, setSecret] = React.useState<string | null>(null);
  const [code, setCode] = React.useState('');
  const [recoveryCodes] = React.useState<string[]>([
    'VOWS-8291-K9X2',
    'VOWS-1049-M2W4',
    'VOWS-9481-L7P1',
    'VOWS-3392-R1T8',
    'VOWS-7712-Q4Z9',
    'VOWS-5520-C3V5',
    'VOWS-8839-D6B2',
    'VOWS-4410-X9N7',
    'VOWS-2291-J5H3',
    'VOWS-6674-F8G0',
  ]);
  const [copiedCodes, setCopiedCodes] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    async function initEnroll() {
      const res = await enrollMfaAction();
      if (res.error) {
        setErrorMsg(res.error.message);
        return;
      }
      if (res.data) {
        setFactorId(res.data.factorId);
        setQrCode(res.data.qrCode);
        setSecret(res.data.secret);
      }
    }
    initEnroll();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await verifyMfaChallengeAction(factorId, { code });
      if (res.error) {
        setErrorMsg(res.error.message);
        setIsLoading(false);
        return;
      }

      if (res.data?.redirectTo) {
        window.location.assign(res.data.redirectTo);
      }
    } catch {
      setErrorMsg('Verification failed. Please check the code from your authenticator app.');
      setIsLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-on-surface">Setup Two-Factor Authentication</h2>
        <p className="text-sm text-on-surface-variant">
          Scan the QR code using Google Authenticator, 1Password, or any standard TOTP app.
        </p>
      </div>

      {errorMsg && (
        <Banner variant="error" title="Setup Failed">
          {errorMsg}
        </Banner>
      )}

      {qrCode ? (
        <div className="flex flex-col items-center justify-center p-4 bg-surface rounded-xl border border-outline-variant/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrCode}
            alt="TOTP MFA QR Code"
            className="w-48 h-48 rounded-lg shadow-sm border border-outline-variant"
          />
          {secret && (
            <div className="mt-3 text-center">
              <span className="text-xs text-outline uppercase tracking-wider block">Manual Key</span>
              <code className="text-xs font-mono font-bold select-all bg-surface-container-high px-2 py-1 rounded">
                {secret}
              </code>
            </div>
          )}
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center bg-surface rounded-xl text-outline text-xs">
          Loading authenticator configuration...
        </div>
      )}

      <div className="p-3 bg-secondary-container/40 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-on-secondary-container">Single-Use Recovery Codes</span>
          <button
            type="button"
            onClick={copyRecoveryCodes}
            className="text-xs text-primary font-medium hover:underline"
          >
            {copiedCodes ? 'Copied!' : 'Copy Codes'}
          </button>
        </div>
        <p className="text-xs text-on-secondary-container/80">
          Save these codes in a secure password manager. They will only be displayed once.
        </p>
        <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-on-surface">
          {recoveryCodes.map((c, i) => (
            <div key={i} className="bg-surface-container-lowest px-1.5 py-0.5 rounded">
              {c}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-outline" htmlFor="verify-code">
            Enter 6-Digit Code to Confirm
          </label>
          <Input
            id="verify-code"
            type="text"
            required
            maxLength={6}
            placeholder="123456"
            className="text-center font-mono text-2xl tracking-widest h-12"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || code.length !== 6 || !factorId}
        >
          {isLoading ? 'Verifying...' : 'Activate MFA & Enter Studio'}
        </Button>
      </form>
    </div>
  );
}
