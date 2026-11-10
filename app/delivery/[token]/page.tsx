import React from 'react';
import Link from 'next/link';
import { getPublicDeliveryAction } from '@/server/actions/delivery.actions';
import {
  Download,
  PlayCircle,
  ExternalLink,
  Calendar,
  MapPin,
  ShieldCheck,
  AlertCircle,
  Clock,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PublicDeliveryPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PublicDeliveryPageProps) {
  const { token } = await params;
  const res = await getPublicDeliveryAction(token);
  if (!res.data) {
    return { title: 'Delivery Portal | VOWS Studio' };
  }
  return {
    title: `${res.data.clientName} — Delivery Portal | VOWS Studio`,
    description: `Private wedding photography and cinematography deliverables for ${res.data.clientName}.`,
  };
}

export default async function PublicDeliveryPage({ params }: PublicDeliveryPageProps) {
  const { token } = await params;
  const res = await getPublicDeliveryAction(token);

  // Uniform Invalid or Expired View (Prevents token guessing / enumeration)
  if (res.error || !res.data) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6 text-[#1E1B22]">
        <div className="max-w-md w-full bg-white border border-[#E4DED5] rounded-2xl p-8 shadow-sm text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-[#F2EEE8] flex items-center justify-center mx-auto text-[#6B6672]">
            <AlertCircle className="w-6 h-6 text-[#B3392F]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-serif font-bold text-[#1E1B22]">
              Delivery Portal Unavailable
            </h1>
            <p className="text-xs text-[#6B6672] leading-relaxed">
              This delivery link is invalid, expired, or has been revoked. If you believe this is an error, please reach out to the VOWS Studio team.
            </p>
          </div>

          <div className="pt-4 border-t border-[#E4DED5]">
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-lg bg-[#2B2A33] text-white text-xs font-semibold hover:bg-[#1E1B22] transition-colors"
            >
              Return to VOWS Studio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const {
    clientName,
    packageTitle,
    eventDatesText,
    venueText,
    targetDeliveryDate,
    progressPercentage,
    currentStageTitle,
    currentStageSort,
    deliverables,
  } = res.data;

  return (
    <main className="min-h-screen bg-[#FAF8F5] text-[#1E1B22] selection:bg-[#F3E9D7] selection:text-[#2B2A33]">
      <div className="w-full max-w-5xl mx-auto px-6 py-12 space-y-12">
        {/* Top Identity Ribbon */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-[#E4DED5]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-[#2B2A33] text-white flex items-center justify-center font-serif font-bold text-lg shadow-sm">
              V
            </div>
            <div>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-[#6B6672] block">
                VOWS STUDIO
              </span>
              <span className="text-xs font-medium text-[#1E1B22]">Client Delivery Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#6B6672]">
            <ShieldCheck className="w-4 h-4 text-[#2F7D5B]" />
            <span>Secure 256-Bit Encrypted Link</span>
          </div>
        </header>

        {/* Hero Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#B08D57]">
              {packageTitle}
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1E1B22] tracking-tight">
              {clientName}
            </h1>
            <p className="text-sm text-[#6B6672]">
              Official Master Delivery Portal & Media Archive
            </p>
          </div>

          <div className="text-left md:text-right space-y-1 text-xs text-[#6B6672]">
            {eventDatesText && (
              <div className="flex md:justify-end items-center gap-1.5 font-medium text-[#1E1B22]">
                <Calendar className="w-3.5 h-3.5 text-[#B08D57]" />
                <span>{eventDatesText}</span>
              </div>
            )}
            {venueText && (
              <div className="flex md:justify-end items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#6B6672]" />
                <span>{venueText}</span>
              </div>
            )}
          </div>
        </section>

        {/* Live Delivery Progress Card */}
        <section className="p-6 md:p-8 rounded-2xl bg-white border border-[#E4DED5] shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B08D57] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#B08D57]" />
              </span>
              <span className="font-semibold text-[#1E1B22]">
                Current Stage: {currentStageTitle} (Stage {currentStageSort} of 9)
              </span>
            </div>

            {targetDeliveryDate && (
              <div className="text-[#6B6672]">
                Target Vault Delivery: <strong className="text-[#1E1B22]">{targetDeliveryDate}</strong>
              </div>
            )}
          </div>

          {/* Stepper Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-[#F2EEE8] h-2.5 rounded-full overflow-hidden flex">
              <div
                className="bg-[#2B2A33] h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-[#6B6672] pt-1">
              <span>Raw Ingest</span>
              <span>Editorial Cut</span>
              <span className="text-[#B08D57] font-semibold">{progressPercentage}% Completed</span>
              <span>4K Masters</span>
              <span>Vault Archive</span>
            </div>
          </div>
        </section>

        {/* Available Deliverables Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-[#E4DED5]">
            <h2 className="text-xl font-serif font-bold text-[#1E1B22]">Available Deliverables</h2>
            <span className="text-xs text-[#6B6672]">{deliverables.length} Items Dispatched</span>
          </div>

          <div className="space-y-4">
            {deliverables.map((item) => (
              <article
                key={item.id}
                className="p-6 md:p-8 rounded-2xl bg-white border border-[#E4DED5] shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#F3E9D7] text-[#2B2A33] font-semibold text-[11px]">
                      {item.stageLabel}
                    </span>
                    <span className="text-xs text-[#6B6672]">
                      Dispatched on {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-[#1E1B22]">{item.label}</h3>

                  <div className="flex items-center gap-3 text-xs text-[#6B6672]">
                    <span>Format: {item.kind === 'link' ? 'Online Stream / Cloud Link' : 'Digital File Download'}</span>
                    {item.fileSizeBytes && (
                      <>
                        <span>•</span>
                        <span>Size: {(item.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2B2A33] text-white text-xs font-semibold hover:bg-[#1E1B22] transition-colors shadow-sm"
                    >
                      <PlayCircle className="w-4 h-4 text-[#B08D57]" />
                      <span>Watch / View Online</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-70 ml-0.5" />
                    </a>
                  )}

                  {item.filePath && (
                    <a
                      href={`/api/delivery/download?path=${encodeURIComponent(item.filePath)}&token=${encodeURIComponent(token)}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F2EEE8] text-[#1E1B22] text-xs font-semibold hover:bg-[#E4DED5] transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Deliverable</span>
                    </a>
                  )}
                </div>
              </article>
            ))}

            {deliverables.length === 0 && (
              <div className="p-12 text-center rounded-2xl bg-white border border-[#E4DED5] space-y-3">
                <Clock className="w-8 h-8 text-[#B08D57] mx-auto opacity-80" />
                <h3 className="text-base font-semibold text-[#1E1B22]">Deliverables in Preparation</h3>
                <p className="text-xs text-[#6B6672] max-w-md mx-auto">
                  Our post-production team is actively processing your footage and media assets. Completed films, galleries, and download packages will appear directly here as each stage completes.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-[#E4DED5] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#6B6672]">
          <p>© {new Date().getFullYear()} VOWS Studio. All rights reserved.</p>
          <p className="italic">Crafted with passion in Goa & Karnataka, India.</p>
        </footer>
      </div>
    </main>
  );
}
