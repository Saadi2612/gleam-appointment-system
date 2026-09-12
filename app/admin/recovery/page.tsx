"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { differenceInCalendarDays } from "date-fns";
import {
  PhoneOutgoing,
  MessageSquare,
  CheckCircle2,
  TrendingUp,
  CalendarX2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLocation, getProvider, getService } from "@/lib/domain";
import { cn, formatMoney, relativeWhen } from "@/lib/utils";
import { useAdmin } from "@/hooks/use-admin";
import { useStore, useStoreSnapshot } from "@/hooks/use-store";
import type { RecoveryResult } from "@/lib/store";
import type { Appointment } from "@/lib/types";

export default function RecoveryPage() {
  const { scope } = useAdmin();
  const store = useStore();
  const snap = useStoreSnapshot();
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<RecoveryResult | null>(null);
  const [revealed, setRevealed] = useState(0);

  const recovered = snap.revenueRecovered;
  const filledCount = snap.appointments.filter((a) => a.filledFromWaitlist).length;

  const candidates = useMemo(() => {
    const now = new Date();
    return snap.appointments
      .filter(
        (a) =>
          new Date(a.start) > now &&
          (a.status === "confirmed" || a.status === "scheduled") &&
          (scope === "all" || a.locationId === scope) &&
          differenceInCalendarDays(new Date(a.start), now) <= 10,
      )
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 12);
  }, [snap.appointments, scope]);

  const waitlist = useMemo(
    () => snap.waitlist.filter((w) => w.status === "active"),
    [snap.waitlist],
  );

  // staged reveal of the SMS offers for drama
  useEffect(() => {
    if (!result) return;
    setRevealed(0);
    const total = result.offersSent.length + 1;
    const t = setInterval(() => {
      setRevealed((r) => {
        if (r >= total) {
          clearInterval(t);
          return r;
        }
        return r + 1;
      });
    }, 700);
    return () => clearInterval(t);
  }, [result]);

  async function cancelAndRecover(appt: Appointment) {
    setRunning(appt.id);
    setResult(null);
    const { recovery } = await store.cancelAppointment(appt.id, { runRecovery: true });
    setRunning(null);
    if (recovery) setResult(recovery);
  }

  return (
    <div className="space-y-5">
      {/* hero counter */}
      <div className="grid gap-4 rounded-2xl border border-success/30 bg-success/[0.06] p-5 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-success">Revenue recovered this month</p>
          <motion.p
            key={recovered}
            initial={{ scale: 0.9, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-1 text-4xl font-semibold tabular-nums text-success sm:text-5xl"
          >
            {formatMoney(recovered)}
          </motion.p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filledCount} cancelled {filledCount === 1 ? "slot" : "slots"} automatically refilled from the waitlist
          </p>
        </div>
        <div className="flex items-center justify-center rounded-xl bg-card/60 p-4 text-center">
          <div>
            <TrendingUp className="mx-auto size-6 text-success" />
            <p className="mt-1 text-xs text-muted-foreground">
              Every cancellation pages the waitlist by text in seconds — no front-desk time.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* candidates */}
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <CalendarX2 className="size-4 text-primary" /> Upcoming appointments
          </p>
          <div className="space-y-2">
            {candidates.map((a) => {
              const svc = getService(a.serviceId)!;
              const loc = getLocation(a.locationId)!;
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {svc.shortName} · {formatMoney(svc.value)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {relativeWhen(a.start)} · {loc.shortName} · Dr. {getProvider(a.providerId)?.lastName}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 rounded-full"
                    disabled={running === a.id}
                    onClick={() => cancelAndRecover(a)}
                  >
                    {running === a.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <PhoneOutgoing className="size-3.5" />
                    )}
                    Cancel &amp; recover
                  </Button>
                </div>
              );
            })}
            {candidates.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No upcoming appointments in range. Reset demo data to restock.
              </p>
            )}
          </div>
        </div>

        {/* automation feed */}
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-accent" /> Live automation
          </p>
          <div className="min-h-64 rounded-2xl border border-border bg-card p-4">
            {!result ? (
              <p className="pt-16 text-center text-sm text-muted-foreground">
                Cancel an appointment on the left and watch the waitlist fill it.
              </p>
            ) : (
              <div className="space-y-2.5">
                <FeedLine icon={<CalendarX2 className="size-4 text-destructive" />} delay={0}>
                  Slot freed — {getService(result.freed.serviceId)?.shortName} ·{" "}
                  {relativeWhen(result.freed.start)}
                </FeedLine>
                <AnimatePresence>
                  {result.offersSent.slice(0, revealed).map((o, i) => (
                    <motion.div
                      key={o.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-2"
                    >
                      <MessageSquare className="mt-0.5 size-4 shrink-0 text-info" />
                      <div className="rounded-2xl rounded-tl-sm bg-secondary px-3 py-1.5 text-xs">
                        <span className="font-medium">SMS → {o.to}</span>
                        <br />
                        {o.body}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {revealed > result.offersSent.length && result.filled && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/[0.08] p-2.5"
                  >
                    <CheckCircle2 className="size-4 text-success" />
                    <span className="text-xs font-medium">
                      Filled — {formatMoney(result.revenueRecovered)} recovered. Slot is back on the board.
                    </span>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* active waitlist */}
      <div>
        <p className="mb-2 text-sm font-semibold">Active waitlist ({waitlist.length})</p>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-border bg-secondary/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-2.5 text-left font-medium">Patient</th>
                <th className="p-2.5 text-left font-medium">Wants</th>
                <th className="p-2.5 text-left font-medium">Location</th>
                <th className="p-2.5 text-left font-medium">Windows</th>
              </tr>
            </thead>
            <tbody>
              {waitlist.map((w) => (
                <tr key={w.id} className="border-b border-border/60 last:border-0">
                  <td className="p-2.5 font-medium">{w.patientName}</td>
                  <td className="p-2.5 text-muted-foreground">{getService(w.serviceId)?.shortName}</td>
                  <td className="p-2.5 text-muted-foreground">
                    {w.locationPref === "either" ? "Either" : getLocation(w.locationPref)?.shortName}
                  </td>
                  <td className="p-2.5 text-xs text-muted-foreground">
                    {w.window.days.join(", ")} · {w.window.times.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FeedLine({
  icon,
  delay,
  children,
}: {
  icon: React.ReactNode;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-2 text-xs font-medium"
    >
      {icon}
      {children}
    </motion.div>
  );
}
