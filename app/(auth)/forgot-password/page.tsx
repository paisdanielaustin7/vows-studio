'use client';

import * as React from 'react';
import Link from 'next/link';
import { forgotPasswordAction } from '@/server/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Banner } from '@/components/ui/feedback';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);
  const [manualLink, setManualLink] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    setManualLink(null);
    setIsLoading(true);

    try {
      const res = await forgotPasswordAction({ email });
      if (res.error) {
        setErrorMsg(res.error.message);
        setIsLoading(false);
        return;
      }

      if (res.data) {
        setStatusMsg(res.data.message);
        if (res.data.manualLink) {
          setManualLink(res.data.manualLink);
        }
      }
    } catch {
      setErrorMsg('An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-on-surface">Reset Password</h2>
        <p className="text-sm text-on-surface-variant">
          Enter your email address and we will generate a recovery link valid for 1 hour.
        </p>
      </div>

      {errorMsg && (
        <Banner variant="error" title="Request Failed">
          {errorMsg}
        </Banner>
      )}

      {statusMsg && (
        <Banner variant="info" title="Recovery Link Dispatched">
          {statusMsg}
        </Banner>
      )}

      {manualLink && (
        <div className="p-3 bg-secondary-container/40 rounded-xl space-y-1 text-xs">
          <span className="font-semibold text-on-secondary-container">Development Recovery Link:</span>
          <p className="break-all font-mono text-[11px] text-on-surface">
            <a href={manualLink} className="text-primary hover:underline">
              {manualLink}
            </a>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-outline" htmlFor="email">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="name@vowsstudio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Generating Link...' : 'Send Recovery Link'}
        </Button>
      </form>

      <div className="pt-4 border-t border-outline-variant/40 text-center">
        <Link href="/login" className="text-xs text-primary font-medium hover:underline">
          &larr; Back to Sign In
        </Link>
      </div>
    </div>
  );
}
