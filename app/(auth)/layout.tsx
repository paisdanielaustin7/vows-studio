import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center justify-center text-center space-y-2 mb-2">
          <Link href="/" aria-label="VOWS Home" className="transition-opacity hover:opacity-85 py-1">
            <Image
              src="/images/logo-light.png"
              alt="VOWS"
              width={180}
              height={60}
              className="h-12 sm:h-14 w-auto object-contain dark:hidden"
              priority
            />
            <Image
              src="/images/logo-dark.png"
              alt="VOWS"
              width={180}
              height={60}
              className="h-12 sm:h-14 w-auto object-contain hidden dark:block"
              priority
            />
          </Link>
          <p className="text-[11px] uppercase tracking-widest text-outline font-medium">
            VOWS Portal &bull; Authorized Access
          </p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
          {children}
        </div>

        <div className="text-center text-xs text-outline">
          &copy; {new Date().getFullYear()} VOWS. Authorized access only.
        </div>
      </div>
    </div>
  );
}
