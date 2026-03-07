"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import Section from "@/components/ui/Section";
import Card from "@/components/ui/Card";
import ServiceIcon from "@/components/ui/ServiceIcon";
import { CATEGORY_OPTIONS } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { useSiteContent } from "@/lib/hooks/useSiteContent";
import type { ServiceItem } from "@/types";

interface ServicesGridProps {
  services: ServiceItem[];
  hideTitle?: boolean;
}

export default function ServicesGrid({ services, hideTitle }: ServicesGridProps) {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const { t } = useSiteContent();

  const filtered =
    activeCategory === "ALL"
      ? services
      : services.filter((s) => s.category === activeCategory);

  return (
    <Section id="services">
      {!hideTitle && (
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
            {t("services", "gridTitle", "השירותים שלי")}
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            {t("services", "gridSubtitle", "מגוון טיפולים מקצועיים המותאמים לצרכים האישיים שלכם")}
          </p>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-3 sm:px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeCategory === cat.value
                ? "bg-primary text-white shadow-sm"
                : "bg-surface text-text-secondary hover:bg-surface-alt"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filtered.map((service, index) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Link href={`/services/${service.slug}`}>
              <Card hover className="h-full flex flex-col">
                <div className="text-primary mb-4">
                  <ServiceIcon name={service.icon} />
                </div>
                <h3 className="text-xl font-semibold text-text mb-2">
                  {service.name}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-4 flex-1 line-clamp-2">
                  {service.shortDesc}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-primary font-semibold">
                    החל מ-{formatPrice(service.price)}
                  </span>
                  <span className="text-sm text-primary flex items-center gap-1">
                    פרטים נוספים
                    <ArrowLeft className="h-4 w-4" />
                  </span>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
