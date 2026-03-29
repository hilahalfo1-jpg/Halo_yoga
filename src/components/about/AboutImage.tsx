import Image from "next/image";
import { Heart } from "lucide-react";

interface AboutImageProps {
  imagePath: string | null;
}

export default function AboutImage({ imagePath }: AboutImageProps) {
  return (
    <div className="aspect-square sm:aspect-[3/4] rounded-2xl bg-gradient-to-br from-primary-light/20 to-secondary/20 flex items-center justify-center lg:sticky lg:top-24 overflow-hidden relative">
      {imagePath ? (
        <Image
          src={imagePath}
          alt="הילה - מעסה רפואית ומורה ליוגה"
          fill
          sizes="(max-width: 1024px) 100vw, 40vw"
          className="object-cover rounded-2xl"
        />
      ) : (
        <div className="text-center p-4 sm:p-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Heart className="h-12 w-12 text-primary" strokeWidth={1} />
          </div>
          <p className="text-text-muted text-sm">תמונה תתווסף בקרוב</p>
        </div>
      )}
    </div>
  );
}
