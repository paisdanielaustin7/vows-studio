'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { PortfolioItem } from '@/types/portfolio';
import { PortfolioLightbox } from '@/components/public/portfolio-lightbox';
import { Eye, ShieldCheck, Film } from 'lucide-react';

interface PortfolioViewProps {
  initialItems: PortfolioItem[];
  activeCategory?: string;
}

const CATEGORIES = [
  { label: 'All Works', value: 'all' },
  { label: 'Chapel Nuptials', value: 'wedding' },
  { label: 'Coastal Receptions', value: 'reception' },
  { label: 'Pre-Wedding', value: 'pre_wedding' },
  { label: 'Cultural Blessings', value: 'mehendi' },
];

export function PortfolioView({ initialItems, activeCategory = 'all' }: PortfolioViewProps) {
  const [selectedCategory, setSelectedCategory] = useState(activeCategory);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filteredItems = initialItems.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.eventType === selectedCategory;
  });

  return (
    <div className="w-full">
      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 border-b border-[var(--border)]">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm'
                  : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Grid of Portfolio Works */}
      {filteredItems.length === 0 ? (
        <div className="py-20 text-center bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
          <p className="text-sm text-[var(--muted-foreground)]">
            No monographs found under this category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map((item, idx) => {
            const hasVideo = !!item.videoUrl;
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => setLightboxIndex(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setLightboxIndex(idx);
                  }
                }}
                className="group cursor-pointer flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                {/* Image Frame */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--surface-muted)]">
                  {item.coverImagePath && (
                    <Image
                      src={item.coverImagePath}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  )}
                  {/* Overlay Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="bg-[var(--background)]/90 backdrop-blur-md px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground)]">
                      {item.eventType.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1">
                      {hasVideo && (
                        <span className="bg-black/60 backdrop-blur-md text-white p-1 rounded-full">
                          <Film className="w-3 h-3" />
                        </span>
                      )}
                      <span className="bg-[var(--background)]/90 backdrop-blur-md p-1 rounded-full text-[var(--success)]">
                        <ShieldCheck className="w-3 h-3" />
                      </span>
                    </div>
                  </div>

                  {/* Hover prompt */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 text-xs font-medium">
                    <Eye className="w-4 h-4" />
                    <span>Open Lightbox</span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-6 flex flex-col justify-between flex-1">
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase font-mono tracking-widest text-[var(--muted-foreground)]">
                      Monograph 0{idx + 1}
                    </div>
                    <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {item.tags && item.tags.length > 0 && (
                    <div className="pt-4 flex flex-wrap gap-1 border-t border-[var(--border)] mt-4">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--muted-foreground)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      <PortfolioLightbox
        items={filteredItems}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />
    </div>
  );
}
