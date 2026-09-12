"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { ChevronLeft, ShieldCheck, CalendarCheck2, Loader2 } from "lucide-react";
import { LOCATIONS, SERVICES, getProvider } from "@/lib/domain";
import { cn, relativeWhen } from "@/lib/utils";
import { GleamLogo } from "@/components/gleam-logo";
import { ServiceIcon } from "@/components/wizard/service-icon";
import { useStore, useStoreSnapshot, useHydrated } from "@/hooks/use-store";
import type { LiveLocationId, Slot } from "@/lib/types";

/**
 * The compact widget as it would render inside the practice's own site.
 * Same store, same availability engine as the full flow — a real embed would
 * mount exactly this into a host page's div.
 */
export function EmbeddedBooking() {
  const store = useStore();
  const snap = useStoreSnapshot();
  const hydrated = useHydrated();
  const router = useRouter();

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<LiveLocationId | null>(null);

  const slots = useMemo(() => {
    if (!serviceId || !locationId) return [];
    const out: Slot[] = [];
    const days = store.availabilityRange({
      serviceId,
      locationId,
      providerId: "any",
      from: new Date(),
      days: 10,
    });
    for (const d of days) {
      out.push(...d.slots.slice(0, 3));
      if (out.length >= 6) break;
    }
    return out.slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, locationId, store, snap]);

  function go(slot?: Slot) {
    const q = new URLSearchParams();
    if (serviceId) q.set("service", serviceId);
    if (locationId) q.set("location", locationId);
    q.set("via", "embed");
    if (slot) q.set("slot", slot.start);
    router.push(`/book?${q.toString()}`);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      {/* widget header */}
      <div className="flex items-center gap-2 border-b border-neutral-200 bg-[oklch(0.98_0.006_95)] px-4 py-3">
        {(serviceId || locationId) && (
          <button
            onClick={() => (locationId ? setLocationId(null) : setServiceId(null))}
            className="-ml-1 rounded-md p-1 text-neutral-500 hover:bg-neutral-100"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
        <GleamLogo showWordmark={false} />
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-neutral-900">Book an appointment</p>
          <p className="text-[11px] text-neutral-500">Real-time openings · takes under a minute</p>
        </div>
      </div>

      <div className="min-h-[268px] p-4">
        <AnimatePresence mode="wait">
          {/* step 1 — service */}
          {!serviceId && (
            <motion.div key="svc" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <p className="mb-2 text-[13px] font-medium text-neutral-700">What brings you in?</p>
              <div className="grid gap-1.5">
                {SERVICES.slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setServiceId(s.id)}
                    className="flex items-center gap-2.5 rounded-lg border border-neutral-200 px-3 py-2 text-left transition-colors hover:border-[oklch(0.44_0.058_205)] hover:bg-neutral-50"
                  >
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-md",
                        s.emergency
                          ? "bg-[oklch(0.7_0.16_41)]/15 text-[oklch(0.62_0.17_41)]"
                          : "bg-[oklch(0.44_0.058_205)]/10 text-[oklch(0.44_0.058_205)]",
                      )}
                    >
                      <ServiceIcon name={s.icon} className="size-3.5" />
                    </span>
                    <span className="flex-1 text-[13px] font-medium text-neutral-800">{s.shortName}</span>
                    <span className="text-[11px] text-neutral-400">{s.durationMin}m</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* step 2 — location */}
          {serviceId && !locationId && (
            <motion.div key="loc" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <p className="mb-2 text-[13px] font-medium text-neutral-700">Which office?</p>
              <div className="grid gap-1.5">
                {LOCATIONS.map((l) => {
                  const next = hydrated
                    ? store.nextAvailable({ serviceId, locationId: l.id, providerId: "any", withinDays: 45 })
                    : null;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setLocationId(l.id)}
                      className="rounded-lg border border-neutral-200 px-3 py-2.5 text-left transition-colors hover:border-[oklch(0.44_0.058_205)] hover:bg-neutral-50"
                    >
                      <p className="text-[13px] font-medium text-neutral-800">{l.shortName}</p>
                      <p className="text-[11px] text-neutral-500">{l.address}</p>
                      {next && (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                          <CalendarCheck2 className="size-2.5" />
                          Next: {relativeWhen(next.start)}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* step 3 — slots */}
          {serviceId && locationId && (
            <motion.div key="slots" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <p className="mb-2 text-[13px] font-medium text-neutral-700">Soonest openings</p>
              {!hydrated ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="size-4 animate-spin text-neutral-400" />
                </div>
              ) : slots.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-neutral-500">
                  Nothing online in the next 10 days — call us and we'll fit you in.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {slots.map((s) => (
                    <button
                      key={s.start}
                      onClick={() => go(s)}
                      className="rounded-lg border border-neutral-200 px-2 py-2 text-left transition-colors hover:border-[oklch(0.7_0.16_41)] hover:bg-[oklch(0.7_0.16_41)]/[0.06]"
                    >
                      <p className="text-[12px] font-semibold tabular-nums text-neutral-800">
                        {format(new Date(s.start), "EEE MMM d")}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        {format(new Date(s.start), "h:mm a")} · Dr. {getProvider(s.providerId)?.lastName}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => go()}
                className="mt-3 w-full rounded-lg bg-[oklch(0.7_0.16_41)] px-3 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                See all available times
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-1.5 border-t border-neutral-200 bg-[oklch(0.98_0.006_95)] px-4 py-2 text-[10px] text-neutral-500">
        <ShieldCheck className="size-3" />
        Secure · most PPO insurance accepted
      </div>
    </div>
  );
}
