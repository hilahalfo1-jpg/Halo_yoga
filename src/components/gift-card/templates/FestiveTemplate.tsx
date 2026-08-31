import type { GiftCardTemplateProps } from "./types";

const CONFETTI = [
  { x: "8%", y: "12%", c: "#ff7a9c", r: -20 },
  { x: "22%", y: "6%", c: "#ffd166", r: 15 },
  { x: "40%", y: "10%", c: "#6bd5e1", r: 40 },
  { x: "62%", y: "7%", c: "#a78bfa", r: -30 },
  { x: "80%", y: "11%", c: "#ff9f68", r: 25 },
  { x: "92%", y: "20%", c: "#ff7a9c", r: -10 },
  { x: "6%", y: "78%", c: "#6bd5e1", r: 35 },
  { x: "18%", y: "88%", c: "#a78bfa", r: -25 },
  { x: "48%", y: "90%", c: "#ffd166", r: 10 },
  { x: "74%", y: "86%", c: "#ff9f68", r: -40 },
  { x: "90%", y: "80%", c: "#6bd5e1", r: 20 },
];

export default function FestiveTemplate({
  recipientName,
  senderName,
  serviceName,
  message,
  isRedeemed,
}: GiftCardTemplateProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl shadow-xl"
      style={{
        background: "linear-gradient(135deg, #fff5f7 0%, #fef9ef 50%, #f3f9ff 100%)",
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

      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {CONFETTI.map((p, i) => (
          <span
            key={i}
            className="absolute block w-2.5 h-3.5 rounded-[2px]"
            style={{
              left: p.x,
              top: p.y,
              backgroundColor: p.c,
              transform: `rotate(${p.r}deg)`,
              opacity: 0.85,
            }}
          />
        ))}
        {/* Balloons */}
        <svg className="absolute top-3 right-6 w-12 h-20" viewBox="0 0 60 100" aria-hidden="true">
          <ellipse cx="20" cy="22" rx="16" ry="20" fill="#ff7a9c" opacity="0.85" />
          <ellipse cx="40" cy="30" rx="14" ry="18" fill="#a78bfa" opacity="0.8" />
          <path d="M20 42 Q22 60 30 75" stroke="#cbb58f" strokeWidth="1" fill="none" />
          <path d="M40 48 Q38 62 30 75" stroke="#cbb58f" strokeWidth="1" fill="none" />
        </svg>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-8 sm:px-16 py-12 sm:py-16 text-center">
        <p
          className="text-sm sm:text-base font-semibold tracking-wide mb-2"
          style={{ color: "#e0567a" }}
        >
          🎉 מזל טוב! 🎉
        </p>
        <p className="text-sm sm:text-base mb-6 sm:mb-8" style={{ color: "#7a6f8a" }}>
          הינך מוזמנ/ת ל{serviceName}
        </p>

        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 sm:mb-8 leading-tight"
          style={{
            background: "linear-gradient(90deg, #e0567a, #a78bfa, #f59f4a)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {recipientName}!
        </h1>

        {message && (
          <p
            className="text-sm sm:text-base leading-relaxed max-w-md mb-6 whitespace-pre-line"
            style={{ color: "#6b6275" }}
          >
            {message}
          </p>
        )}

        {senderName && (
          <p className="text-sm mb-8 font-medium" style={{ color: "#e0567a" }}>
            באהבה, {senderName}
          </p>
        )}

        <p
          className="text-xs sm:text-sm tracking-[0.3em] uppercase mt-auto font-semibold"
          style={{ color: "#9a8fb0" }}
        >
          HALO YOGA & MASSAGE
        </p>
      </div>
    </div>
  );
}
