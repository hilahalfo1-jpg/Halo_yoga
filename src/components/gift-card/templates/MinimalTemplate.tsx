import type { GiftCardTemplateProps } from "./types";

export default function MinimalTemplate({
  recipientName,
  senderName,
  serviceName,
  message,
  isRedeemed,
}: GiftCardTemplateProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl shadow-xl border"
      style={{ backgroundColor: "#fbfbfa", borderColor: "#e7e5e1", aspectRatio: "4/3" }}
    >
      {/* Redeemed overlay */}
      {isRedeemed && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/5">
          <div className="bg-white/90 backdrop-blur-sm text-gray-500 text-lg font-medium px-8 py-3 rounded-full border border-gray-300 -rotate-12 shadow">
            מומש
          </div>
        </div>
      )}

      {/* Thin frame line */}
      <div
        className="absolute inset-4 sm:inset-6 rounded-xl border pointer-events-none"
        style={{ borderColor: "#e2e0db" }}
        aria-hidden="true"
      />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-10 sm:px-20 py-12 sm:py-16 text-center">
        <p
          className="text-[11px] sm:text-xs tracking-[0.35em] uppercase mb-10 sm:mb-12"
          style={{ color: "#9a978f" }}
        >
          GIFT — מתנה
        </p>

        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-light mb-6 sm:mb-8 leading-tight"
          style={{ color: "#2a2926", letterSpacing: "0.01em" }}
        >
          {recipientName}
        </h1>

        <div className="w-10 h-px mb-6" style={{ backgroundColor: "#cfccc5" }} aria-hidden="true" />

        <p className="text-sm sm:text-base mb-6" style={{ color: "#5c5a54" }}>
          {serviceName}
        </p>

        {message && (
          <p
            className="text-sm leading-relaxed max-w-sm mb-6 whitespace-pre-line"
            style={{ color: "#7d7a73" }}
          >
            {message}
          </p>
        )}

        {senderName && (
          <p className="text-xs sm:text-sm mb-8" style={{ color: "#9a978f" }}>
            {senderName}
          </p>
        )}

        <p
          className="text-[10px] sm:text-xs tracking-[0.3em] uppercase mt-auto"
          style={{ color: "#a8a59d" }}
        >
          HALO YOGA & MASSAGE
        </p>
      </div>
    </div>
  );
}
