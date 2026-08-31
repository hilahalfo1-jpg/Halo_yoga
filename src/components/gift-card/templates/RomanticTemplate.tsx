import type { GiftCardTemplateProps } from "./types";

const HEARTS = [
  { x: "10%", y: "15%", s: 14, o: 0.5, r: -15 },
  { x: "84%", y: "12%", s: 18, o: 0.45, r: 12 },
  { x: "16%", y: "80%", s: 16, o: 0.4, r: 20 },
  { x: "88%", y: "78%", s: 13, o: 0.5, r: -18 },
  { x: "50%", y: "8%", s: 11, o: 0.35, r: 0 },
];

function Heart({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 21s-7.5-4.6-10-9.2C.3 8.6 1.7 5 5 5c2 0 3.2 1.1 4 2.3C9.8 6.1 11 5 13 5c3.3 0 4.7 3.6 3 6.8C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

export default function RomanticTemplate({
  recipientName,
  senderName,
  serviceName,
  message,
  isRedeemed,
}: GiftCardTemplateProps) {
  const rose = "#d98a9e";

  return (
    <div
      className="relative overflow-hidden rounded-2xl shadow-xl"
      style={{
        background: "linear-gradient(160deg, #fdeef0 0%, #fbe3e8 50%, #f7e7df 100%)",
        aspectRatio: "4/3",
      }}
    >
      {/* Redeemed overlay */}
      {isRedeemed && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10">
          <div className="bg-white/90 backdrop-blur-sm text-gray-600 text-lg font-bold px-8 py-3 rounded-full border-2 border-gray-300 -rotate-12 shadow-lg">
            מומש
          </div>
        </div>
      )}

      {/* Floating hearts */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {HEARTS.map((h, i) => (
          <span
            key={i}
            className="absolute block"
            style={{ left: h.x, top: h.y, opacity: h.o, transform: `rotate(${h.r}deg)` }}
          >
            <Heart size={h.s} color={rose} />
          </span>
        ))}
        {/* Soft floral corner */}
        <svg className="absolute -bottom-4 -left-4 w-28 h-28" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="30" cy="70" r="10" fill="#f3c4ce" opacity="0.5" />
          <circle cx="18" cy="60" r="7" fill="#e8aebd" opacity="0.45" />
          <circle cx="42" cy="62" r="6" fill="#f3c4ce" opacity="0.4" />
          <circle cx="28" cy="56" r="5" fill="#eebccb" opacity="0.4" />
        </svg>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-8 sm:px-16 py-12 sm:py-16 text-center">
        <div className="mb-3" style={{ color: rose }}>
          <Heart size={22} color={rose} />
        </div>
        <p className="text-sm sm:text-base mb-6 sm:mb-8" style={{ color: "#a86b7a" }}>
          הינך מוזמנ/ת ל{serviceName}
        </p>

        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 sm:mb-8 leading-tight"
          style={{
            color: "#9c4a5e",
            fontFamily: "'Frank Ruhl Libre', 'David Libre', 'Noto Serif Hebrew', serif",
          }}
        >
          {recipientName} היקר/ה
        </h1>

        {message && (
          <p
            className="text-sm sm:text-base leading-relaxed max-w-md mb-6 whitespace-pre-line"
            style={{ color: "#9a6b75" }}
          >
            {message}
          </p>
        )}

        {senderName && (
          <p className="text-sm mb-8" style={{ color: rose }}>
            באהבה, {senderName}
          </p>
        )}

        <p
          className="text-xs sm:text-sm tracking-[0.3em] uppercase mt-auto"
          style={{ color: "#b07e8a" }}
        >
          HALO YOGA & MASSAGE
        </p>
      </div>
    </div>
  );
}
