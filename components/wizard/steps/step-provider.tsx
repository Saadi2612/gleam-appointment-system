"use client";

import { useMemo } from "react";
import { Zap, CalendarCheck2 } from "lucide-react";
import { providersFor } from "@/lib/domain";
import { relativeWhen } from "@/lib/utils";
import { MonogramAvatar } from "@/components/monogram-avatar";
import { useI18n } from "@/components/i18n-provider";
import { useBooking } from "@/hooks/use-booking";
import { useStore, useStoreSnapshot } from "@/hooks/use-store";
import { WizardShell } from "../wizard-shell";
import { SelectCard } from "../select-card";

export function StepProvider() {
  const { t } = useI18n();
  const store = useStore();
  const snap = useStoreSnapshot();
  const { state, patch, goNext } = useBooking();
  const serviceId = state.serviceId!;
  const locationId = state.locationId!;

  const providers = useMemo(
    () => providersFor(serviceId, locationId),
    [serviceId, locationId],
  );

  const nextByProvider = useMemo(() => {
    const map: Record<string, string | null> = {};
    map.any =
      store.nextAvailable({ serviceId, locationId, providerId: "any", withinDays: 45 })?.start ?? null;
    for (const p of providers) {
      map[p.id] =
        store.nextAvailable({ serviceId, locationId, providerId: p.id, withinDays: 45 })?.start ?? null;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, locationId, providers, store, snap]);

  function choose(id: "any" | string) {
    patch({ providerId: id as never, slot: undefined });
    setTimeout(goNext, 200);
  }

  return (
    <WizardShell title={t("step.provider.title")} subtitle={t("step.provider.subtitle")}>
      <div className="space-y-3">
        <SelectCard selected={state.providerId === "any"} tone="accent" onClick={() => choose("any")}>
          <div className="flex items-center gap-3 pr-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Zap className="size-5" />
            </span>
            <div>
              <p className="font-semibold">{t("step.provider.firstAvailable")}</p>
              <p className="text-sm text-muted-foreground">{t("step.provider.firstAvailableBody")}</p>
              {nextByProvider.any && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-success">
                  <CalendarCheck2 className="size-3.5" /> {relativeWhen(nextByProvider.any)}
                </p>
              )}
            </div>
          </div>
        </SelectCard>

        {providers.map((p) => (
          <SelectCard key={p.id} selected={state.providerId === p.id} onClick={() => choose(p.id)}>
            <div className="flex items-center gap-3 pr-6">
              <MonogramAvatar initials={p.initials} size="md" />
              <div>
                <p className="font-semibold">
                  Dr. {p.firstName} {p.lastName}, {p.credential}
                </p>
                <p className="text-sm text-muted-foreground">{p.title}</p>
                {nextByProvider[p.id] ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <CalendarCheck2 className="size-3.5" /> Next: {relativeWhen(nextByProvider[p.id]!)}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">Limited availability</p>
                )}
              </div>
            </div>
          </SelectCard>
        ))}
      </div>
    </WizardShell>
  );
}
