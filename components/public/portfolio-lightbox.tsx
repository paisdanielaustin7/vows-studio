'use client';

import React, { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Video, Calendar, Tag, ShieldCheck } from 'lucide-react';
import { PortfolioItem } from '@/types/portfolio';

interface PortfolioLightboxProps {
  items: PortfolioItem[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function PortfolioLightbox({
  items,
  currentIndex,
  onClose,
  onNavigate,
}: PortfolioLightboxProps) {
  const isOpen = currentIndex !== null && currentIndex >= 0 && currentIndex < items.length;
  const currentItem = isOpen ? items[currentIndex] : null;

  const handlePrev = useCallback(() => {
    if (currentIndex === null) return;
    const nextIdx = (currentIndex - 1 + items.length) % items.length;
    onNavigate(nextIdx);
  }, [currentIndex, items.length, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex === null) return;
    const nextIdx = (currentIndex + 1) % items.length;
    onNavigate(nextIdx);
  }, [currentIndex, items.length, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !currentItem) return null;

  const currentImg =
    currentItem.images && currentItem.images.length > 0
      ? currentItem.images[0]
      : {
          storagePath: currentItem.coverImagePath || '',
          altText: currentItem.title,
        };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={currentItem.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 lg:p-10 animate-in fade-in duration-200"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Close lightbox"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Prev button */}
      <button
        type="button"
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Previous monograph"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Next button */}
      <button
        type="button"
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Next monograph"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Main Container */}
      <div className="relative w-full max-w-6xl max-h-[90vh] flex flex-col lg:flex-row bg-[var(--surface)] text-[var(--foreground)] rounded-xl overflow-hidden shadow-2xl border border-white/10">
        {/* Media Frame (Left/Top) */}
        <div className="relative flex-1 bg-black/95 flex items-center justify-center min-h-[300px] lg:min-h-[550px] overflow-hidden">
          {currentImg.storagePath ? (
            <div className="relative w-full h-full min-h-[350px] lg:min-h-[550px]">
              <Image
                src={currentImg.storagePath}
                alt={currentImg.altText || currentItem.title}
                fill
                sizes="(max-width: 1024px) 100vw, 70vw"
                className="object-contain"
                priority
              />
            </div>
          ) : (
            <div className="text-white/40 text-sm">No image available</div>
          )}

          {/* Sequence Counter */}
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white/90 text-xs px-3 py-1 rounded-full font-mono">
            {currentIndex + 1} / {items.length}
          </div>
        </div>

        {/* Details Rail (Right/Bottom) */}
        <div className="w-full lg:w-96 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto bg-[var(--surface)] max-h-[40vh] lg:max-h-[550px]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--foreground)]">
                {currentItem.eventType.replace('_', ' ')}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--success)]">
                <ShieldCheck className="w-3 h-3" />
                Verified Consent
              </span>
            </div>

            <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold leading-tight text-[var(--foreground)]">
              {currentItem.title}
            </h2>

            {currentItem.shootDate && (
              <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <Calendar className="w-3.5 h-3.5" />
                <span>Captured {currentItem.shootDate}</span>
              </div>
            )}

            {currentItem.description && (
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed pt-2">
                {currentItem.description}
              </p>
            )}

            {currentItem.tags && currentItem.tags.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] mb-2">
                  <Tag className="w-3 h-3" />
                  <span>Attributes</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentItem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--foreground)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {currentItem.videoUrl && (
              <div className="pt-3">
                <a
                  href={currentItem.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  <Video className="w-4 h-4" />
                  Watch Cinematic Reel (External)
                </a>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-[var(--border)] mt-6 text-[11px] text-[var(--muted-foreground)]">
            Alt: &ldquo;{currentImg.altText || currentItem.title}&rdquo;
          </div>
        </div>
      </div>
    </div>
  );
}
