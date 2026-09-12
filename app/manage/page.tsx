"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { differenceInMonths, format } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import {
  Search,
  Loader2,
  CalendarClock,
  ArrowRight,
  TicketCheck,
  CalendarPlus,
  MapPin,
  Star,
  Wallet,
  BellRing,
  CalendarX2,
  LogOut,
  Clock,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocation, getProvider, getService } from "@/lib/domain";
import { downloadICS } from "@/lib/ics";
import { cn, formatMoney, mapsUrl, relativeWhen, timeRange } from "@/lib/utils";
import { MonogramAvatar } from "@/components/monogram-avatar";
import { useI18n } from "@/components/i18n-provider";
import { useHydrated, useStore, useStoreQuery, useStoreSnapshot } from "@/hooks/use-store";
import { WaitlistForm } from "@/components/waitlist-form";
import type { Appointment, Patient } from "@/lib/types";

/**
 * The patient's own view of their file: upcoming and past visits.
 * Identity is a phone-number lookup, not a password — which is exactly how
 * these portals work in practice, and keeps the demo login-free.
 */
const SESSION_KEY = "gleam.me";

export default function ManagePage() {
  const store = useStore();
  const snap = useStoreSnapshot();
  const router = useRouter();

  const [patientId, setPatientId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);

  // remember who we looked up, so a refresh doesn't kick them out
  useEffect(() => {
    const saved = window.sessionStorage.getItem(SESSION_KEY);
    if (saved) setPatientId(saved);
    setRestoring(false);
  }, []);

  const { data: patient } = useStoreQuery(
    (s) => (patientId ? s.getPatient(patientId) : Promise.resolve(null)),
    [patientId],
  );

  const { data: appointments, loading } = useStoreQuery(
    (s) => (patientId ? s.listAppointments({ patientId }) : Promise.resolve([] as Appointment[])),
    [patientId, snap],
  );

  function signIn(p: Patient) {
    window.sessionStorage.setItem(SESSION_KEY, p.id);
    setPatientId(p.id);
  }
  function signOut() {
    window.sessionStorage.removeItem(SESSION_KEY);
    setPatientId(null);
  }

  if (restoring) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!patientId || !patient) {
    return <LookupScreen onFound={signIn} onCode={(tok) => router.push(`/appt/${tok}`)} />;
  }

  return (
    <PortalScreen
      patient={patient}
      appointments={appointments ?? []}
      loading={loading}
      onSignOut={signOut}
    />
  );
}

// ---------------------------------------------------------------------------
// Entry — confirmation code or phone number
// ---------------------------------------------------------------------------

