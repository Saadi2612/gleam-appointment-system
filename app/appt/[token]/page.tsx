"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { addDays, format, isBefore, startOfDay } from "date-fns";
import { toast } from "sonner";
import {
  CalendarPlus,
  MapPin,
  CalendarClock,
  CalendarX2,
  Clock,
  RotateCcw,
  Ban,
  Check,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getLocation, getProvider, getService } from "@/lib/domain";
import { downloadICS } from "@/lib/ics";
import { cn, mapsUrl, relativeWhen, timeRange } from "@/lib/utils";
import { MonogramAvatar } from "@/components/monogram-avatar";
import { useI18n } from "@/components/i18n-provider";
import { useStore, useStoreQuery, useStoreSnapshot } from "@/hooks/use-store";
import { WaitlistForm } from "@/components/waitlist-form";
import type { Slot } from "@/lib/types";

export default function ManageAppointmentPage() {
  const { t, service: sv } = useI18n();
  const { token } = useParams<{ token: string }>();
  const store = useStore();
  const snap = useStoreSnapshot();

  const { data: appt, loading } = useStoreQuery((s) => s.getAppointmentByToken(token), [token, snap]);
  const { data: patient } = useStoreQuery(
    (s) => (appt ? s.getPatient(appt.patientId) : Promise.resolve(null)),
    [appt?.patientId],
  );

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [day, setDay] = useState<Date>(addDays(startOfDay(new Date()), 1));
  const [picked, setPicked] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);

  const loc = appt ? getLocation(appt.locationId) : null;
  const service = appt ? getService(appt.serviceId) : null;
  const provider = appt ? getProvider(appt.providerId) : null;

  const dayAvail = useMemo(() => {
    if (!appt || !rescheduleOpen) return null;
    return store.availabilityDay({
      serviceId: appt.serviceId,
      locationId: appt.locationId,
      providerId: appt.providerId,
      date: day,
    });
  }, [appt, rescheduleOpen, day, store]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (!appt || !loc || !service || !provider) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <CalendarX2 className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-muted-foreground">{t("manage.notFound")}</p>
        <Button asChild className="mt-4 rounded-full">
          <Link href="/manage">
            <ChevronLeft className="size-4" /> {t("manage.title")}
          </Link>
        </Button>
      </div>
    );
  }

  const cancelled = appt.status === "cancelled";

  async function doReschedule() {
    if (!picked || !appt) return;
    setBusy(true);
    await store.rescheduleAppointment(appt.id, picked.start);
    setBusy(false);
    setRescheduleOpen(false);
    setPicked(null);
    toast.success(t("manage.rescheduled"));
  }
  async function doCancel() {
    if (!appt) return;
    setBusy(true);
    await store.cancelAppointment(appt.id, { runRecovery: true });
    setBusy(false);
    setCancelOpen(false);
    toast.success(t("manage.cancelled"));
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
      <Link
        href="/manage"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> {t("manage.title")}
      </Link>

      <div
        className={cn(
          "overflow-hidden rounded-2xl border bg-card shadow-soft",
          cancelled ? "border-border opacity-80" : "border-border",
        )}
      >
        <div className={cn("p-5", cancelled ? "bg-muted" : "bg-primary/[0.04]")}>
          {cancelled ? (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
              <Ban className="size-3.5" /> {t("manage.cancelled")}
            </p>
          ) : (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {relativeWhen(appt.start, { withTime: false })}
            </p>
          )}
          <p className="mt-1 text-xl font-semibold">{format(new Date(appt.start), "EEEE, MMMM d")}</p>
          <p className="text-primary">{timeRange(appt.start, appt.end)}</p>
        </div>

        <div className="space-y-3 p-5 text-sm">
          <div className="flex items-center gap-3">
            <MonogramAvatar initials={provider.initials} size="sm" />
            <div>
              <p className="font-medium">{sv(service.id).name}</p>
              <p className="text-xs text-muted-foreground">
                Dr. {provider.firstName} {provider.lastName}, {provider.credential} · {patient?.firstName}{" "}
                {patient?.lastName}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium">{loc.name}</p>
              <p className="text-xs text-muted-foreground">
                {loc.address}, {loc.city}, {loc.state} {loc.zip} · {loc.phone}
              </p>
            </div>
          </div>
        </div>

        {!cancelled && (
          <div className="grid grid-cols-3 gap-2 border-t border-border p-4">
            <Button variant="outline" className="rounded-xl" onClick={() => downloadICS(appt, `gleam-${appt.token}.ics`)}>
              <CalendarPlus className="size-4" />
              <span className="hidden sm:inline">{t("confirmed.addCalendar")}</span>
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setRescheduleOpen(true);
                setDay(addDays(startOfDay(new Date()), 1));
              }}
            >
              <RotateCcw className="size-4" />
              <span className="hidden sm:inline">{t("manage.reschedule")}</span>
            </Button>
            <Button
              variant="outline"
              className="rounded-xl text-destructive hover:text-destructive"
              onClick={() => setCancelOpen(true)}
            >
              <Ban className="size-4" />
              <span className="hidden sm:inline">{t("manage.cancel")}</span>
            </Button>
          </div>
        )}
      </div>

      {cancelled && (
        <Button asChild className="mt-4 w-full rounded-full">
          <Link href="/book">{t("home.cta")}</Link>
        </Button>
      )}

      {!cancelled && (
        <div className="mt-4">
          {!showWaitlist ? (
            <button
              onClick={() => setShowWaitlist(true)}
              className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/40 p-4 text-sm font-medium text-primary"
            >
              <Clock className="size-4" />
              {t("home.waitlistTitle")}
            </button>
          ) : (
            <WaitlistForm
              defaultServiceId={appt.serviceId}
              defaultLocation={appt.locationId}
              currentAppointmentId={appt.id}
              defaultName={`${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim()}
              defaultPhone={patient?.phone ?? ""}
            />
          )}
        </div>
      )}

      {/* reschedule dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("manage.reschedule")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <Calendar
              mode="single"
              selected={day}
              onSelect={(d) => d && (setDay(startOfDay(d)), setPicked(null))}
              disabled={(d) => isBefore(d, startOfDay(new Date())) || !loc.hours[d.getDay()]}
              startMonth={new Date()}
              className="rounded-xl border border-border"
            />
            <div className="min-h-40">
              <p className="mb-2 text-sm font-medium">{format(day, "EEE, MMM d")}</p>
              {!dayAvail ? null : !dayAvail.open || dayAvail.slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">{dayAvail.note ?? t("step.datetime.noSlots")}</p>
              ) : (
                <div className="grid max-h-56 grid-cols-3 gap-1.5 overflow-y-auto pr-1">
                  {dayAvail.slots.map((s) => (
                    <button
                      key={s.start}
                      onClick={() => setPicked(s)}
                      className={cn(
                        "rounded-lg border px-1.5 py-1.5 text-xs font-medium tabular-nums transition-colors",
                        picked?.start === s.start
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border hover:bg-secondary",
                      )}
                    >
                      {format(new Date(s.start), "h:mm a")}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRescheduleOpen(false)}>
              {t("common.close")}
            </Button>
            <Button onClick={doReschedule} disabled={!picked || busy} className="rounded-full">
              <Check className="size-4" /> {t("manage.reschedule")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("manage.cancel")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("manage.cancelConfirm")}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              {t("common.close")}
            </Button>
            <Button variant="destructive" onClick={doCancel} disabled={busy} className="rounded-full">
              {t("manage.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
