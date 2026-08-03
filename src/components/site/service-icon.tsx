import {
  Building2,
  ShieldCheck,
  FileSearch,
  Landmark,
  MapPin,
  TriangleAlert,
  Radar,
  Files,
  Eye,
  Scale,
  type LucideIcon,
} from "lucide-react";

const map: Record<string, LucideIcon> = {
  building: Building2,
  "shield-check": ShieldCheck,
  "file-search": FileSearch,
  landmark: Landmark,
  "map-pin": MapPin,
  "alert-triangle": TriangleAlert,
  radar: Radar,
  files: Files,
  eye: Eye,
  scale: Scale,
};

export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = map[name] ?? Files;
  return <Icon className={className} aria-hidden />;
}