function LookupScreen({
  onFound,
  onCode,
}: {
  onFound: (p: Patient) => void;
  onCode: (token: string) => void;
}) {
  const { t } = useI18n();
  const store = useStore();
  const snap = useStoreSnapshot();
  const hydrated = useHydrated();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState<"code" | "phone" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function byCode() {
    if (!code.trim()) return;
    setBusy("code");
    setErr(null);
    const appt = await store.getAppointmentByToken(code.trim().toLowerCase());
    setBusy(null);
    if (appt) onCode(appt.token);
    else setErr(t("manage.notFound"));
  }

  async function byPhone() {
    if (phone.replace(/\D/g, "").length < 10) return;
    setBusy("phone");
    setErr(null);
    const p = await store.findPatientByPhone(phone);
    setBusy(null);
    if (p) onFound(p);
    else setErr(t("manage.lookupFailed"));
  }

  /**
   * Demo shortcut: nobody watching a pitch knows a seeded phone number, so
   * offer a patient who has both a booked visit and a real visit history.
   */
  const demoPatient = useMemo(() => {
    if (!hydrated) return null;
    const now = Date.now();
    const byPatient = new Map<string, { future: number; past: number }>();
    for (const a of snap.appointments) {
      const bucket = byPatient.get(a.patientId) ?? { future: 0, past: 0 };
      if (new Date(a.start).getTime() > now && a.status !== "cancelled") bucket.future++;
      else bucket.past++;
      byPatient.set(a.patientId, bucket);
    }
    let best: Patient | null = null;
    let bestPast = 0;
    for (const p of snap.patients) {
      const b = byPatient.get(p.id);
      if (!b || b.future < 1 || b.past < 3) continue;
      if (b.past > bestPast) {
        bestPast = b.past;
        best = p;
      }
    }
    return best;
  }, [snap.appointments, snap.patients, hydrated]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold sm:text-4xl">{t("manage.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("manage.subtitleNew")}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 font-semibold">
            <Search className="size-4 text-primary" /> {t("manage.byPhone")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("manage.byPhoneHint")}</p>
          <div className="mt-3 flex gap-2">
            <Input
              inputMode="tel"
              placeholder="(904) 555-0143"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && byPhone()}
            />
            <Button onClick={byPhone} disabled={busy !== null} className="shrink-0 rounded-xl">
              {busy === "phone" ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 font-semibold">
            <TicketCheck className="size-4 text-primary" /> {t("manage.byCode")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("manage.byCodeHint")}</p>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="e.g. k7m2p9x4qz"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && byCode()}
            />
            <Button onClick={byCode} disabled={busy !== null} className="shrink-0 rounded-xl">
              {busy === "code" ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            </Button>
          </div>
        </div>
      </div>

      {err && <p className="mt-3 text-sm text-muted-foreground">{err}</p>}

      {demoPatient && (
        <button
          onClick={() => onFound(demoPatient)}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/[0.04] p-4 text-left transition-colors hover:bg-primary/[0.08]"
        >
          <FlaskConical className="size-5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">
              Demo shortcut — open {demoPatient.firstName} {demoPatient.lastName}&apos;s record
            </span>
            <span className="block text-xs text-muted-foreground">
              A seeded patient with an upcoming visit and several past ones. Real numbers work too:{" "}
              {demoPatient.phone}
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-primary" />
        </button>
      )}

      <div className="mt-10">
        <WaitlistForm />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The portal itself
// ---------------------------------------------------------------------------

function PortalScreen({
  patient,
  appointments,
  loading,
  onSignOut,
}: {
  patient: Patient;
  appointments: Appointment[];
  loading: boolean;
  onSignOut: () => void;
}) {
  const { t } = useI18n();
  const snap = useStoreSnapshot();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const now = Date.now();
  const { upcoming, past } = useMemo(() => {
    const up: Appointment[] = [];
    const pa: Appointment[] = [];
    for (const a of appointments) {
      const isFuture = new Date(a.start).getTime() > now;
      if (isFuture && a.status !== "cancelled" && a.status !== "no-show") up.push(a);
      else pa.push(a);
    }
    up.sort((a, b) => a.start.localeCompare(b.start));
    pa.sort((a, b) => b.start.localeCompare(a.start));
    return { upcoming: up, past: pa };
  }, [appointments, now]);

  const monthsSinceLastVisit = patient.lastVisit
    ? differenceInMonths(new Date(), new Date(patient.lastVisit))
    : null;
  const showRecall =
    upcoming.length === 0 && monthsSinceLastVisit != null && monthsSinceLastVisit >= 6;

  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
      {/* who we think you are */}
      <div className="flex flex-wrap items-center gap-3">
        <MonogramAvatar
          initials={`${patient.firstName[0] ?? ""}${patient.lastName[0] ?? ""}`}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {t("manage.greeting", { name: patient.firstName })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {patient.phone}
            {patient.insuranceCarrier ? ` · ${patient.insuranceCarrier}` : " · Self-pay"}
          </p>
        </div>
        <button
          onClick={onSignOut}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-3.5" />
          {t("manage.notYou")}
        </button>
      </div>

      {/* balance */}
      {patient.balance > 0 && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-accent/35 bg-accent/[0.06] p-4">
          <Wallet className="mt-0.5 size-5 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-semibold">
              {t("manage.balance", { amount: formatMoney(patient.balance) })}
            </p>
            <p className="text-xs text-muted-foreground">{t("manage.balanceBody")}</p>
          </div>
        </div>
      )}

      {/* recall nudge */}
      {showRecall && (
        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/[0.05] p-4">
          <BellRing className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-semibold">{t("manage.recallDue")}</p>
            <p className="text-xs text-muted-foreground">
              {t("manage.recallBody", { months: monthsSinceLastVisit! })}
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0 rounded-full">
            <Link href="/book?service=routine-cleaning">{t("manage.bookNow")}</Link>
          </Button>
        </div>
      )}

      {/* tabs */}
      <div className="mt-6 flex items-center gap-2">
        <div className="inline-flex rounded-full border border-border bg-card p-0.5 text-sm">
          {(["upcoming", "past"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "rounded-full px-4 py-1.5 font-medium transition-colors",
                tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`manage.${k}`)}
              <span className="ml-1.5 text-xs opacity-70">
                {k === "upcoming" ? upcoming.length : past.length}
              </span>
            </button>
          ))}
        </div>
        <Button asChild size="sm" variant="outline" className="ml-auto rounded-full">
          <Link href="/book">
            <CalendarPlus className="size-3.5" /> {t("manage.bookNow")}
          </Link>
        </Button>
      </div>

      {/* list */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
            <CalendarX2 className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {tab === "upcoming" ? t("manage.noUpcoming") : t("manage.noPast")}
            </p>
            {tab === "upcoming" && (
              <Button asChild size="sm" className="rounded-full">
                <Link href="/book">{t("manage.bookNow")}</Link>
              </Button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {list.map((a) => (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <VisitCard
                  appt={a}
                  variant={tab}
                  reviewed={snap.reviews.some((r) => r.appointmentId === a.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {upcoming.length > 0 && (
        <div className="mt-10">
          <WaitlistForm
            defaultServiceId={upcoming[0].serviceId}
            defaultLocation={upcoming[0].locationId}
            currentAppointmentId={upcoming[0].id}
            defaultName={`${patient.firstName} ${patient.lastName}`}
            defaultPhone={patient.phone}
          />
        </div>
      )}
    </div>
  );
}

const PAST_STATUS: Record<string, { label: string; className: string }> = {
  complete: { label: "Completed", className: "bg-success/15 text-success" },
  "no-show": { label: "Missed", className: "bg-destructive/12 text-destructive" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

function VisitCard({
  appt,
  variant,
  reviewed,
}: {
  appt: Appointment;
  variant: "upcoming" | "past";
  reviewed: boolean;
}) {
  const { t, service: sv } = useI18n();
  const loc = getLocation(appt.locationId)!;
  const provider = getProvider(appt.providerId)!;
  const service = getService(appt.serviceId)!;
  const status = PAST_STATUS[appt.status];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-soft",
        variant === "past" ? "border-border/70" : "border-border",
      )}
    >
      <div className={cn("flex flex-wrap items-center gap-3 p-4", variant === "upcoming" && "bg-primary/[0.04]")}>
        <MonogramAvatar initials={provider.initials} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{sv(service.id).name}</p>
          <p className="text-xs text-muted-foreground">
            Dr. {provider.firstName} {provider.lastName}, {provider.credential} · {loc.shortName}
          </p>
        </div>
        {variant === "past" && status && (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", status.className)}>
            {status.label}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-3 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <CalendarClock className="size-4 text-primary" />
          {variant === "upcoming"
            ? relativeWhen(appt.start)
            : t("manage.completedOn", { date: format(new Date(appt.start), "MMM d, yyyy") })}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          {timeRange(appt.start, appt.end)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border p-3">
        {variant === "upcoming" ? (
          <>
            <Button asChild size="sm" className="rounded-full">
              <Link href={`/appt/${appt.token}`}>
                {t("manage.viewDetails")} <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => downloadICS(appt, `gleam-${appt.token}.ics`)}
            >
              <CalendarPlus className="size-3.5" /> {t("confirmed.addCalendar")}
            </Button>
            <Button asChild size="sm" variant="ghost" className="rounded-full">
              <a href={mapsUrl(loc.address, loc.city, loc.state, loc.zip)} target="_blank" rel="noreferrer">
                <MapPin className="size-3.5" /> {t("confirmed.directions")}
              </a>
            </Button>
          </>
        ) : (
          <>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href={`/book?service=${appt.serviceId}&location=${appt.locationId}`}>
                {t("manage.bookAgain")} <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            {appt.status === "complete" && !reviewed && (
              <Button asChild size="sm" variant="ghost" className="rounded-full">
                <Link href={`/review/${appt.token}`}>
                  <Star className="size-3.5" /> {t("manage.leaveReview")}
                </Link>
              </Button>
            )}
            {appt.reviewRating != null && (
              <span className="inline-flex items-center gap-0.5 self-center px-2 text-xs text-muted-foreground">
                {Array.from({ length: appt.reviewRating }).map((_, i) => (
                  <Star key={i} className="size-3 fill-warning text-warning" />
                ))}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
