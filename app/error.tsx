'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Unhandled studio exception:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-6 text-center">
      <div className="w-full max-w-md space-y-6 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <div className="w-14 h-14 mx-auto rounded-full bg-error-container/40 text-error flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-error" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold tracking-widest uppercase text-error">
            Error 500 &bull; Studio Exception
          </span>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-on-surface">
            System Interruption
          </h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            An internal server error occurred while processing this request. Our technical team has been notified.
          </p>
          {error.digest && (
            <p className="text-[11px] font-mono text-outline">
              Reference ID: {error.digest}
            </p>
          )}
        </div>

        <div className="pt-2 flex gap-3">
          <Button onClick={() => reset()} className="flex-1">
            Try Again
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/crm/dashboard'} className="flex-1">
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
