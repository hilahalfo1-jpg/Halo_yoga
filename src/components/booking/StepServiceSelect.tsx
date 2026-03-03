"use client";

import { Check, Clock } from "lucide-react";
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
  return (
    <div>
      <h2 className="text-2xl font-bold text-text mb-2">בחרו שירות</h2>
      <p className="text-text-secondary mb-6">
        בחרו את הטיפול המתאים לכם
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    </div>
  );
}
