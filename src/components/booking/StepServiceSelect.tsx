"use client";

import { useState } from "react";
import { Check, Clock, ChevronDown } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatPrice, formatDuration, cn } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { ServiceItem } from "@/types";

interface StepServiceSelectProps {
  services: ServiceItem[];
  selected: ServiceItem | null;
  onSelect: (service: ServiceItem) => void;
}

export default function StepServiceSelect({
  services,
  selected,
  onSelect,
}: StepServiceSelectProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div>
      <h2 className="text-2xl font-bold text-text mb-2">בחרו שירות</h2>
      <p className="text-text-secondary mb-6">
        בחרו את הטיפול המתאים לכם
      </p>

      {/* Desktop: 3-column grid */}
      <div className="hidden md:grid grid-cols-3 gap-4">
        {services.map((service) => (
          <Card
            key={service.id}
            hover
            onClick={() => onSelect(service)}
            className={cn(
              "relative cursor-pointer transition-all",
              selected?.id === service.id &&
                "ring-2 ring-primary border-primary"
            )}
          >
            {selected?.id === service.id && (
              <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-4 w-4 text-white" />
              </div>
            )}
            <Badge className="mb-3">
              {CATEGORY_LABELS[service.category] || service.category}
            </Badge>
            <h3 className="text-lg font-semibold text-text mb-1">
              {service.name}
            </h3>
            <p className="text-sm text-text-secondary mb-3 line-clamp-2">
              {service.shortDesc}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-text-muted">
                <Clock className="h-4 w-4" />
                {formatDuration(service.duration)}
              </span>
              <span className="font-semibold text-primary">
                {formatPrice(service.price)}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Mobile: dropdown select */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="w-full flex items-center justify-between border border-border rounded-xl px-4 py-3.5 bg-white text-right transition-colors hover:border-primary/40"
        >
          <span className={cn("text-base", selected ? "text-text font-medium" : "text-text-muted")}>
            {selected ? (
              <span className="flex items-center gap-2">
                {selected.name}
                <span className="text-sm text-primary font-semibold">{formatPrice(selected.price)}</span>
              </span>
            ) : (
              "בחרו שירות..."
            )}
          </span>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-text-muted transition-transform",
              mobileOpen && "rotate-180"
            )}
          />
        </button>

        {mobileOpen && (
          <div className="mt-2 border border-border rounded-xl bg-white shadow-lg overflow-hidden divide-y divide-border">
            {services.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => {
                  onSelect(service);
                  setMobileOpen(false);
                }}
                className={cn(
                  "w-full text-right px-4 py-3.5 transition-colors hover:bg-surface",
                  selected?.id === service.id && "bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-2">
                    {selected?.id === service.id && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <span className="font-semibold text-text">{service.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {formatPrice(service.price)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Badge className="text-[10px] px-1.5 py-0">
                    {CATEGORY_LABELS[service.category] || service.category}
                  </Badge>
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {formatDuration(service.duration)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
