"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { RefreshCw, Send, Loader2, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLocation } from "@/lib/domain";
import { cn, formatMoney } from "@/lib/utils";
import { useAdmin } from "@/hooks/use-admin";
import { useStore, useStoreSnapshot } from "@/hooks/use-store";
import type { Patient } from "@/lib/types";

export default function RecallPage() {
  const { scope } = useAdmin();
  const store = useStore();
  const snap = useStoreSnapshot();
  const [busy, setBusy] = useState<string | null>(null);

  const inScope = (p: Patient) => (scope === "all" ? true : p.homeLocationId === scope);

  const due = useMemo(
    () =>
      snap.patients.filter(
        (p) => inScope(p) && (p.recallStatus === "due" || p.recallStatus === "overdue") && !p.nextVisit,
      ),
    [snap.patients, scope],
  );
  const lapsed = useMemo(
    () => snap.patients.filter((p) => inScope(p) && p.recallStatus === "lapsed" && !p.nextVisit),
    [snap.patients, scope],
  );

  const dueRevenue = Math.round(due.length * 165 * 0.45);
  const lapsedRevenue = Math.round(lapsed.length * 320 * 0.18);

  async function send(kind: "recall" | "reactivation", patients: Patient[]) {
    setBusy(kind);
    const c = await store.sendCampaign(
      kind,
      patients.map((p) => p.id),
    );
    setBusy(null);
    toast.success(
      `${kind === "recall" ? "Recall" : "Reactivation"} campaign sent to ${c.patientIds.length} patients · ${formatMoney(
        c.estimatedRevenue,
      )} est. recoverable`,
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Cohort
        title="Due for a 6-month cleaning"
        icon={<Clock className="size-4" />}
        patients={due}
        revenue={dueRevenue}
        revenueLabel="est. recoverable production"
        cta="Send recall campaign"
        busy={busy === "recall"}
        onSend={() => send("recall", due)}
      />
      <Cohort
        title="Lapsed 12+ months"
        icon={<RefreshCw className="size-4" />}
        patients={lapsed}
        revenue={lapsedRevenue}
        revenueLabel="est. reactivation value"
        cta="Send reactivation campaign"
        busy={busy === "reactivation"}
        onSend={() => send("reactivation", lapsed)}
        accent
      />

      <div className="lg:col-span-2">
        <p className="mb-2 text-sm font-semibold">Campaign history</p>
        <div className="space-y-2">
          {snap.campaigns.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No campaigns sent yet.
            </p>
          )}
          {[...snap.campaigns]
            .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
            .map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm"
              >
                <span className="font-medium capitalize">{c.kind} campaign</span>
                <span className="text-muted-foreground">
                  {c.patientIds.length} patients · {c.channel.toUpperCase()} ·{" "}
                  {formatDistanceToNow(new Date(c.sentAt), { addSuffix: true })}
                </span>
                <span className="font-semibold text-success">{formatMoney(c.estimatedRevenue)}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function Cohort({
  title,
  icon,
  patients,
  revenue,
  revenueLabel,
  cta,
  busy,
  onSend,
  accent,
}: {
  title: string;
  icon: React.ReactNode;
  patients: Patient[];
  revenue: number;
  revenueLabel: string;
  cta: string;
  busy: boolean;
  onSend: () => void;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className={cn("flex size-8 items-center justify-center rounded-lg", accent ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary")}>
          {icon}
        </span>
        <p className="font-semibold">{title}</p>
      </div>

      <div className="mt-4 flex items-end gap-4">
        <div>
          <p className="text-3xl font-semibold tabular-nums">{patients.length}</p>
          <p className="text-xs text-muted-foreground">patients</p>
        </div>
        <div className="border-l border-border pl-4">
          <p className={cn("flex items-center gap-1 text-xl font-semibold tabular-nums", accent ? "text-accent" : "text-success")}>
            <TrendingUp className="size-4" />
            {formatMoney(revenue)}
          </p>
          <p className="text-xs text-muted-foreground">{revenueLabel}</p>
        </div>
      </div>

      <div className="mt-4 max-h-40 flex-1 space-y-1 overflow-y-auto">
        {patients.slice(0, 40).map((p) => (
          <div key={p.id} className="flex justify-between rounded-md px-2 py-1 text-xs hover:bg-secondary/50">
            <span>
              {p.firstName} {p.lastName}
            </span>
            <span className="text-muted-foreground">
              {getLocation(p.homeLocationId)?.shortName} · last {p.lastVisit ?? "—"}
            </span>
          </div>
        ))}
        {patients.length === 0 && <p className="text-xs text-muted-foreground">Nobody in this cohort right now.</p>}
      </div>

      <Button onClick={onSend} disabled={busy || patients.length === 0} className="mt-4 rounded-full">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {cta}
      </Button>
    </div>
  );
}
