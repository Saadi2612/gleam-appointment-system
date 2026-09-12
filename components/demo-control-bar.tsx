"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  RotateCcw,
  CalendarX2,
  BellRing,
  Route,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  Users,
  CalendarClock,
  PlayCircle,
  FastForward,
  Star,
  Code2,
  Calculator,
  MessageCircle,
  CalendarDays,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getService } from "@/lib/domain";
import { relativeWhen, formatMoney } from "@/lib/utils";
import { useStore } from "@/hooks/use-store";
import { useTour } from "@/components/guided-tour";

export function DemoControlBar() {
  const store = useStore();
  const router = useRouter();
  const tour = useTour();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  async function triggerCancellation() {
    const raw = store.raw();
    const id =
      raw.demoScenario.cancellableAppointmentIds.find((aid) =>
        raw.appointments.some((a) => a.id === aid && a.status !== "cancelled"),
      ) ??
      raw.appointments.find(
        (a) =>
          new Date(a.start) > new Date() &&
          a.status !== "cancelled" &&
          a.serviceId === "routine-cleaning",
      )?.id;
    if (!id) {
      toast.error("No eligible appointment to cancel — reset data first.");
      return;
    }
    const appt = raw.appointments.find((a) => a.id === id)!;
    const svc = getService(appt.serviceId)!;
    toast.loading(`Cancelling ${svc.shortName} · ${relativeWhen(appt.start)}…`, { id: "cancel" });
    const { recovery } = await store.cancelAppointment(id, { runRecovery: true });
    if (recovery?.filled) {
      toast.success(
        `Slot refilled from waitlist · ${formatMoney(recovery.revenueRecovered)} recovered · ${formatMoney(
          store.revenueRecovered,
        )} this month`,
        { id: "cancel", duration: 6000 },
      );
    } else {
      toast.success(`Cancelled. ${recovery?.offersSent.length ?? 0} waitlist offers sent.`, {
        id: "cancel",
      });
    }
    setOpen(false);
  }

  async function fireNotification() {
    const raw = store.raw();
    const p = raw.patients[Math.floor(Math.random() * raw.patients.length)];
    await store.notify({
      channel: Math.random() > 0.5 ? "sms" : "email",
      to: p.phone,
      kind: "reminder",
      subject: "Reminder from Gleam Dental",
      body: `Hi ${p.firstName}, this is a friendly reminder about your upcoming visit at Gleam Dental. Reply C to confirm.`,
    });
    toast.success("Sample notification fired — check the notification center");
  }

  /**
   * "Fast-forward the day": advance today's schedule by one status step so the
   * board looks alive mid-pitch — checked-in patients go to the chair, in-chair
   * visits complete (and fire their review request).
   */
  async function fastForward() {
    const raw = store.raw();
    const today = new Date().toDateString();
    const todays = raw.appointments.filter(
      (a) => new Date(a.start).toDateString() === today && a.status !== "cancelled",
    );
    let moved = 0;
    for (const a of todays.filter((x) => x.status === "in-chair").slice(0, 3)) {
      await store.setAppointmentStatus(a.id, "complete");
      await store.requestReview(a.id);
      moved++;
    }
    for (const a of todays.filter((x) => x.status === "checked-in").slice(0, 3)) {
      await store.setAppointmentStatus(a.id, "in-chair");
      moved++;
    }
    for (const a of todays.filter((x) => x.status === "confirmed").slice(0, 3)) {
      await store.setAppointmentStatus(a.id, "checked-in");
      moved++;
    }
    toast.success(
      moved ? `Advanced ${moved} appointments — review requests sent on completions` : "Nothing left to advance today",
    );
    setOpen(false);
  }

  const jumps: { label: string; icon: React.ElementType; href: string }[] = [
    { label: "Patient booking flow", icon: Sparkles, href: "/book" },
    { label: "Emergency fast-path", icon: CalendarClock, href: "/book?service=emergency" },
    { label: "AI triage (home)", icon: MessageCircle, href: "/" },
    { label: "My appointments", icon: CalendarDays, href: "/manage" },
    { label: "Membership plan", icon: Users, href: "/membership" },
    { label: "Practice dashboard", icon: LayoutDashboard, href: "/admin/today" },
    { label: "Reputation & MRR", icon: Star, href: "/admin/growth" },
    { label: "Website embed", icon: Code2, href: "/embed" },
    { label: "ROI calculator", icon: Calculator, href: "/roi" },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ bottom: "calc(0.75rem + var(--tour-offset, 0rem))" }}
        className="fixed right-3 z-30 inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-lift backdrop-blur transition-colors hover:text-foreground"
      >
        <Route className="size-3.5" />
        Demo controls
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Route className="size-4" /> Demo control bar
            </DialogTitle>
            <DialogDescription>Presenter tools. Nothing here touches a real system.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <ControlButton
              icon={PlayCircle}
              title="Start the guided tour"
              subtitle="15 steps in pitch order, with the line to say on each"
              onClick={() => {
                setOpen(false);
                tour.start(0);
              }}
              disabled={busy}
              accent
            />
            <ControlButton
              icon={CalendarX2}
              title="Trigger a cancellation"
              subtitle="Cancels a seeded visit, pages the waitlist, refills the slot"
              onClick={() => run(triggerCancellation)}
              disabled={busy}
            />
            <ControlButton
              icon={FastForward}
              title="Fast-forward the day"
              subtitle="Advances today's board: confirmed → checked in → in chair → complete"
              onClick={() => run(fastForward)}
              disabled={busy}
            />
            <ControlButton
              icon={BellRing}
              title="Fire a sample notification"
              subtitle="Drops an SMS/email into the notification center"
              onClick={() => run(fireNotification)}
              disabled={busy}
            />
            <ControlButton
              icon={RotateCcw}
              title="Reset all demo data"
              subtitle="Re-seeds patients, appointments and waitlist for today"
              onClick={() =>
                run(async () => {
                  await store.reset();
                  toast.success("Demo data reset");
                  setOpen(false);
                })
              }
              disabled={busy}
            />
          </div>

          <div className="mt-1 border-t border-border pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Jump to a scenario</p>
            <div className="grid grid-cols-2 gap-2">
              {jumps.map((j) => (
                <button
                  key={j.href}
                  onClick={() => {
                    router.push(j.href);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-left text-xs font-medium hover:border-primary/40 hover:bg-secondary"
                >
                  <j.icon className="size-3.5 shrink-0 text-primary" />
                  <span className="flex-1">{j.label}</span>
                  <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ControlButton({
  icon: Icon,
  title,
  subtitle,
  onClick,
  disabled,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
        accent
          ? "border-accent/40 bg-accent/10 hover:bg-accent/15"
          : "border-border bg-card hover:bg-secondary"
      }`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${accent ? "text-accent" : "text-primary"}`} />
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}
