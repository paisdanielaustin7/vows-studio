import * as React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-on-primary shadow-sm mb-2">
            <span className="font-serif text-2xl font-bold tracking-widest">V</span>
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-on-surface">
            VOWS STUDIO
          </h1>
          <p className="text-xs uppercase tracking-widest text-outline">
            Cinema &amp; Stills CRM
          </p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
          {children}
        </div>

        <div className="text-center text-xs text-outline">
          &copy; {new Date().getFullYear()} VOWS Studio. Authorized access only.
        </div>
      </div>
    </div>
  );
}
