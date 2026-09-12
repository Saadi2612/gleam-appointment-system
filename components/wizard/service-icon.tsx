import {
  Sparkles,
  Stethoscope,
  TriangleAlert,
  Smile,
  AlignHorizontalDistributeCenter,
  Anchor,
  Baby,
  type LucideIcon,
} from "lucide-react";
import type { ServiceIcon as ServiceIconKey } from "@/lib/types";

const MAP: Record<ServiceIconKey, LucideIcon> = {
  sparkles: Sparkles,
  toothbrush: Stethoscope,
  alert: TriangleAlert,
  smile: Smile,
  align: AlignHorizontalDistributeCenter,
  implant: Anchor,
  kids: Baby,
};

export function ServiceIcon({ name, className }: { name: ServiceIconKey; className?: string }) {
  const Icon = MAP[name] ?? Sparkles;
  return <Icon className={className} />;
}
