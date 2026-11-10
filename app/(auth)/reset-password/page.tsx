'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { resetPasswordAction } from '@/server/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Banner } from '@/components/ui/feedback';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await resetPasswordAction({ password, confirmPassword });
      if (res.error) {
        setErrorMsg(res.error.message);
        setIsLoading(false);
        return;
      }

      router.push('/login?resetSuccess=true');
    } catch {
      setErrorMsg('Failed to update password. Your recovery link may have expired.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-on-surface">Set New Password</h2>
        <p className="text-sm text-on-surface-variant">
          Create a secure password for your VOWS Studio account.
        </p>
      </div>

      {errorMsg && (
        <Banner variant="error" title="Password Reset Failed">
          {errorMsg}
        </Banner>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-outline" htmlFor="new-password">
            New Password (min 12 characters)
          </label>
          <Input
            id="new-password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-[11px] text-outline">
            Must include uppercase, lowercase, digit, and special symbol.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-outline" htmlFor="confirm-password">
            Confirm New Password
          </label>
          <Input
            id="confirm-password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Updating Password...' : 'Save Password & Continue'}
        </Button>
      </form>
    </div>
  );
}
