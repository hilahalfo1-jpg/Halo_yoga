import { cn } from "@/lib/utils";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  bg?: "default" | "surface" | "surface-alt";
}

const bgStyles = {
  default: "bg-bg",
  surface: "bg-surface",
  "surface-alt": "bg-surface-alt",
};

export default function Section({ children, className, id, bg = "default" }: SectionProps) {
  return (
    <section
      id={id}
      className={cn("py-10 md:py-16 lg:py-24", bgStyles[bg], className)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </section>
  );
}
