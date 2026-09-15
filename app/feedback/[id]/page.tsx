'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Star, CheckCircle, Heart, Camera, Film, Clock, Award, ArrowRight } from 'lucide-react';

export default function ClientFeedbackPage() {
  const params = useParams();
  const clientId = (params?.id as string) || 'client';

  const [clientName, setClientName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [rating, setRating] = useState(5);
  const [photoRating, setPhotoRating] = useState(5);
  const [cinemaRating, setCinemaRating] = useState(5);
  const [punctualityRating, setPunctualityRating] = useState(5);
  const [review, setReview] = useState('');
  const [highlights, setHighlights] = useState('');
  const [allowSocialSharing, setAllowSocialSharing] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!review.trim()) return;

    setIsSubmitting(true);

    const submission = {
      id: `fb-${Date.now()}`,
      clientId,
      clientName: clientName.trim() || 'Valued Couple',
      rating,
      serviceRatings: {
        photography: photoRating,
        cinematography: cinemaRating,
        deliveryPunctuality: punctualityRating,
      },
      review,
      highlights,
      allowSocialSharing,
      createdAt: new Date().toISOString(),
    };

    // Store in localStorage for instant synchronization into studio dashboard
    try {
      const existing = JSON.parse(localStorage.getItem('vows_client_feedback') || '[]');
      existing.unshift(submission);
      localStorage.setItem('vows_client_feedback', JSON.stringify(existing));
    } catch (err) {
      console.warn('Local storage write warning:', err);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#0d1210] text-[#e8eee9] flex flex-col justify-between py-8 sm:py-14 px-4 selection:bg-[#eb3829] selection:text-white">
      {/* Container */}
      <div className="max-w-xl mx-auto w-full">
        {/* Brand Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-white text-black font-serif font-black text-xl mb-3 tracking-widest shadow-lg">
            V
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-black uppercase tracking-[0.25em] text-white">
            VOWS Studio
          </h1>
          <p className="text-[11px] font-mono text-[#8a9e93] uppercase tracking-[0.2em] mt-1">
            Photography & Cinema // by Reuben
          </p>
        </div>

        {isSubmitted ? (
          <div className="p-8 sm:p-10 border border-[#273730] bg-[#141b18] text-center space-y-4 shadow-2xl animate-fadeIn">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle size={28} />
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold uppercase tracking-tight text-white">
              Thank You So Much!
            </h2>
            <p className="text-xs font-mono text-[#a3b8ad] leading-relaxed max-w-md mx-auto">
              Your valuable words mean the world to Reuben and the entire VOWS Studio crew. It was a true honor documenting your special memories.
            </p>
            <div className="pt-4 border-t border-[#273730] flex flex-col sm:flex-row items-center justify-center gap-3 text-xs font-mono">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-white text-black uppercase font-bold tracking-wider hover:bg-[#eb3829] hover:text-white transition-all flex items-center gap-1.5"
              >
                <span>Follow @vowsbyreuben</span>
                <ArrowRight size={13} />
              </a>
            </div>
          </div>
        ) : (
          <div className="border border-[#273730] bg-[#141b18] p-5 sm:p-8 shadow-2xl space-y-6">
            <div className="border-b border-[#273730] pb-4">
              <h2 className="font-serif text-xl sm:text-2xl font-bold uppercase text-white">
                Client Experience Review
              </h2>
              <p className="text-xs font-mono text-[#8a9e93] mt-1">
                Tell us about your celebration and your experience with our team.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 text-xs font-mono">
              {/* Couple / Client Name */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-[#8a9e93] mb-1.5">
                  Your Name / Couple Names *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alveera & Jason"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full p-2.5 bg-[#0a0e0c] border border-[#273730] text-white focus:border-white outline-none transition-colors"
                />
              </div>

              {/* Overall Star Rating */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-[#8a9e93] mb-2">
                  Overall Experience Rating *
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1.5 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        size={26}
                        className={
                          s <= rating
                            ? 'text-[#f59e0b] fill-[#f59e0b]'
                            : 'text-[#364b42] hover:text-[#587567]'
                        }
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-sm text-[#f59e0b]">{rating} / 5 Stars</span>
                </div>
              </div>

              {/* Specific Category Ratings */}
              <div className="p-3.5 bg-[#0d1411] border border-[#273730] space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#a3b8ad] block">
                  Service Breakdown:
                </span>

                {/* Photography */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#cad8d0]">
                    <Camera size={14} className="text-[#eb3829]" />
                    <span>Candid & Stills Quality</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPhotoRating(s)}
                        className={`w-6 h-6 text-[10px] font-bold border transition-colors ${
                          s <= photoRating
                            ? 'bg-white text-black border-white'
                            : 'border-[#273730] text-[#637d71] hover:border-[#486357]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cinematography */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#cad8d0]">
                    <Film size={14} className="text-[#eb3829]" />
                    <span>Cinematic Highlight & Motion</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setCinemaRating(s)}
                        className={`w-6 h-6 text-[10px] font-bold border transition-colors ${
                          s <= cinemaRating
                            ? 'bg-white text-black border-white'
                            : 'border-[#273730] text-[#637d71] hover:border-[#486357]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Punctuality */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#cad8d0]">
                    <Clock size={14} className="text-[#eb3829]" />
                    <span>Crew Demeanor & Timing</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPunctualityRating(s)}
                        className={`w-6 h-6 text-[10px] font-bold border transition-colors ${
                          s <= punctualityRating
                            ? 'bg-white text-black border-white'
                            : 'border-[#273730] text-[#637d71] hover:border-[#486357]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-[#8a9e93] mb-1.5">
                  Your Review / Testimonial *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Share how Reuben and the crew captured your day, your favourite photos, and how you felt looking back at the films..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="w-full p-3 bg-[#0a0e0c] border border-[#273730] text-white focus:border-white outline-none resize-none leading-relaxed transition-colors"
                />
              </div>

              {/* Highlights */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-[#8a9e93] mb-1.5">
                  Standout Moment / Highlight of the Coverage (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. The sunset beach session at Tannirbhavi / drone slow-mo"
                  value={highlights}
                  onChange={(e) => setHighlights(e.target.value)}
                  className="w-full p-2.5 bg-[#0a0e0c] border border-[#273730] text-white focus:border-white outline-none transition-colors"
                />
              </div>

              {/* Social sharing checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer pt-1 text-[11px] text-[#cad8d0] select-none">
                <input
                  type="checkbox"
                  checked={allowSocialSharing}
                  onChange={(e) => setAllowSocialSharing(e.target.checked)}
                  className="mt-0.5 accent-[#eb3829]"
                />
                <span>
                  I give permission to share this review and photos on VOWS Studio social media (@vowsbyreuben) and official studio portfolio deck.
                </span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-white text-black hover:bg-[#eb3829] hover:text-white uppercase font-bold tracking-[0.2em] text-xs transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Submitting Review...</span>
                ) : (
                  <>
                    <span>Submit Feedback</span>
                    <Heart size={14} className="fill-current text-[#eb3829]" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] font-mono text-[#587567] mt-8">
        VOWS Studio // Reuben Serrao // Coastal Karnataka
      </div>
    </div>
  );
}
