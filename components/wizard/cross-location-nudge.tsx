"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { Car, ArrowRight, CalendarCheck2 } from "lucide-react";
import { getLocation } from "@/lib/domain";
import { relativeWhen } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { useStore, useStoreSnapshot } from "@/hooks/use-store";
import type { LiveLocationId, ProviderId } from "@/lib/types";

/**
 * Shown when the chosen office's next opening is 8+ days out and the other
 * office can see the patient meaningfully sooner. Keeps both schedules level
 * and stops a long wait from turning into a lost patient.
 */
export function CrossLocationNudge({
  serviceId,
  locationId,
  providerId,
  onSwitch,
}: {
  serviceId: string;
  locationId: LiveLocationId;
  providerId?: ProviderId | "any";
  onSwitch: (to: LiveLocationId) => void;
}) {
  const { lang } = useI18n();
  const store = useStore();
  const snap = useStoreSnapshot();

  const suggestion = useMemo(
    () => store.crossLocationSuggestion({ serviceId, locationId, providerId }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serviceId, locationId, providerId, store, snap],
  );

  if (!suggestion) return null;

  const to = getLocation(suggestion.to)!;
  const from = getLocation(suggestion.from)!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 overflow-hidden rounded-2xl border border-accent/35 bg-accent/[0.06]"
    >
      <div className="flex items-start gap-3 p-4">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Car className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {lang === "es"
              ? `${to.shortName} tiene una cita ${relativeWhen(suggestion.betterSlot.start, { withTime: false }).toLowerCase()}`
              : `${to.shortName} has an opening ${relativeWhen(suggestion.betterSlot.start, { withTime: false })}`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {lang === "es"
              ? `${suggestion.daysSaved} días antes que ${from.shortName} — y solo ${suggestion.extraDriveMinutes} minutos más de camino.`
              : `${suggestion.daysSaved} days sooner than ${from.shortName} — and only ${suggestion.extraDriveMinutes} minutes further.`}
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-semibold text-success">
            <CalendarCheck2 className="size-3" />
            {relativeWhen(suggestion.betterSlot.start)}
          </p>
        </div>
        <button
          onClick={() => onSwitch(suggestion.to)}
          className="shrink-0 self-center rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
        >
          {lang === "es" ? "Cambiar" : "Switch"}
          <ArrowRight className="ml-1 inline size-3" />
        </button>
      </div>
    </motion.div>
  );
}
