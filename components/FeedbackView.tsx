'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  MessageSquareQuote,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Plus,
  Send,
  Heart,
  Camera,
  Film,
  Clock,
  Sparkles,
  Download,
  Filter,
  Search,
} from 'lucide-react';
import { FeedbackSubmission, Client, ShootBooking, UserAccount } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

interface FeedbackViewProps {
  clients: Client[];
  bookings: ShootBooking[];
  currentUser: UserAccount;
}

const defaultFeedbackList: FeedbackSubmission[] = [
  {
    id: 'fb-01',
    clientId: 'cli-01',
    clientName: 'Alveera D’Souza & Jason Pinto',
    shootId: 'sht-sep-01',
    eventDate: '2026-09-12',
    eventType: 'Wedding Cinemastory & Stills',
    rating: 5,
    serviceRatings: {
      photography: 5,
      cinematography: 5,
      deliveryPunctuality: 5,
    },
    review:
      'Reuben and Dan captured our coastal wedding with unbelievable emotion and style. The sunset frames by Tannirbhavi feel like a European editorial film. Every family member was blown away by their calm demeanor and prompt delivery!',
    highlights: 'Sunset wave slow-motion 4K cinema and the intimate church portraits.',
    allowSocialSharing: true,
    createdAt: '2026-09-14T10:30:00Z',
  },
  {
    id: 'fb-02',
    clientId: 'cli-02',
    clientName: 'Kavya Bhandary & Nithin Rai',
    eventDate: '2026-08-28',
    eventType: 'Royal Coastal Wedding',
    rating: 5,
    serviceRatings: {
      photography: 5,
      cinematography: 5,
      deliveryPunctuality: 5,
    },
    review:
      'Choosing VOWS Studio was the best decision of our wedding! Reuben has a rare eye for true candid moments without feeling staged. Highly recommended for couples who want authentic, artistic memories.',
    highlights: 'Candid laughter during the banquet and aerial drone entry shots.',
    allowSocialSharing: true,
    createdAt: '2026-09-02T15:45:00Z',
  },
];

