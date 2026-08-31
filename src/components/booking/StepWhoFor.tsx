"use client";

import { User, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

export type BookingMode = "self" | "gift";

interface StepWhoForProps {
  selected: BookingMode | null;
  onSelect: (mode: BookingMode) => void;
}

const OPTIONS: {
  mode: BookingMode;
  title: string;
  description: string;
  Icon: typeof User;
}[] = [
  {
    mode: "self",
    title: "תור לעצמי",
    description: "קביעת תור רגילה — בוחרים שירות, תאריך ושעה",
    Icon: User,
  },
  {
    mode: "gift",
    title: "מתנה למישהו אחר 🎁",
    description: "הזמנת גיפט קארד מעוצב — הילה תיצור איתכם קשר להסדרת התשלום",
    Icon: Gift,
  },
];

export default function StepWhoFor({ selected, onSelect }: StepWhoForProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-text mb-2">למי התור?</h2>
      <p className="text-text-secondary mb-6">
        בחרו אם התור עבורכם או מתנה למישהו שאתם אוהבים
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {OPTIONS.map(({ mode, title, description, Icon }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onSelect(mode)}
            className={cn(
              "w-full min-h-[88px] flex items-center gap-4 p-5 rounded-xl border-2 bg-white text-right transition-all",
              selected === mode
                ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                : "border-border hover:border-primary/40"
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                selected === mode
                  ? "bg-primary text-white"
                  : "bg-surface text-text-muted"
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-text text-lg">{title}</p>
              <p className="text-sm text-text-secondary mt-0.5">
                {description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
