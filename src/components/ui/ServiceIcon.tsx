"use client";

import {
  Hand,
  Flower2,
  Leaf,
  TreePine,
  Sprout,
  Mountain,
  Sun,
  Moon,
  Waves,
  Wind,
  Droplets,
  Heart,
  HeartHandshake,
  Sparkles,
  Star,
  Gem,
  Feather,
  Flame,
  Shell,
  Activity,
  Dumbbell,
  Footprints,
  Users,
  User,
  Baby,
  CloudSun,
  Sunrise,
  Bird,
  CircleDot,
  Orbit,
  type LucideProps,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  Hand,
  Flower2,
  Leaf,
  TreePine,
  Sprout,
  Mountain,
  Sun,
  Moon,
  Waves,
  Wind,
  Droplets,
  Heart,
  HeartHandshake,
  Sparkles,
  Star,
  Gem,
  Feather,
  Flame,
  Shell,
  Activity,
  Dumbbell,
  Footprints,
  Users,
  User,
  Baby,
  CloudSun,
  Sunrise,
  Bird,
  CircleDot,
  Orbit,
};

interface ServiceIconProps {
  name?: string | null;
  className?: string;
  strokeWidth?: number;
}

export default function ServiceIcon({
  name,
  className = "h-8 w-8",
  strokeWidth = 1.5,
}: ServiceIconProps) {
  const IconComponent = name ? iconMap[name] : null;
  if (!IconComponent) {
    return <Hand className={className} strokeWidth={strokeWidth} />;
  }
  return <IconComponent className={className} strokeWidth={strokeWidth} />;
}

export { iconMap };