export const FeedbackView: React.FC<FeedbackViewProps> = ({
  clients,
  bookings,
  currentUser,
}) => {
  const [feedbackList, setFeedbackList] = useState<FeedbackSubmission[]>([]);
  const [selectedClientForLink, setSelectedClientForLink] = useState<Client>(clients[0]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [starFilter, setStarFilter] = useState<number | 'ALL'>('ALL');
  const [activeDeckModal, setActiveDeckModal] = useState<FeedbackSubmission | null>(null);

  // Load feedback from Supabase Realtime & LocalStorage
  useEffect(() => {
    // 1. Load from local storage for instant offline display
    let localSubmissions: FeedbackSubmission[] = [];
    try {
      const stored = localStorage.getItem('vows_client_feedback');
      if (stored) {
        const parsed: FeedbackSubmission[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          localSubmissions = parsed;
          setFeedbackList(parsed);
        }
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Load from Supabase Cloud
    const loadCloudFeedback = async () => {
      if (supabase && isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('lumina_feedback')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data) {
            const mapped: FeedbackSubmission[] = data.map((row) => ({
              id: row.id,
              clientId: row.client_id,
              clientName: row.client_name,
              shootId: row.shoot_id,
              eventDate: row.event_date,
              eventType: row.event_type,
              rating: row.rating,
              serviceRatings: row.service_ratings || {},
              review: row.review,
              highlights: row.highlights,
              allowSocialSharing: row.allow_social_sharing,
              createdAt: row.created_at,
            }));

            setFeedbackList(mapped);
            return;
          }
        } catch (err) {
          console.warn('[FeedbackView] Cloud fetch note:', err);
        }
      }

      // Fallback: use local storage if cloud not configured
      if (localSubmissions.length > 0) {
        setFeedbackList(localSubmissions);
      }
    };

    loadCloudFeedback();

    // 3. Supabase Realtime WebSocket subscription (< 1 sec live sync)
    if (supabase && isSupabaseConfigured()) {
      const channel = supabase
        .channel('vows_feedback_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'lumina_feedback' },
          () => {
            loadCloudFeedback();
          }
        )
        .subscribe();

      return () => {
        if (supabase) {
          supabase.removeChannel(channel);
        }
      };
    }
  }, []);

  const getFeedbackUrl = (client: Client) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/feedback/${client.id}`;
    }
    return `https://vowsstudio.com/feedback/${client.id}`;
  };

  const getWhatsAppMessage = (client: Client) => {
    const url = getFeedbackUrl(client);
    return `Hi ${client.name}! Thank you for trusting VOWS Studio with your special day. Reuben and the crew would love to hear your thoughts and memories. Please take a moment to share your review: ${url}`;
  };

  const handleCopyLink = () => {
    const url = getFeedbackUrl(selectedClientForLink);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyWhatsApp = () => {
    const text = getWhatsAppMessage(selectedClientForLink);
    navigator.clipboard.writeText(text);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const filteredFeedbacks = feedbackList.filter((f) => {
    if (starFilter !== 'ALL' && f.rating !== starFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.clientName.toLowerCase().includes(q) ||
        f.review.toLowerCase().includes(q) ||
        (f.highlights && f.highlights.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const averageRating =
    feedbackList.length > 0
      ? (
          feedbackList.reduce((acc, curr) => acc + curr.rating, 0) / feedbackList.length
        ).toFixed(1)
      : '5.0';

  return (
    <div className="p-3.5 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-4 sm:pb-6 border-b border-bone-border dark:border-obsidian-border">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.25em] text-bone-muted dark:text-obsidian-muted mb-1">
            <span>Client Relations</span>
            <span>//</span>
            <span className="text-vermillion font-bold">Feedback & Testimonials Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-serif font-black tracking-tight text-carbon dark:text-white uppercase">
            Client Reviews
          </h1>
        </div>

        {/* Global Metric Badge */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 border border-bone-border dark:border-obsidian-border bg-bone-card dark:bg-obsidian-card flex items-center gap-3">
            <div className="flex items-center text-amber-500 gap-1">
              <Star size={18} className="fill-amber-500" />
              <span className="font-serif font-bold text-xl text-carbon dark:text-white">
                {averageRating}
              </span>
            </div>
            <div className="text-[10px] font-mono uppercase text-bone-muted dark:text-obsidian-muted border-l border-bone-border dark:border-obsidian-border pl-3">
              <span>{feedbackList.length} Verified Reviews</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Section: Generate Link Box */}
      <div className="p-4 sm:p-6 border-2 border-carbon dark:border-white bg-bone-card dark:bg-obsidian-card space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-bone-border dark:border-obsidian-border pb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-vermillion" />
            <h2 className="font-serif text-lg font-bold uppercase text-carbon dark:text-white">
              Generate & Dispatch Client Feedback Link
            </h2>
          </div>
          <span className="text-[10px] font-mono uppercase text-bone-muted dark:text-obsidian-muted">
            Send via WhatsApp / SMS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center text-xs font-mono">
          {/* Select Client */}
          <div className="md:col-span-5 space-y-1">
            <label className="text-[10px] uppercase text-bone-muted dark:text-obsidian-muted block font-bold">
              Select Client / Couple:
            </label>
            <select
              value={selectedClientForLink.id}
              onChange={(e) => {
                const found = clients.find((c) => c.id === e.target.value);
                if (found) setSelectedClientForLink(found);
              }}
              className="w-full p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city})
                </option>
              ))}
            </select>
          </div>

          {/* Direct Link Preview & Copy */}
          <div className="md:col-span-7 flex flex-wrap sm:flex-nowrap gap-2 items-end">
            <div className="w-full">
              <label className="text-[10px] uppercase text-bone-muted dark:text-obsidian-muted block font-bold">
                Unique Review URL:
              </label>
              <input
                type="text"
                readOnly
                value={getFeedbackUrl(selectedClientForLink)}
                className="w-full p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none truncate font-mono text-[11px]"
              />
            </div>

            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2.5 border border-carbon dark:border-white bg-carbon text-bone dark:bg-white dark:text-carbon font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all"
              title="Copy URL only"
            >
              {copiedLink ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>

            <button
              onClick={handleCopyWhatsApp}
              className="px-3.5 py-2.5 bg-[#25D366] text-white font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 hover:bg-[#1ebd5a] transition-all shadow-xs"
              title="Copy pre-formatted WhatsApp text message"
            >
              {copiedMessage ? <Check size={14} /> : <Send size={14} />}
              <span>{copiedMessage ? 'Copied!' : 'WhatsApp Text'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Reviews Feed */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={13} className="absolute left-2.5 top-3 text-bone-muted" />
              <input
                type="text"
                placeholder="Search reviews & highlights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono self-end sm:self-auto">
            <span className="text-[10px] uppercase text-bone-muted">Filter:</span>
            <div className="flex border border-bone-border dark:border-obsidian-border">
              {(['ALL', 5, 4] as const).map((opt) => (
                <button
                  key={String(opt)}
                  onClick={() => setStarFilter(opt)}
                  className={`px-2.5 py-1 text-[10px] uppercase ${
                    starFilter === opt
                      ? 'bg-carbon text-bone dark:bg-white dark:text-carbon font-bold'
                      : 'text-bone-muted hover:text-carbon dark:hover:text-white'
                  }`}
                >
                  {opt === 'ALL' ? 'All' : `${opt}★`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFeedbacks.length === 0 && (
            <div className="p-8 border border-dashed border-bone-border dark:border-obsidian-border text-center space-y-2 col-span-full">
              <MessageSquareQuote size={28} className="mx-auto text-bone-muted dark:text-obsidian-muted opacity-50" />
              <p className="font-serif text-sm uppercase text-carbon dark:text-white font-bold">No Client Reviews Yet</p>
              <p className="text-xs font-mono text-bone-muted dark:text-obsidian-muted">
                Generate and dispatch feedback links to clients above. Verified reviews will stream here automatically.
              </p>
            </div>
          )}
          {filteredFeedbacks.map((fb) => (
            <div
              key={fb.id}
              className="p-5 border border-bone-border dark:border-obsidian-border bg-bone-card dark:bg-obsidian-card flex flex-col justify-between space-y-4 hover:border-carbon dark:hover:border-white transition-all shadow-xs"
            >
              <div className="space-y-3">
                {/* Rating Stars & Social Permission tag */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        className={
                          s <= fb.rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-bone-border dark:text-obsidian-border'
                        }
                      />
                    ))}
                    <span className="text-xs font-mono font-bold ml-1 text-carbon dark:text-white">
                      {fb.rating}.0
                    </span>
                  </div>

                  {fb.allowSocialSharing && (
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                      ✓ Social & Deck Approved
                    </span>
                  )}
                </div>

                {/* Review Text */}
                <p className="font-serif text-sm sm:text-base leading-relaxed text-carbon dark:text-white italic">
                  "{fb.review}"
                </p>

                {/* Highlights */}
                {fb.highlights && (
                  <div className="p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-[11px] font-mono text-bone-muted dark:text-obsidian-muted">
                    <strong className="text-carbon dark:text-white uppercase text-[9.5px] block mb-0.5">
                      Standout Highlight:
                    </strong>
                    {fb.highlights}
                  </div>
                )}
              </div>

              {/* Card Footer: Client Info & Export Button */}
              <div className="pt-3 border-t border-bone-border dark:border-obsidian-border flex items-center justify-between text-xs font-mono">
                <div>
                  <h4 className="font-bold text-carbon dark:text-white">{fb.clientName}</h4>
                  <span className="text-[10px] text-bone-muted dark:text-obsidian-muted">
                    {fb.eventType || 'Wedding Celebration'}
                  </span>
                </div>

                <button
                  onClick={() => setActiveDeckModal(fb)}
                  className="px-3 py-1.5 border border-carbon dark:border-white hover:bg-carbon hover:text-bone dark:hover:bg-white dark:hover:text-carbon transition-all text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5"
                  title="Generate Deck Quote Card"
                >
                  <MessageSquareQuote size={12} />
                  <span>Public Deck Export</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Social & Public Deck Preview Modal */}
      {activeDeckModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-[#0d1210] border-2 border-white p-6 text-white space-y-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#273730] pb-3">
              <span className="font-mono text-xs uppercase tracking-widest text-vermillion font-bold">
                Social Media & Deck Card Generator
              </span>
              <button
                onClick={() => setActiveDeckModal(null)}
                className="text-xs font-mono text-[#8a9e93] hover:text-white"
              >
                [CLOSE]
              </button>
            </div>

            {/* Generated Deck Card Preview */}
            <div
              id="social-quote-card"
              className="p-8 bg-[#141b18] border border-[#273730] relative space-y-5 text-center"
            >
              <div className="flex justify-center text-amber-500 gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={18} className="fill-amber-500" />
                ))}
              </div>

              <p className="font-serif text-lg sm:text-xl italic leading-relaxed text-[#f3f7f4]">
                "{activeDeckModal.review}"
              </p>

              {activeDeckModal.highlights && (
                <p className="text-[11px] font-mono text-emerald-400 tracking-wider">
                  ★ Highlight: {activeDeckModal.highlights}
                </p>
              )}

              <div className="pt-4 border-t border-[#273730]/60 space-y-1">
                <h3 className="font-serif font-black text-base uppercase tracking-widest text-white">
                  {activeDeckModal.clientName}
                </h3>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8a9e93]">
                  VOWS Studio // by Reuben
                </p>
              </div>
            </div>

            <div className="flex gap-3 text-xs font-mono">
              <button
                onClick={() => {
                  const quoteCardText = `"${activeDeckModal.review}"\n\n— ${activeDeckModal.clientName}\nVOWS Studio // @vowsbyreuben`;
                  navigator.clipboard.writeText(quoteCardText);
                  alert('Quote text formatted for Instagram Story / Deck copied to clipboard!');
                }}
                className="flex-1 py-3 bg-white text-black font-bold uppercase tracking-wider hover:bg-vermillion hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Copy size={13} />
                <span>Copy Quote for Deck</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
