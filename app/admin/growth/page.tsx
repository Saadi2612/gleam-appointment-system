"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Star,
  ShieldCheck,
  TrendingUp,
  Users,
  CreditCard,
  MessageSquareWarning,
  Send,
  ExternalLink,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLocation, getService, MEMBERSHIP_PLANS } from "@/lib/domain";
import { cn, formatMoney } from "@/lib/utils";
import { useAdmin } from "@/hooks/use-admin";
import { useStore, useStoreSnapshot } from "@/hooks/use-store";

export default function GrowthPage() {
  const { scope } = useAdmin();
  const store = useStore();
  const snap = useStoreSnapshot();
  const [busy, setBusy] = useState(false);

  const rep = useMemo(() => store.reputationStats(), [store, snap]);
  const mem = useMemo(() => store.membershipStats(), [store, snap]);

  const members = useMemo(
    () =>
      snap.members
        .filter((m) => m.status === "active")
        .filter((m) => scope === "all" || m.locationId === scope)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [snap.members, scope],
  );

  const needsFollowUp = useMemo(
    () =>
      snap.reviews
        .filter((r) => r.route === "private")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 12),
    [snap.reviews],
  );

  /** completed visits in the last 3 days with no rating yet */
  const awaitingReview = useMemo(() => {
    const cutoff = Date.now() - 3 * 864e5;
    const rated = new Set(snap.reviews.map((r) => r.appointmentId));
    return snap.appointments.filter(
      (a) =>
        a.status === "complete" &&
        !rated.has(a.id) &&
        new Date(a.end).getTime() > cutoff &&
        (scope === "all" || a.locationId === scope),
    );
  }, [snap.appointments, snap.reviews, scope]);

  async function sendReviewRequests() {
    setBusy(true);
    for (const a of awaitingReview.slice(0, 25)) await store.requestReview(a.id);
    setBusy(false);
    toast.success(`${Math.min(awaitingReview.length, 25)} review requests sent`);
  }

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Star className="size-4" />}
          label="Average rating"
          value={rep.average ? rep.average.toFixed(2) : "—"}
          sub={`${rep.total} responses collected`}
        />
        <Kpi
          icon={<ShieldCheck className="size-4" />}
          label="Routed to Google"
          value={`${Math.round(rep.captureRate * 100)}%`}
          sub={`${rep.postedToGoogle} public reviews posted`}
          tone="success"
        />
        <Kpi
          icon={<Users className="size-4" />}
          label="Active members"
          value={String(mem.active)}
          sub={`${mem.joinedLast30} joined in the last 30 days`}
        />
        <Kpi
          icon={<CreditCard className="size-4" />}
          label="Membership MRR"
          value={formatMoney(mem.mrr)}
          sub={`${formatMoney(mem.arr)} annualized`}
          tone="accent"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* reputation */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Star className="size-4 text-warning" /> Reputation
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            4–5★ goes to Google. 1–3★ opens a private form instead — the complaint lands in your inbox,
            not on your listing.
          </p>

          <div className="mt-4 space-y-1.5">
            {[5, 4, 3, 2, 1].map((s) => {
              const n = rep.distribution[s] ?? 0;
              const pct = rep.total ? (n / rep.total) * 100 : 0;
              return (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="w-8 tabular-nums text-muted-foreground">{s}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn("h-full rounded-full", s >= 4 ? "bg-success" : "bg-accent")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right tabular-nums text-muted-foreground">{n}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-secondary/50 p-3">
            <div className="text-xs">
              <p className="font-semibold">{awaitingReview.length} visits awaiting a rating</p>
              <p className="text-muted-foreground">Completed in the last 3 days</p>
            </div>
            <Button
              size="sm"
              className="rounded-full"
              disabled={busy || awaitingReview.length === 0}
              onClick={sendReviewRequests}
            >
              <Send className="size-3.5" /> Send requests
            </Button>
          </div>
        </div>

        {/* private feedback queue */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquareWarning className="size-4 text-accent" /> Private feedback — needs follow-up
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Caught before it became a public review. {rep.privateRouted} intercepted so far.
          </p>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {needsFollowUp.map((r) => {
              const p = snap.patients.find((x) => x.id === r.patientId);
              const appt = snap.appointments.find((a) => a.id === r.appointmentId);
              return (
                <div key={r.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex gap-0.5">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} className="size-3 fill-accent text-accent" />
                      ))}
                    </span>
                    <span className="text-xs font-medium">
                      {p ? `${p.firstName} ${p.lastName}` : "Patient"}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.privateFeedback}</p>
                  {appt && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {getService(appt.serviceId)?.shortName} · {getLocation(appt.locationId)?.shortName}
                    </p>
                  )}
                </div>
              );
            })}
            {needsFollowUp.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                Nothing in the queue — every rating so far was 4★ or better.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* membership */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Repeat className="size-4 text-primary" /> Gleam Care membership
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-xs font-semibold text-success">
            <TrendingUp className="size-3.5" />
            {formatMoney(mem.mrr)} MRR · {formatMoney(mem.arr)} ARR
          </span>
          <Button asChild size="sm" variant="outline" className="ml-auto rounded-full">
            <a href="/membership" target="_blank" rel="noreferrer">
              Patient signup page <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {MEMBERSHIP_PLANS.map((p) => (
            <div key={p.id} className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold">{p.name}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{mem.byTier[p.id] ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">
                members · {formatMoney(p.price)}/yr or {formatMoney(p.monthly)}/mo
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-border bg-secondary/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-2.5 text-left font-medium">Member</th>
                <th className="p-2.5 text-left font-medium">Plan</th>
                <th className="p-2.5 text-left font-medium">Billing</th>
                <th className="p-2.5 text-left font-medium">Renews</th>
              </tr>
            </thead>
            <tbody>
              {members.slice(0, 12).map((m) => (
                <tr key={m.id} className="border-b border-border/60 last:border-0">
                  <td className="p-2.5 font-medium">
                    {m.firstName} {m.lastName}
                    <span className="ml-1.5 text-[10px] text-muted-foreground">
                      {getLocation(m.locationId)?.shortName}
                    </span>
                  </td>
                  <td className="p-2.5 text-muted-foreground">
                    {MEMBERSHIP_PLANS.find((p) => p.id === m.tier)?.name.replace("Gleam Care — ", "")}
                  </td>
                  <td className="p-2.5 capitalize text-muted-foreground">{m.billing}</td>
                  <td className="p-2.5 text-muted-foreground">
                    {format(new Date(m.renewsAt), "MMM d, yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {members.length > 12 && (
          <p className="mt-2 text-xs text-muted-foreground">+{members.length - 12} more active members</p>
        )}
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tone = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "primary" | "accent" | "success";
}) {
  const toneClass = { primary: "text-primary", accent: "text-accent", success: "text-success" }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className={toneClass}>{icon}</span>
        {label}
      </div>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}
