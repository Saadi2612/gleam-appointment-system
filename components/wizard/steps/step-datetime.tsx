"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, format, isBefore, isSameDay as isSameDayFn, startOfDay } from "date-fns";
import { motion } from "motion/react";
import { Phone, Sun, Sunset, CalendarX2, Users2, ArrowLeftRight, Layers } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocation, getProvider, getService } from "@/lib/domain";
import { cn, relativeWhen } from "@/lib/utils";
import { MonogramAvatar } from "@/components/monogram-avatar";
import { useI18n } from "@/components/i18n-provider";
import { useBooking } from "@/hooks/use-booking";
import { useStore, useStoreSnapshot } from "@/hooks/use-store";
import type { Slot } from "@/lib/types";
import { WizardShell } from "../wizard-shell";
import { CrossLocationNudge } from "../cross-location-nudge";

export function StepDateTime() {
  const { t } = useI18n();
  const store = useStore();
  const snap = useStoreSnapshot();
  const { state, patch } = useBooking();
  const loc = getLocation(state.locationId!)!;
  const service = getService(state.serviceId!)!;
  const isFamily = state.family.length > 0;

  // ---- closed-day matcher for the calendar ----------------------------
  const today = startOfDay(new Date());
  const disabledMatcher = useMemo(
    () => (date: Date) => {
      if (isBefore(date, today)) return true;
      return !loc.hours[date.getDay()];
    },
    [loc, today],
  );

  const firstOpen = useMemo(() => {
    for (let i = 0; i < 30; i++) {
      const d = addDays(today, i);
      if (loc.hours[d.getDay()]) return d;
    }
    return today;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc]);

  const [selectedDay, setSelectedDay] = useState<Date>(
    state.slot ? startOfDay(new Date(state.slot.start)) : state.emergency ? firstOpen : firstOpen,
  );

  // emergency locks to the first open day
  useEffect(() => {
    if (state.emergency) setSelectedDay(firstOpen);
  }, [state.emergency, firstOpen]);

  // ---- single-patient slots ------------------------------------------
  const day = useMemo(
    () =>
      isFamily
        ? null
        : store.availabilityDay({
            serviceId: service.id,
            locationId: loc.id,
            providerId: state.providerId,
            date: selectedDay,
            emergency: state.emergency,
          }),
    [isFamily, store, snap, service.id, loc.id, state.providerId, selectedDay, state.emergency],
  );

  const groups = useMemo(() => {
    const slots = day?.slots ?? [];
    return {
      morning: slots.filter((s) => new Date(s.start).getHours() < 12),
      afternoon: slots.filter((s) => new Date(s.start).getHours() >= 12),
    };
  }, [day]);

  // ---- family slots -------------------------------------------------
  const familyResult = useMemo(() => {
    if (!isFamily) return null;
    const serviceIds = [service.id, ...state.family.map((m) => m.serviceId)];
    return store.familySlots({
      serviceIds,
      locationId: loc.id,
      withinDays: 21,
      mode: state.familyMode,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFamily, service.id, state.family, loc.id, state.familyMode, store, snap]);

  function pickSlot(slot: Slot) {
    patch({ slot });
  }

  // ================= FAMILY UI =================
  if (isFamily) {
    const people = [
      { name: `${state.patient.firstName || "You"}`, serviceId: service.id },
      ...state.family.map((m) => ({ name: m.firstName || "Family member", serviceId: m.serviceId })),
    ];
    return (
      <WizardShell
        title={t("family.title")}
        subtitle={t("family.subtitle")}
        onContinue={() => {
          if (familyResult) patch({ familySlots: familyResult, slot: familyResult.slots[0] });
        }}
      >
        <div className="mb-4 inline-flex rounded-full border border-border bg-card p-0.5 text-sm">
          {(["concurrent", "back-to-back"] as const).map((m) => (
            <button
              key={m}
              onClick={() => patch({ familyMode: m, familySlots: undefined })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors",
                state.familyMode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "concurrent" ? <Layers className="size-3.5" /> : <ArrowLeftRight className="size-3.5" />}
              {m === "concurrent" ? "Side-by-side" : "Back-to-back"}
            </button>
          ))}
        </div>

        {familyResult ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4"
          >
            <p className="flex items-center gap-2 font-semibold text-primary">
              <Users2 className="size-4" />
              {state.familyMode === "concurrent"
                ? t("family.concurrent", { time: format(new Date(familyResult.start), "EEE MMM d, h:mm a") })
                : t("family.backToBack", { time: format(new Date(familyResult.start), "EEE MMM d, h:mm a") })}
            </p>
            <div className="mt-3 space-y-2">
              {familyResult.slots.map((s, i) => {
                const p = getProvider(s.providerId)!;
                const person = people[i];
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5"
                  >
                    <MonogramAvatar initials={p.initials} size="sm" />
                    <div className="flex-1 text-sm">
                      <p className="font-medium">{person?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getService(person?.serviceId)?.shortName} · Dr. {p.lastName} · Chair {s.chair}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {format(new Date(s.start), "h:mm a")}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No combined opening in the next 3 weeks for this mix — try the other mode or fewer services.
          </div>
        )}
      </WizardShell>
    );
  }

  // ================= SINGLE-PATIENT UI =================
  return (
    <WizardShell
      title={state.emergency ? t("emergency.title") : t("step.datetime.title")}
      subtitle={state.emergency ? t("emergency.subtitle") : t("step.datetime.subtitle")}
    >
      {state.emergency && (
        <a
          href={`tel:${loc.phone.replace(/\D/g, "")}`}
          className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 font-semibold text-accent-foreground shadow-lift"
        >
          <Phone className="size-4" />
          {t("emergency.callNow", { location: loc.shortName })} · {loc.phone}
        </a>
      )}

      <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
        {!state.emergency && (
          <Calendar
            mode="single"
            selected={selectedDay}
            onSelect={(d) => d && setSelectedDay(startOfDay(d))}
            disabled={disabledMatcher}
            startMonth={today}
            className="rounded-2xl border border-border bg-card p-3"
          />
        )}

        <div className="min-w-0">
          <p className="mb-2 text-sm font-medium">
            {state.emergency
              ? isSameDayFn(firstOpen, new Date())
                ? t("emergency.today")
                : t("emergency.soonest", { date: format(firstOpen, "EEEE, MMM d") })
              : format(selectedDay, "EEEE, MMMM d")}
          </p>

          {day?.note && (
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-warning/12 px-2 py-1 text-xs font-medium text-warning-foreground">
              {day.note}
            </p>
          )}

          {!day ? (
            <SlotSkeleton />
          ) : !day.open ? (
            <Empty icon={<CalendarX2 className="size-5" />} text={day.note ?? t("step.datetime.closed")} />
          ) : day.slots.length === 0 ? (
            <Empty
              icon={<CalendarX2 className="size-5" />}
              text={state.emergency ? t("emergency.noSlots") : t("step.datetime.noSlots")}
            />
          ) : (
            <div className="space-y-4">
              {(["morning", "afternoon"] as const).map((part) =>
                groups[part].length ? (
                  <div key={part}>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {part === "morning" ? <Sun className="size-3.5" /> : <Sunset className="size-3.5" />}
                      {t(`step.datetime.${part}`)}
                    </p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {groups[part].map((s) => {
                        const active = state.slot?.start === s.start;
                        return (
                          <button
                            key={s.start}
                            onClick={() => pickSlot(s)}
                            className={cn(
                              "rounded-xl border px-2 py-2.5 text-sm font-medium tabular-nums transition-all",
                              active
                                ? "animate-gleam-pop border-accent bg-accent text-accent-foreground shadow-lift"
                                : "border-border bg-card hover:border-primary/50 hover:bg-secondary",
                            )}
                          >
                            {format(new Date(s.start), "h:mm")}
                            <span className="ml-0.5 text-[10px] opacity-70">
                              {format(new Date(s.start), "a")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null,
              )}
              {state.providerId === "any" && state.slot && (
                <p className="text-xs text-muted-foreground">
                  You'll see Dr. {getProvider(state.slot.providerId)?.lastName} · Chair {state.slot.chair}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {!state.emergency && (
        <CrossLocationNudge
          serviceId={service.id}
          locationId={loc.id}
          providerId={state.providerId}
          onSwitch={(to) => {
            patch({ locationId: to, locationChoice: to, slot: undefined, providerId: "any" });
            const next = store.nextAvailable({
              serviceId: service.id,
              locationId: to,
              providerId: "any",
              withinDays: 60,
            });
            if (next) setSelectedDay(startOfDay(new Date(next.start)));
          }}
        />
      )}
    </WizardShell>
  );
}

function SlotSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-20" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {icon}
      {text}
    </div>
  );
}
