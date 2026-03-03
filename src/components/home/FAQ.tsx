"use client";

import Section from "@/components/ui/Section";
import Accordion from "@/components/ui/Accordion";
import { FAQ_ITEMS } from "@/lib/constants";

export default function FAQ() {
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

        <Accordion items={FAQ_ITEMS} />
      </div>
    </Section>
  );
}
