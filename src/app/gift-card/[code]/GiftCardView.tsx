"use client";

import Image from "next/image";

interface GiftCardViewProps {
  recipientName: string;
  senderName: string | null;
  serviceName: string;
  message: string;
  isRedeemed: boolean;
}

export default function GiftCardView({
  recipientName,
  senderName,
  serviceName,
  message,
  isRedeemed,
}: GiftCardViewProps) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 sm:p-8" dir="rtl">
      <div className="w-full max-w-2xl">
        {/* Gift Card */}
        <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Decorative scalloped border */}
          <div className="absolute inset-0 border-[12px] sm:border-[16px] border-primary/20 rounded-3xl pointer-events-none" />
          <div className="absolute inset-[6px] sm:inset-[8px] border-2 border-dashed border-primary/30 rounded-[20px] pointer-events-none" />

          {/* Content */}
          <div className="relative p-8 sm:p-12">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <Image
                  src="/images/logo.png"
                  alt="HALO"
                  width={80}
                  height={80}
                  className="opacity-80"
                />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-1">
                Gift Card
              </h1>
              <p className="text-text-muted text-sm">Yoga & Massage</p>
            </div>

            {/* Recipient */}
            <div className="text-center mb-6">
              <p className="text-text-muted text-sm mb-1">עבור</p>
              <p className="text-2xl sm:text-3xl font-bold text-text">
                {recipientName}
              </p>
            </div>

            {/* Service */}
            <div className="bg-primary/10 rounded-2xl px-6 py-4 text-center mb-6">
              <p className="text-text-muted text-xs mb-1">שובר עבור</p>
              <p className="text-xl font-semibold text-primary-dark">
                {serviceName}
              </p>
            </div>

            {/* Message */}
            <div className="text-center mb-8">
              <p className="text-text-secondary leading-relaxed whitespace-pre-line text-base sm:text-lg italic">
                &ldquo;{message}&rdquo;
              </p>
            </div>

            {/* Sender */}
            {senderName && (
              <div className="text-center mb-6">
                <p className="text-text-muted text-sm">
                  באהבה, <span className="font-medium text-text">{senderName}</span>
                </p>
              </div>
            )}

            {/* Yoga pose SVG decoration */}
            <div className="flex justify-between items-end">
              <div className="text-primary/20">
                <svg width="80" height="80" viewBox="0 0 100 100" fill="currentColor">
                  {/* Lotus flower */}
                  <path d="M50 85c-3-8-15-15-25-15c5-5 15-8 22-5c-5-8-15-18-10-30c5 8 12 18 13 25c1-7 8-17 13-25c5 12-5 22-10 30c7-3 17 0 22 5c-10 0-22 7-25 15z" />
                  <circle cx="50" cy="40" r="3" />
                </svg>
              </div>
              <div className="text-primary/20">
                <svg width="100" height="100" viewBox="0 0 120 120" fill="currentColor">
                  {/* Yoga tree pose */}
                  <circle cx="60" cy="18" r="8" />
                  <path d="M60 28c0 0-2 12-2 20c-8-6-18-4-22-2c4-4 12-8 18-6c-1-4-1-8 0-12z" />
                  <path d="M60 28c0 0 2 12 2 20c8-6 18-4 22-2c-4-4-12-8-18-6c1-4 1-8 0-12z" />
                  <path d="M58 48v30" stroke="currentColor" strokeWidth="3" fill="none" />
                  <path d="M62 48v30" stroke="currentColor" strokeWidth="3" fill="none" />
                  <path d="M52 78h16" stroke="currentColor" strokeWidth="2" fill="none" />
                  <path d="M68 55c4-8 12-10 16-8" stroke="currentColor" strokeWidth="2" fill="none" />
                  <path d="M52 55c-4-8-12-10-16-8" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </div>
            </div>

            {/* Redeemed badge */}
            {isRedeemed && (
              <div className="absolute top-6 left-6 bg-text-muted/80 text-white text-xs font-bold px-3 py-1 rounded-full -rotate-12">
                מומש
              </div>
            )}
          </div>

          {/* Bottom decorative leaves */}
          <div className="h-3 bg-gradient-to-l from-primary/30 via-primary/50 to-primary/30" />
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-text-muted text-sm">
          <p>HALO Yoga & Massage</p>
          <p className="mt-1">haloyogamassage.com</p>
        </div>
      </div>
    </div>
  );
}
