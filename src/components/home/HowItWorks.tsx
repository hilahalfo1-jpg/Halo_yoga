"use client";

import { Search, CalendarCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Section from "@/components/ui/Section";

const steps = [
  {
    icon: <Search className="h-8 w-8" strokeWidth={1.5} />,
    title: "בחרו שירות",
    description: "עיינו במגוון הטיפולים שלי ובחרו את המתאים לכם ביותר",
  },
  {
    icon: <CalendarCheck className="h-8 w-8" strokeWidth={1.5} />,
    title: "קבעו תור",
    description: "בחרו תאריך ושעה נוחים מתוך הזמנים הפנויים ביומן",
  },
  {
    icon: <Sparkles className="h-8 w-8" strokeWidth={1.5} />,
    title: "הגיעו ותהנו",
    description: "הגיעו לטיפול, תנו לגוף לנוח, וצאו מחודשים ורעננים",
  },
];

export default function HowItWorks() {
  return (
    <Section bg="surface">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
          איך זה עובד?
        </h2>
        <p className="text-text-secondary">שלושה צעדים פשוטים לטיפול מושלם</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
        {/* Connecting line (desktop only) */}
        <div className="hidden md:block absolute top-12 right-[16.67%] left-[16.67%] h-0.5 bg-border" />

        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.15 }}
            className="text-center relative"
          >
            {/* Step number circle */}
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-sm border border-border mb-6">
              <div className="text-primary">{step.icon}</div>
              <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center">
                {index + 1}
              </span>
            </div>

            <h3 className="text-xl font-semibold text-text mb-2">
              {step.title}
            </h3>
            <p className="text-text-secondary text-sm leading-relaxed max-w-xs mx-auto">
              {step.description}
            </p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
