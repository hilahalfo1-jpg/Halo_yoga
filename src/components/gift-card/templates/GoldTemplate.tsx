import type { GiftCardTemplateProps } from "./types";

export default function GoldTemplate({
  recipientName,
  senderName,
  serviceName,
  message,
  isRedeemed,
}: GiftCardTemplateProps) {
  const gold = "#d4af6a";
  const goldLight = "#e8cd8f";

  return (
    <div
      className="relative overflow-hidden rounded-2xl shadow-2xl"
      style={{
        background: "radial-gradient(circle at 30% 20%, #2a2620 0%, #16130f 70%)",
        aspectRatio: "4/3",
      }}
    >
      {/* Redeemed overlay */}
      {isRedeemed && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
          <div className="bg-black/60 backdrop-blur-sm text-lg font-bold px-8 py-3 rounded-full border-2 -rotate-12 shadow-lg" style={{ color: goldLight, borderColor: gold }}>
            מומש
          </div>
        </div>
      )}

      {/* Gold double frame */}
      <div
        className="absolute inset-3 sm:inset-5 rounded-xl border-2 pointer-events-none"
        style={{ borderColor: gold, opacity: 0.65 }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-[18px] sm:inset-7 rounded-lg border pointer-events-none"
        style={{ borderColor: gold, opacity: 0.3 }}
        aria-hidden="true"
      />

      {/* Corner flourishes */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <span className="absolute top-6 left-6 sm:top-8 sm:left-8 text-2xl" style={{ color: gold }}>✦</span>
        <span className="absolute top-6 right-6 sm:top-8 sm:right-8 text-2xl" style={{ color: gold }}>✦</span>
        <span className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 text-2xl" style={{ color: gold }}>✦</span>
        <span className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 text-2xl" style={{ color: gold }}>✦</span>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-10 sm:px-20 py-12 sm:py-16 text-center">
        <p
          className="text-xs sm:text-sm tracking-[0.4em] uppercase mb-2"
          style={{ color: goldLight }}
        >
          מתנה
        </p>
        <p className="text-sm sm:text-base mb-8 sm:mb-10" style={{ color: "#c9bda6" }}>
          הינך מוזמנ/ת ל{serviceName}
        </p>

        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 sm:mb-8 leading-tight"
          style={{
            background: `linear-gradient(180deg, ${goldLight}, ${gold})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontFamily: "'Frank Ruhl Libre', 'David Libre', 'Noto Serif Hebrew', serif",
          }}
        >
          {recipientName} היקר/ה
        </h1>

        {message && (
          <p
            className="text-sm sm:text-base leading-relaxed max-w-md mb-6 whitespace-pre-line"
            style={{ color: "#d8cdb8" }}
          >
            {message}
          </p>
        )}

        {senderName && (
          <p className="text-sm mb-8" style={{ color: gold }}>
            באהבה, {senderName}
          </p>
        )}

        <p
          className="text-xs sm:text-sm tracking-[0.35em] uppercase mt-auto"
          style={{ color: goldLight }}
        >
          HALO YOGA & MASSAGE
        </p>
      </div>
    </div>
  );
}
