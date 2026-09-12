"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarClock, MapPin, Stethoscope, User, ShieldCheck, Loader2, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLocation, getProvider, getService } from "@/lib/domain";
import { relativeWhen, timeRange } from "@/lib/utils";
import { MonogramAvatar } from "@/components/monogram-avatar";
import { useI18n } from "@/components/i18n-provider";
import { useBooking } from "@/hooks/use-booking";
import { useStore } from "@/hooks/use-store";
import type { ProviderId } from "@/lib/types";
import { WizardShell } from "../wizard-shell";

export function StepConfirm() {
  const { t, service: sv } = useI18n();
  const store = useStore();
  const router = useRouter();
  const { state, goto, reset } = useBooking();
  const [booking, setBooking] = useState(false);

  const loc = getLocation(state.locationId!)!;
  const service = getService(state.serviceId!)!;
  const isFamily = state.family.length > 0 && !!state.familySlots;
  const anchor = state.slot ?? state.familySlots?.slots[0];
  const provider = getProvider((anchor?.providerId ?? state.providerId) as ProviderId);

  async function confirm() {
    if (!anchor) return;
    setBooking(true);
    const famGroup = isFamily ? `fam_${Math.random().toString(36).slice(2, 9)}` : undefined;

    const primary =
      state.patient.patientId != null
        ? await store.getPatient(state.patient.patientId)
        : await store.upsertPatient({
            firstName: state.patient.firstName,
            lastName: state.patient.lastName,
            phone: state.patient.phone,
            email: state.patient.email,
            dob: state.patient.dob,
            insuranceCarrier: state.insurance.carrier ?? null,
            memberId: state.insurance.memberId ?? null,
            homeLocationId: loc.id,
            familyGroupId: famGroup,
          });

    const ids: string[] = [];

    if (isFamily && state.familySlots) {
      // primary is slot[0]
      const first = await store.createAppointment({
        patientId: primary!.id,
        providerId: state.familySlots.slots[0].providerId,
        locationId: loc.id,
        serviceId: service.id,
        chair: state.familySlots.slots[0].chair,
        start: state.familySlots.slots[0].start,
        end: state.familySlots.slots[0].end,
        isNewPatient: state.patient.isNew,
        familyGroupId: famGroup,
      });
      ids.push(first.id);
      for (let i = 0; i < state.family.length; i++) {
        const m = state.family[i];
        const s = state.familySlots.slots[i + 1];
        if (!s) continue;
        const mp = await store.upsertPatient({
          firstName: m.firstName || "Family",
          lastName: m.lastName || primary!.lastName,
          phone: state.patient.phone,
          dob: m.dob,
          homeLocationId: loc.id,
          familyGroupId: famGroup,
        });
        const appt = await store.createAppointment({
          patientId: mp.id,
          providerId: s.providerId,
          locationId: loc.id,
          serviceId: m.serviceId,
          chair: s.chair,
          start: s.start,
          end: s.end,
          isNewPatient: true,
          familyGroupId: famGroup,
        });
        ids.push(appt.id);
      }
    } else {
      const appt = await store.createAppointment({
        patientId: primary!.id,
        providerId: anchor.providerId,
        locationId: loc.id,
        serviceId: service.id,
        chair: anchor.chair,
        start: anchor.start,
        end: anchor.end,
        isNewPatient: state.patient.isNew,
        source: state.emergency ? "phone" : "online",
      });
      ids.push(appt.id);
    }

    reset();
    router.push(`/confirmation/${ids[0]}${ids.length > 1 ? `?ids=${ids.join(",")}` : ""}`);
  }

  return (
    <WizardShell
      title={t("step.confirm.title")}
      subtitle={t("step.confirm.subtitle")}
      hideContinue
    >
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        <Row icon={<Stethoscope className="size-4" />} label={sv(service.id).name} onEdit={() => goto("service")}>
          {service.durationMin} {t("common.minutes")}
          {state.emergency && <span className="ml-2 text-accent">· Emergency</span>}
        </Row>
        <Row
          icon={<CalendarClock className="size-4" />}
          label={
            isFamily && state.familySlots
              ? `${relativeWhen(state.familySlots.start)} · ${state.family.length + 1} people`
              : relativeWhen(anchor!.start)
          }
          onEdit={() => goto("datetime")}
        >
          {anchor && `${format(new Date(anchor.start), "EEEE, MMMM d")} · ${timeRange(anchor.start, anchor.end)}`}
        </Row>
        <Row icon={<MapPin className="size-4" />} label={loc.name} onEdit={() => goto("location")}>
          {loc.address}, {loc.city}, {loc.state} {loc.zip}
        </Row>
        {!isFamily && (
          <div className="flex items-center gap-3 p-4">
            <MonogramAvatar initials={provider?.initials ?? "SM"} size="sm" />
            <div className="flex-1 text-sm">
              <p className="font-medium">
                Dr. {provider?.firstName} {provider?.lastName}, {provider?.credential}
              </p>
              <p className="text-xs text-muted-foreground">
                {state.providerId === "any" ? t("step.provider.firstAvailable") : provider?.title} · Chair{" "}
                {anchor?.chair}
              </p>
            </div>
            {!state.emergency && (
              <button onClick={() => goto("provider")} className="text-xs font-medium text-primary">
                {t("wizard.change")}
              </button>
            )}
          </div>
        )}
        <Row icon={<User className="size-4" />} label={`${state.patient.firstName} ${state.patient.lastName}`} onEdit={() => goto("patient")}>
          {state.patient.phone}
          {state.patient.isNew ? " · New patient" : " · Returning patient"}
        </Row>
        <Row
          icon={<ShieldCheck className="size-4" />}
          label={
            state.insurance.eligibility
              ? state.insurance.eligibility.planName
              : state.insurance.carrier ?? "No insurance on file"
          }
          onEdit={() => goto("insurance")}
        >
          {state.insurance.eligibility
            ? `${t("step.insurance.network")} · cleaning 100%`
            : state.insurance.skipped
              ? "Will handle at the office"
              : "Not verified"}
        </Row>
        {isFamily && state.familySlots && (
          <div className="p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Users2 className="size-3.5" /> Everyone in this booking
            </p>
            <div className="space-y-1.5 text-sm">
              {state.familySlots.slots.map((s, i) => {
                const name =
                  i === 0
                    ? `${state.patient.firstName} ${state.patient.lastName}`
                    : `${state.family[i - 1]?.firstName} ${state.family[i - 1]?.lastName}`;
                const svcId = i === 0 ? service.id : state.family[i - 1]?.serviceId;
                return (
                  <div key={i} className="flex justify-between">
                    <span>
                      {name} · {getService(svcId)?.shortName}
                    </span>
                    <span className="font-medium tabular-nums">{format(new Date(s.start), "h:mm a")}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Button
        size="lg"
        onClick={confirm}
        disabled={booking || !anchor}
        className="mt-6 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
      >
        {booking ? (
          <>
            <Loader2 className="size-4 animate-spin" /> {t("step.confirm.booking")}
          </>
        ) : (
          t("step.confirm.book")
        )}
      </Button>
    </WizardShell>
  );
}

function Row({
  icon,
  label,
  children,
  onEdit,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  onEdit: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-start gap-3 p-4">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{children}</p>
      </div>
      <button onClick={onEdit} className="shrink-0 text-xs font-medium text-primary">
        {t("wizard.change")}
      </button>
    </div>
  );
}
