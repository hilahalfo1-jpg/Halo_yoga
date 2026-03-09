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
      <div className="w-full max-w-4xl">
        {/* Gift Card - landscape */}
        <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
          {/* Decorative border */}
          <div className="absolute inset-0 border-[10px] sm:border-[14px] border-primary/20 rounded-3xl pointer-events-none z-10" />
          <div className="absolute inset-[5px] sm:inset-[7px] border-2 border-dashed border-primary/30 rounded-[20px] pointer-events-none z-10" />

          {/* Two column layout */}
          <div className="relative h-full flex flex-row">
            {/* Right side - content */}
            <div className="flex-1 flex flex-col justify-center p-6 sm:p-10 md:p-12">
              {/* Logo + title */}
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <Image
                  src="/images/logo.png"
                  alt="HALO"
                  width={50}
                  height={50}
                  className="opacity-80"
                />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-primary leading-tight">
                    Gift Card
                  </h1>
                  <p className="text-text-muted text-xs">Yoga & Massage</p>
                </div>
              </div>

              {/* Recipient */}
              <div className="mb-3 sm:mb-4">
                <p className="text-text-muted text-xs mb-0.5">עבור</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-text">
                  {recipientName}
                </p>
              </div>

              {/* Service */}
              <div className="bg-primary/10 rounded-xl px-4 py-2.5 mb-3 sm:mb-4 inline-block">
                <p className="text-sm sm:text-base font-semibold text-primary-dark">
                  {serviceName}
                </p>
              </div>

              {/* Message */}
              <p className="text-text-secondary leading-relaxed whitespace-pre-line text-sm sm:text-base italic mb-3 sm:mb-4 line-clamp-4">
                &ldquo;{message}&rdquo;
              </p>

              {/* Sender */}
              {senderName && (
                <p className="text-text-muted text-sm">
                  באהבה, <span className="font-medium text-text">{senderName}</span>
                </p>
              )}
            </div>

            {/* Left side - decoration */}
            <div className="hidden sm:flex w-[35%] bg-gradient-to-bl from-primary/10 via-primary/5 to-transparent flex-col items-center justify-center relative">
              {/* Yoga tree pose */}
              <svg width="140" height="180" viewBox="0 0 140 220" className="text-primary/25" fill="currentColor">
                {/* Head */}
                <circle cx="70" cy="28" r="14" />
                {/* Body */}
                <path d="M70 44v70" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
                {/* Arms up */}
                <path d="M70 65c-4-20-20-35-35-38" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
                <path d="M70 65c4-20 20-35 35-38" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
                {/* Left leg straight */}
                <path d="M70 114l-20 55" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
                {/* Right leg bent (tree pose) */}
                <path d="M70 114c8-2 22 5 22 18" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
                <path d="M70 100v14" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
                {/* Ground */}
                <path d="M40 170h25" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>

              {/* Decorative elements */}
              <div className="absolute top-8 left-8 text-primary/15">
                <svg width="40" height="40" viewBox="0 0 50 50" fill="currentColor">
                  <path d="M25 45c-2-5-10-10-18-10c3-3 10-5 15-3c-3-5-10-12-7-20c3 5 8 12 9 17c1-5 6-12 9-17c3 8-4 15-7 20c5-2 12 0 15 3c-8 0-16 5-16 10z" />
                </svg>
              </div>
              <div className="absolute bottom-10 right-6 text-primary/15">
                <svg width="35" height="35" viewBox="0 0 50 50" fill="currentColor">
                  <path d="M25 45c-2-5-10-10-18-10c3-3 10-5 15-3c-3-5-10-12-7-20c3 5 8 12 9 17c1-5 6-12 9-17c3 8-4 15-7 20c5-2 12 0 15 3c-8 0-16 5-16 10z" />
                </svg>
              </div>
              <div className="absolute top-1/2 left-4 text-primary/10">
                <svg width="25" height="25" viewBox="0 0 50 50" fill="currentColor">
                  <circle cx="25" cy="25" r="20" />
                </svg>
              </div>
            </div>
          </div>

          {/* Redeemed badge */}
          {isRedeemed && (
            <div className="absolute top-6 left-6 bg-text-muted/80 text-white text-xs font-bold px-3 py-1 rounded-full -rotate-12 z-20">
              מומש
            </div>
          )}

          {/* Bottom accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-l from-primary/30 via-primary/50 to-primary/30 z-10" />
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
