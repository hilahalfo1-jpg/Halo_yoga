"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { THERAPIST_TITLE, CONTACT_PHONE } from "@/lib/constants";
import { useSiteContent } from "@/lib/hooks/useSiteContent";

interface HeroImage {
  imagePath: string;
  alt: string;
}

const SLIDE_INTERVAL = 5000; // 5 seconds

export default function HeroSection() {
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { t } = useSiteContent();

  useEffect(() => {
    fetch("/api/site-images", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.data?.hero)) {
          setHeroImages(json.data.hero);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroImages.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const hasImages = heroImages.length > 0;

  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      {hasImages ? (
        <>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <Image
                src={heroImages[currentIndex].imagePath}
                alt={heroImages[currentIndex].alt || "HALO - יוגה ועיסוי רפואי"}
                fill
                className="object-cover"
                priority={currentIndex === 0}
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-black/45" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#566668] via-[#637577] to-[#454f50]" />
      )}

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="mb-6 bg-white/15 text-white border-white/20 text-sm">
            {THERAPIST_TITLE}
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
        >
          {t("hero", "title", "ריפוי הגוף, שקט הנפש")}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          {t("hero", "subtitle", "טיפולי עיסוי רפואי מקצועיים ושיעורי יוגה מותאמים אישית. גישה הוליסטית המשלבת מגע מרפא, תנועה ונשימה לאיזון גוף ונפש.")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/booking">
            <Button size="lg" className="bg-primary text-white hover:bg-primary-dark text-base">
              {t("hero", "buttonText", "קביעת תור")}
            </Button>
          </Link>
          <a href={`tel:${CONTACT_PHONE.replace(/-/g, "")}`}>
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary text-base">
              {t("hero", "buttonText2", "שיחת ייעוץ")}
            </Button>
          </a>
        </motion.div>
      </div>

      {/* Carousel Dots */}
      {heroImages.length > 1 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-8 h-2.5 bg-white"
                  : "w-2.5 h-2.5 bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`תמונה ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <ChevronDown className="h-6 w-6 text-white/50" />
        </motion.div>
      </motion.div>
    </section>
  );
}
