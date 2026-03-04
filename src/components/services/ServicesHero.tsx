"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useSiteContent } from "@/lib/hooks/useSiteContent";

export default function ServicesHero() {
  const [bgImage, setBgImage] = useState<string | null>(null);
  const { t } = useSiteContent();

  useEffect(() => {
    fetch("/api/site-images", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.services_bg?.imagePath) {
          setBgImage(json.data.services_bg.imagePath);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative h-[35vh] min-h-[260px] bg-gradient-to-br from-[#566668] via-[#637577] to-[#454f50] flex items-end overflow-hidden">
      {bgImage && (
        <>
          <Image
            src={bgImage}
            alt="רקע עמוד שירותים"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
        </>
      )}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-24 w-full">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
          {t("services", "heroTitle", "השירותים שלי")}
        </h1>
        <p className="text-white/70 text-lg">
          {t("services", "heroSubtitle", "מגוון טיפולים מקצועיים המותאמים לצרכים שלכם")}
        </p>
      </div>
    </div>
  );
}
