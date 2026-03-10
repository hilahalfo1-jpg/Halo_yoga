"use client";

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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8" style={{ backgroundColor: "#f5f0e8" }} dir="rtl">
      <div className="w-full max-w-2xl">
        {/* Gift Card */}
        <div className="relative overflow-hidden" style={{ backgroundColor: "#faf6ee", aspectRatio: "4/3" }}>
          {/* Redeemed overlay */}
          {isRedeemed && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10">
              <div className="bg-white/90 backdrop-blur-sm text-gray-600 text-lg font-bold px-8 py-3 rounded-full border-2 border-gray-300 -rotate-12 shadow-lg">
                מומש
              </div>
            </div>
          )}

          {/* Left botanical decoration */}
          <div className="absolute bottom-0 left-0 w-[35%] h-[70%] pointer-events-none">
            <svg viewBox="0 0 200 400" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Main branch */}
              <path d="M120 400 C110 350, 90 300, 80 250 C70 200, 60 150, 70 100" stroke="#8b9e7e" strokeWidth="2" fill="none" />
              {/* Leaves */}
              <ellipse cx="65" cy="140" rx="18" ry="28" transform="rotate(-20 65 140)" fill="#9aac8b" opacity="0.6" />
              <ellipse cx="90" cy="180" rx="16" ry="25" transform="rotate(15 90 180)" fill="#8b9e7e" opacity="0.5" />
              <ellipse cx="75" cy="230" rx="18" ry="26" transform="rotate(-10 75 230)" fill="#9aac8b" opacity="0.55" />
              <ellipse cx="95" cy="280" rx="15" ry="22" transform="rotate(20 95 280)" fill="#8b9e7e" opacity="0.5" />
              <ellipse cx="85" cy="320" rx="17" ry="24" transform="rotate(-15 85 320)" fill="#9aac8b" opacity="0.45" />
              {/* Small branch */}
              <path d="M80 250 C60 230, 40 220, 20 230" stroke="#8b9e7e" strokeWidth="1.5" fill="none" />
              <ellipse cx="30" cy="225" rx="12" ry="18" transform="rotate(-30 30 225)" fill="#9aac8b" opacity="0.5" />
              {/* Lavender flowers */}
              <circle cx="68" cy="105" r="4" fill="#b8a9c9" opacity="0.7" />
              <circle cx="60" cy="95" r="3.5" fill="#c4b5d4" opacity="0.6" />
              <circle cx="72" cy="92" r="3" fill="#b8a9c9" opacity="0.5" />
              <circle cx="64" cy="82" r="3.5" fill="#c4b5d4" opacity="0.65" />
              <circle cx="55" cy="88" r="2.5" fill="#d4c5e4" opacity="0.5" />
              {/* Second flower cluster */}
              <circle cx="25" cy="218" r="3" fill="#b8a9c9" opacity="0.6" />
              <circle cx="18" cy="210" r="2.5" fill="#c4b5d4" opacity="0.5" />
              {/* Scattered seeds/dots */}
              <circle cx="100" cy="160" r="1.5" fill="#c4a97d" opacity="0.4" />
              <circle cx="110" cy="145" r="1" fill="#c4a97d" opacity="0.3" />
              <circle cx="95" cy="115" r="1.5" fill="#c4a97d" opacity="0.35" />
            </svg>
          </div>

          {/* Right botanical decoration (mirrored) */}
          <div className="absolute bottom-0 right-0 w-[35%] h-[70%] pointer-events-none" style={{ transform: "scaleX(-1)" }}>
            <svg viewBox="0 0 200 400" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <path d="M120 400 C110 350, 90 300, 80 250 C70 200, 60 150, 70 100" stroke="#8b9e7e" strokeWidth="2" fill="none" />
              <ellipse cx="65" cy="140" rx="18" ry="28" transform="rotate(-20 65 140)" fill="#9aac8b" opacity="0.6" />
              <ellipse cx="90" cy="180" rx="16" ry="25" transform="rotate(15 90 180)" fill="#8b9e7e" opacity="0.5" />
              <ellipse cx="75" cy="230" rx="18" ry="26" transform="rotate(-10 75 230)" fill="#9aac8b" opacity="0.55" />
              <ellipse cx="95" cy="280" rx="15" ry="22" transform="rotate(20 95 280)" fill="#8b9e7e" opacity="0.5" />
              <ellipse cx="85" cy="320" rx="17" ry="24" transform="rotate(-15 85 320)" fill="#9aac8b" opacity="0.45" />
              <path d="M80 250 C60 230, 40 220, 20 230" stroke="#8b9e7e" strokeWidth="1.5" fill="none" />
              <ellipse cx="30" cy="225" rx="12" ry="18" transform="rotate(-30 30 225)" fill="#9aac8b" opacity="0.5" />
              <circle cx="68" cy="105" r="4" fill="#b8a9c9" opacity="0.7" />
              <circle cx="60" cy="95" r="3.5" fill="#c4b5d4" opacity="0.6" />
              <circle cx="72" cy="92" r="3" fill="#b8a9c9" opacity="0.5" />
              <circle cx="64" cy="82" r="3.5" fill="#c4b5d4" opacity="0.65" />
              <circle cx="55" cy="88" r="2.5" fill="#d4c5e4" opacity="0.5" />
              <circle cx="25" cy="218" r="3" fill="#b8a9c9" opacity="0.6" />
              <circle cx="18" cy="210" r="2.5" fill="#c4b5d4" opacity="0.5" />
              <circle cx="100" cy="160" r="1.5" fill="#c4a97d" opacity="0.4" />
              <circle cx="110" cy="145" r="1" fill="#c4a97d" opacity="0.3" />
              <circle cx="95" cy="115" r="1.5" fill="#c4a97d" opacity="0.35" />
            </svg>
          </div>

          {/* Center content */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full px-8 sm:px-16 py-12 sm:py-16 text-center">
            {/* Top text */}
            <p className="text-sm sm:text-base tracking-wide mb-2" style={{ color: "#6b6255" }}>
              הינך מוזמנ/ת ל{serviceName}
            </p>
            <p className="text-sm sm:text-base mb-8 sm:mb-10" style={{ color: "#6b6255" }}>
              מתנה
            </p>

            {/* Recipient name - large elegant serif */}
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 sm:mb-8 leading-tight"
              style={{
                color: "#4a3f35",
                fontFamily: "'Frank Ruhl Libre', 'David Libre', 'Noto Serif Hebrew', serif",
              }}
            >
              {recipientName} היקר/ה
            </h1>

            {/* Message */}
            {message && (
              <p
                className="text-sm sm:text-base leading-relaxed max-w-md mb-6 whitespace-pre-line"
                style={{ color: "#7a6f62" }}
              >
                {message}
              </p>
            )}

            {/* Sender */}
            {senderName && (
              <p className="text-sm mb-8" style={{ color: "#8a7f72" }}>
                באהבה, {senderName}
              </p>
            )}

            {/* Brand */}
            <p
              className="text-sm sm:text-base tracking-[0.3em] uppercase mt-auto"
              style={{ color: "#6b6255" }}
            >
              HALOYOGAMASSAGE
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm" style={{ color: "#8a7f72" }}>
          <p>haloyogamassage.com</p>
        </div>
      </div>
    </div>
  );
}
