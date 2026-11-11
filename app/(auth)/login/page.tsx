'use client';

import * as React from 'react';
import Link from 'next/link';
import { loginAction } from '@/server/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Banner } from '@/components/ui/feedback';

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const isDemo = process.env.NEXT_PUBLIC_APP_MODE === 'demo';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await loginAction({ email, password });
      if (res.error) {
        setErrorMsg(res.error.message);
        setIsLoading(false);
        return;
      }

      if (res.data?.redirectTo) {
        window.location.assign(res.data.redirectTo);
      }
    } catch {
      setErrorMsg('An unexpected error occurred during login. Please try again.');
      setIsLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('VowsDemo2026!');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-on-surface">Sign In</h2>
        <p className="text-sm text-on-surface-variant">
          Enter your studio credentials to access the management portal.
        </p>
      </div>

      {errorMsg && (
        <Banner variant="error" title="Authentication Failed">
          {errorMsg}
        </Banner>
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wider text-outline" htmlFor="password">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Signing In...' : 'Sign In to Studio CRM'}
        </Button>
      </form>

      {isDemo && (
        <div className="pt-4 border-t border-outline-variant/50 space-y-2">
          <p className="text-xs font-medium text-outline uppercase tracking-wider text-center">
            Demo Environment Accounts
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillDemoAccount('owner@vowsstudio.com')}
            >
              Business Owner
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillDemoAccount('admin@vowsstudio.com')}
            >
              System Admin
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillDemoAccount('manager@vowsstudio.com')}
            >
              Manager
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillDemoAccount('accountant@vowsstudio.com')}
            >
              Accountant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
