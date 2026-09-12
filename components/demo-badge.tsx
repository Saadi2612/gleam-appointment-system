"use client";

import { FlaskConical, Command } from "lucide-react";
import { useI18n } from "./i18n-provider";

export function DemoBadge() {
  const { t } = useI18n();
  return (
    <div className="pointer-events-none fixed left-3 z-30 flex items-center gap-2"
      style={{ bottom: "calc(0.75rem + var(--tour-offset, 0rem))" }}>
      <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/15 px-2.5 py-1 text-[11px] font-medium text-warning-foreground shadow-soft backdrop-blur">
        <FlaskConical className="size-3" />
        {t("demo.badge")}
      </span>
      <span className="pointer-events-auto hidden items-center gap-1 rounded-full border border-border bg-card/90 px-2 py-1 text-[11px] text-muted-foreground shadow-soft backdrop-blur sm:inline-flex">
        <Command className="size-3" />K controls
      </span>
    </div>
  );
}
