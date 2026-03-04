"use client";

import Section from "@/components/ui/Section";
import Accordion from "@/components/ui/Accordion";
import { FAQ_ITEMS } from "@/lib/constants";
import { useSiteContent } from "@/lib/hooks/useSiteContent";

export default function FAQ() {
  const { content } = useSiteContent();

  // Build FAQ items from dynamic content, fallback to constants
  const faqSection = content.faq;
  let faqItems = FAQ_ITEMS;

  if (faqSection) {
    const dynamicFaq: { question: string; answer: string }[] = [];
    const keys = Object.keys(faqSection)
      .filter((k) => k.startsWith("q_"))
      .sort((a, b) => {
        const aNum = parseInt(a.replace("q_", ""), 10);
        const bNum = parseInt(b.replace("q_", ""), 10);
        return aNum - bNum;
      });

    for (const qKey of keys) {
      const idx = qKey.replace("q_", "");
      const question = faqSection[qKey];
      const answer = faqSection[`a_${idx}`] || "";
      if (question) {
        dynamicFaq.push({ question, answer });
      }
    }

    if (dynamicFaq.length > 0) {
      faqItems = dynamicFaq;
    }
  }

  return (
    <Section>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
            שאלות נפוצות
          </h2>
          <p className="text-text-secondary">
            תשובות לשאלות הנפוצות ביותר שאנחנו מקבלים
          </p>
        </div>

        <Accordion items={faqItems} />
      </div>
    </Section>
  );
}
