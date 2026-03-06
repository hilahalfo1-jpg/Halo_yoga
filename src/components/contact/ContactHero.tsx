"use client";

import { useSiteContent } from "@/lib/hooks/useSiteContent";

export default function ContactHero() {
  const { t } = useSiteContent();

  return (
    <div className="relative h-[35vh] min-h-[220px] sm:min-h-[260px] bg-gradient-to-br from-[#566668] via-[#637577] to-[#454f50] flex items-end">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 pt-20 sm:pt-24 w-full">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
          {t("contact", "heroTitle", "צור קשר")}
        </h1>
        <p className="text-white/70 text-base md:text-lg">
          {t("contact", "heroSubtitle", "נשמח לשמוע מכם ולענות על כל שאלה")}
        </p>
      </div>
    </div>
  );
}
