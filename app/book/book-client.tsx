"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SERVICES } from "@/lib/domain";
import { BookingProvider } from "@/hooks/use-booking";
import { StepRouter } from "@/components/wizard/step-router";
import { useStore } from "@/hooks/use-store";
import type { LiveLocationId, Slot } from "@/lib/types";

export function BookClient() {
  const sp = useSearchParams();
  const store = useStore();

  const service = sp.get("service") ?? undefined;
  const validService = service && SERVICES.some((s) => s.id === service) ? service : undefined;
  const emergency = sp.get("emergency") === "1" || validService === "emergency";
  const locParam = sp.get("location");
  const location =
    locParam === "atlantic-beach" || locParam === "bartram-park"
      ? (locParam as LiveLocationId)
      : undefined;
  // arriving from the triage assistant or the site embed starts a clean draft
  const via = sp.get("via");
  const fresh = via === "triage" || via === "embed";

  // the embed widget can hand us an exact slot — re-resolve it against live
  // availability so a stale link can never book a taken chair
  const slotStart = sp.get("slot");
  const initialSlot = useMemo<Slot | undefined>(() => {
    if (!slotStart || !validService || !location) return undefined;
    const day = store.availabilityDay({
      serviceId: validService,
      locationId: location,
      providerId: "any",
      date: new Date(slotStart),
    });
    return day.slots.find((s) => s.start === slotStart);
  }, [slotStart, validService, location, store]);

  return (
    <BookingProvider
      initialService={validService}
      initialEmergency={emergency}
      initialLocation={location}
      initialSlot={initialSlot}
      fresh={fresh}
    >
      <StepRouter />
    </BookingProvider>
  );
}
