import type { ServiceCategory } from "./types";

/** color-coding for the operatory board + schedule, by service category */
export const CATEGORY_STYLE: Record<
  ServiceCategory,
  { bar: string; soft: string; text: string; label: string }
> = {
  general: { bar: "bg-[oklch(0.44_0.058_205)]", soft: "bg-[oklch(0.44_0.058_205)]/[0.14]", text: "text-[oklch(0.4_0.06_205)]", label: "General" },
  cosmetic: { bar: "bg-[oklch(0.55_0.16_300)]", soft: "bg-[oklch(0.55_0.16_300)]/[0.14]", text: "text-[oklch(0.5_0.16_300)]", label: "Cosmetic" },
  surgical: { bar: "bg-[oklch(0.55_0.17_25)]", soft: "bg-[oklch(0.55_0.17_25)]/[0.14]", text: "text-[oklch(0.52_0.17_25)]", label: "Surgical" },
  ortho: { bar: "bg-[oklch(0.7_0.15_85)]", soft: "bg-[oklch(0.7_0.15_85)]/[0.14]", text: "text-[oklch(0.5_0.12_85)]", label: "Ortho" },
  pediatric: { bar: "bg-[oklch(0.62_0.14_155)]", soft: "bg-[oklch(0.62_0.14_155)]/[0.14]", text: "text-[oklch(0.5_0.13_155)]", label: "Pediatric" },
  urgent: { bar: "bg-[oklch(0.62_0.19_30)]", soft: "bg-[oklch(0.62_0.19_30)]/[0.14]", text: "text-[oklch(0.55_0.19_30)]", label: "Urgent" },
};
