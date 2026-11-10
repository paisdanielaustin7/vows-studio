import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-6 text-center">
      <div className="w-full max-w-md space-y-6 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <div className="w-14 h-14 mx-auto rounded-full bg-surface-container text-outline flex items-center justify-center">
          <FileQuestion className="w-8 h-8 text-outline" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold tracking-widest uppercase text-outline">
            Error 404 &bull; Not Found
          </span>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-on-surface">
            Nothing Found Here
          </h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            The page, booking, or record you requested does not exist or may have been archived.
          </p>
        </div>

        <div className="pt-2">
          <Button asChild className="w-full">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
