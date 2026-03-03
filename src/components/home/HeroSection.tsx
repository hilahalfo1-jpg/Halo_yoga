"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { THERAPIST_TITLE, CONTACT_PHONE } from "@/lib/constants";

export default function HeroSection() {
  const [heroImage, setHeroImage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/site-images")
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.hero?.imagePath) setHeroImage(json.data.hero.imagePath);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      {heroImage ? (
        <>
          <Image
            src={heroImage}
            alt="HALO - יוגה ועיסוי רפואי"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/50" />
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
          ריפוי הגוף, שקט הנפש
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          טיפולי עיסוי רפואי מקצועיים ושיעורי יוגה מותאמים אישית.
          <br />
          גישה הוליסטית המשלבת מגע מרפא, תנועה ונשימה לאיזון גוף ונפש.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/booking">
            <Button size="lg" className="text-base">
              קביעת תור
            </Button>
          </Link>
          <a href={`tel:${CONTACT_PHONE.replace(/-/g, "")}`}>
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary text-base">
              שיחת ייעוץ
            </Button>
          </a>
        </motion.div>
      </div>

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
