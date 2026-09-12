"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, Loader2, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCATIONS, SERVICES } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { useStore } from "@/hooks/use-store";
import type { LiveLocationId, PreferredWindow } from "@/lib/types";

type DayKey = PreferredWindow["days"][number];
type TimeKey = PreferredWindow["times"][number];

export function WaitlistForm({
  defaultServiceId,
  defaultLocation,
  currentAppointmentId,
  defaultName = "",
  defaultPhone = "",
  compact,
}: {
  defaultServiceId?: string;
  defaultLocation?: LiveLocationId | "either";
  currentAppointmentId?: string;
  defaultName?: string;
  defaultPhone?: string;
  compact?: boolean;
}) {
  const { t, service: sv } = useI18n();
  const store = useStore();
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [serviceId, setServiceId] = useState(defaultServiceId ?? "routine-cleaning");
  const [location, setLocation] = useState<LiveLocationId | "either">(defaultLocation ?? "either");
  const [days, setDays] = useState<DayKey[]>(["weekday"]);
  const [times, setTimes] = useState<TimeKey[]>(["morning"]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function toggle<T>(arr: T[], v: T, set: (x: T[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  async function submit() {
    if (!name || phone.replace(/\D/g, "").length < 10) return;
    setBusy(true);
    await store.addWaitlistEntry({
      patientName: name,
      phone,
      locationPref: location,
      providerId: "any",
      serviceId,
      window: { days, times },
      currentAppointmentId,
    });
    setBusy(false);
    setDone(true);
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 rounded-2xl border border-success/30 bg-success/[0.06] p-6 text-center"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-success text-success-foreground">
          <Check className="size-6" strokeWidth={3} />
        </span>
        <p className="font-medium">{t("waitlist.joined")}</p>
      </motion.div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5", compact && "p-4")}>
      <p className="flex items-center gap-2 font-semibold">
        <BellRing className="size-4 text-primary" /> {t("waitlist.title")}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{t("waitlist.subtitle")}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("step.patient.first")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("step.patient.phone")}</Label>
          <Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("step.service.title")}</Label>
          <Select value={serviceId} onValueChange={setServiceId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERVICES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {sv(s.id).name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("nav.locations")}</Label>
          <Select value={location} onValueChange={(v) => setLocation(v as LiveLocationId | "either")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="either">{t("step.location.either")}</SelectItem>
              {LOCATIONS.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.shortName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">{t("waitlist.days")}</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(
              [
                ["weekday", t("waitlist.weekday")],
                ["mon", "Mon"],
                ["tue", "Tue"],
                ["wed", "Wed"],
                ["thu", "Thu"],
                ["fri", "Fri"],
              ] as [DayKey, string][]
            ).map(([k, label]) => (
              <Chip key={k} active={days.includes(k)} onClick={() => toggle(days, k, setDays)}>
                {label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs">{t("waitlist.times")}</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(
              [
                ["morning", t("waitlist.morning")],
                ["midday", t("waitlist.midday")],
                ["afternoon", t("waitlist.afternoon")],
              ] as [TimeKey, string][]
            ).map(([k, label]) => (
              <Chip key={k} active={times.includes(k)} onClick={() => toggle(times, k, setTimes)}>
                {label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={submit} disabled={busy} className="mt-5 w-full rounded-full">
        {busy ? <Loader2 className="size-4 animate-spin" /> : t("waitlist.join")}
      </Button>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
