"use client";

import Link from "next/link";
import { Gift } from "lucide-react";
import { motion } from "framer-motion";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import { useSiteContent } from "@/lib/hooks/useSiteContent";

export default function GiftCardPromo() {
  const { t } = useSiteContent();

  return (
    <Section bg="surface-alt">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-2xl mx-auto"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white shadow-sm border border-border mb-6">
          <Gift className="h-8 w-8 text-primary" strokeWidth={1.5} />
        </div>

        <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
          {t("gift_promo", "title", "מתנה שמרגישים 🎁")}
        </h2>
        <p className="text-text-secondary leading-relaxed mb-8">
          {t("gift_promo", "subtitle", "פנקו מישהו שאתם אוהבים בגיפט קארד לטיפול או שיעור — הילה תכין כרטיס מתנה מעוצב אישית")}
        </p>

        <Link href="/booking?gift=1">
          <Button size="lg">
            {t("gift_promo", "buttonText", "להזמנת גיפט קארד")}
          </Button>
        </Link>
      </motion.div>
    </Section>
  );
}
