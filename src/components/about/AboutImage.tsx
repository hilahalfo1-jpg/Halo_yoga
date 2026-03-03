"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";

export default function AboutImage() {
  const [imagePath, setImagePath] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/site-images")
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.about?.imagePath) setImagePath(json.data.about.imagePath);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-primary-light/20 to-secondary/20 flex items-center justify-center sticky top-24 overflow-hidden relative">
      {imagePath ? (
        <Image
          src={imagePath}
          alt="הילה - מעסה רפואית ומורה ליוגה"
          fill
          className="object-cover rounded-2xl"
        />
      ) : (
        <div className="text-center p-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Heart className="h-12 w-12 text-primary" strokeWidth={1} />
          </div>
          <p className="text-text-muted text-sm">תמונה תתווסף בקרוב</p>
        </div>
      )}
    </div>
  );
}
