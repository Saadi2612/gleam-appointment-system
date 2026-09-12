"use client";

import { useMemo } from "react";
import { MapPin, Navigation, CalendarCheck2, Sparkles } from "lucide-react";
import { LOCATIONS } from "@/lib/domain";
import { hoursSummary, relativeWhen, cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { useBooking } from "@/hooks/use-booking";
import { useStore, useStoreSnapshot } from "@/hooks/use-store";
import { WizardShell } from "../wizard-shell";
import { SelectCard } from "../select-card";

const DISTANCE: Record<string, string> = { "atlantic-beach": "3.4", "bartram-park": "12.1" };

export function StepLocation() {
  const { t } = useI18n();
  const store = useStore();
  const snap = useStoreSnapshot();
  const { state, patch, goNext } = useBooking();
  const serviceId = state.serviceId ?? "routine-cleaning";

  const nextByLoc = useMemo(() => {
    const map: Record<string, ReturnType<typeof store.nextAvailable>> = {};
    for (const l of LOCATIONS) {
      map[l.id] = store.nextAvailable({
        serviceId,
        locationId: l.id,
        providerId: "any",
        emergency: state.emergency,
        withinDays: state.emergency ? 3 : 45,
      });
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, state.emergency, store, snap]);

  const soonest = useMemo(
    () =>
      store.soonestAnywhere({
        serviceId,
        providerId: "any",
        emergency: state.emergency,
        withinDays: state.emergency ? 3 : 45,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serviceId, state.emergency, store, snap],
  );

  function chooseLocation(id: "atlantic-beach" | "bartram-park") {
    patch({ locationChoice: id, locationId: id, slot: undefined, familySlots: undefined });
    setTimeout(goNext, 220);
  }
  function chooseEither() {
    if (!soonest) return;
    patch({
      locationChoice: "either",
      locationId: soonest.locationId,
      providerId: "any",
      slot: undefined,
      familySlots: undefined,
    });
    setTimeout(goNext, 220);
  }

  return (
    <WizardShell title={t("step.location.title")} subtitle={t("step.location.subtitle")}>
      <div className="space-y-3">
        {LOCATIONS.map((l) => {
          const next = nextByLoc[l.id];
          const selected = state.locationChoice === l.id;
          return (
            <SelectCard key={l.id} selected={selected} onClick={() => chooseLocation(l.id)}>
              <div className="pr-6">
                <p className="font-semibold">{l.name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  {l.address}, {l.city}, {l.state} {l.zip}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Navigation className="size-3.5" />
                  {t("step.location.distance", { mi: DISTANCE[l.id] })} · {hoursSummary(l.hours)[0]}
                </p>
                <div className="mt-3">
                  {next ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-xs font-semibold text-success">
                      <CalendarCheck2 className="size-3.5" />
                      {t("step.location.next")}: {relativeWhen(next.start)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      Call for availability
                    </span>
                  )}
                </div>
              </div>
            </SelectCard>
          );
        })}

        {!state.emergency && (
          <SelectCard
            selected={state.locationChoice === "either"}
            tone="accent"
            onClick={chooseEither}
            disabled={!soonest}
          >
            <div className="flex items-center gap-3 pr-6">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="font-semibold">{t("step.location.either")}</p>
                {soonest && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {relativeWhen(soonest.start)} ·{" "}
                    {LOCATIONS.find((l) => l.id === soonest.locationId)?.shortName}
                  </p>
                )}
              </div>
            </div>
          </SelectCard>
        )}
      </div>
    </WizardShell>
  );
}
