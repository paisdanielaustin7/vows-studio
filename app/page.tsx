import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-[var(--background)]">
      <div className="max-w-xl space-y-6">
        <div className="inline-block px-3 py-1 text-xs font-semibold tracking-widest uppercase bg-[var(--surface-muted)] text-[var(--primary)] rounded-full">
          VOWS Studio
        </div>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight font-[family-name:var(--font-cormorant)] text-[var(--foreground)]">
          Wedding Cinematic & Stills
        </h1>
        <p className="text-base text-[var(--muted-foreground)] leading-relaxed">
          Single-business CRM and public monograph for VOWS Studio.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--primary)] px-6 text-sm font-medium text-[var(--primary-foreground)] shadow hover:opacity-90"
          >
            Sign In to CRM
          </Link>
          <Link
            href="/dev/components"
            className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-6 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
          >
            Component Gallery
          </Link>
        </div>
      </div>
    </main>
  );
}
