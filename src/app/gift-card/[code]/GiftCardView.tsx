"use client";

import Link from "next/link";
import BotanicalTemplate from "@/components/gift-card/templates/BotanicalTemplate";
import MinimalTemplate from "@/components/gift-card/templates/MinimalTemplate";
import FestiveTemplate from "@/components/gift-card/templates/FestiveTemplate";
import GoldTemplate from "@/components/gift-card/templates/GoldTemplate";
import RomanticTemplate from "@/components/gift-card/templates/RomanticTemplate";
import type { GiftCardTemplateProps } from "@/components/gift-card/templates/types";

interface GiftCardViewProps extends GiftCardTemplateProps {
  template?: string;
  isExpired?: boolean;
  expiresAt?: string | null;
}

const TEMPLATES: Record<
  string,
  (props: GiftCardTemplateProps) => JSX.Element
> = {
  botanical: BotanicalTemplate,
  minimal: MinimalTemplate,
  festive: FestiveTemplate,
  gold: GoldTemplate,
  romantic: RomanticTemplate,
};

export default function GiftCardView({
  recipientName,
  senderName,
  serviceName,
  message,
  isRedeemed,
  template,
  isExpired = false,
  expiresAt,
}: GiftCardViewProps) {
  const TemplateComponent = TEMPLATES[template ?? "botanical"] ?? BotanicalTemplate;

  const expiryDisplay = expiresAt
    ? new Date(expiresAt).toLocaleDateString("he-IL", {
        timeZone: "Asia/Jerusalem",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-white" dir="rtl">
      <div className="w-full max-w-2xl">
        {/* Gift Card */}
        <div className="relative">
          <TemplateComponent
            recipientName={recipientName}
            senderName={senderName}
            serviceName={serviceName}
            message={message}
            isRedeemed={isRedeemed}
          />

          {/* Expired overlay (same styling as the redeemed overlay) */}
          {isExpired && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/10">
              <div className="bg-white/90 backdrop-blur-sm text-gray-600 text-lg font-bold px-8 py-3 rounded-full border-2 border-gray-300 -rotate-12 shadow-lg">
                פג תוקף
              </div>
            </div>
          )}
        </div>

        {/* Booking CTA + Footer */}
        <div className="text-center mt-6 space-y-4">
          {!isRedeemed && !isExpired && expiryDisplay && (
            <p className="text-sm" style={{ color: "#8a7f72" }}>
              בתוקף עד {expiryDisplay}
            </p>
          )}
          {!isRedeemed && !isExpired && (
            <Link
              href="/booking"
              className="inline-block bg-secondary text-white hover:bg-secondary-dark transition-colors duration-200 rounded-lg px-8 py-3 text-base font-medium shadow-sm"
            >
              לקביעת התור שלך
            </Link>
          )}
          <p className="text-sm" style={{ color: "#8a7f72" }}>
            <Link href="/" className="hover:underline" style={{ color: "#8a7f72" }}>
              haloyogamassage.com
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
