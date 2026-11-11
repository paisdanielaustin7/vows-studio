'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { acceptInvitationAction } from '@/server/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Banner } from '@/components/ui/feedback';

export default function AcceptInvitePage() {
  const params = useParams();
  const token = (params.token as string) || '';

  const [fullName, setFullName] = React.useState('');
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
      const res = await acceptInvitationAction({
        token,
        fullName,
        password,
        confirmPassword,
      });

      if (res.error) {
        setErrorMsg(res.error.message);
        setIsLoading(false);
        return;
      }

      if (res.data?.redirectTo) {
        window.location.assign(res.data.redirectTo);
      }
    } catch {
      setErrorMsg('Failed to accept invitation. The invitation link may have expired.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-on-surface">Accept Team Invitation</h2>
        <p className="text-sm text-on-surface-variant">
          Complete your profile and set a password to join the VOWS Studio workspace.
        </p>
      </div>

      {errorMsg && (
        <Banner variant="error" title="Invitation Error">
          {errorMsg}
        </Banner>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-outline" htmlFor="full-name">
            Your Full Name
          </label>
          <Input
            id="full-name"
            type="text"
            required
            autoComplete="name"
            placeholder="Reuben Serrao"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-outline" htmlFor="password">
            Create Password (min 12 characters)
          </label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-[11px] text-outline">
            Must contain uppercase, lowercase, number, and special symbol.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-outline" htmlFor="confirm-password">
            Confirm Password
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
          disabled={isLoading || !token}
        >
          {isLoading ? 'Setting Up Account...' : 'Join Workspace'}
        </Button>
      </form>
    </div>
  );
}
