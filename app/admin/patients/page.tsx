"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getLocation, getService } from "@/lib/domain";
import { cn, formatMoney, relativeWhen } from "@/lib/utils";
import { useAdmin } from "@/hooks/use-admin";
import { useStore, useStoreSnapshot } from "@/hooks/use-store";
import type { Patient, RecallStatus } from "@/lib/types";

const RECALL_BADGE: Record<RecallStatus, string> = {
  scheduled: "bg-success/15 text-success",
  due: "bg-warning/20 text-warning-foreground",
  overdue: "bg-accent/15 text-accent",
  lapsed: "bg-destructive/12 text-destructive",
};

export default function PatientsPage() {
  const { scope } = useAdmin();
  const store = useStore();
  const snap = useStoreSnapshot();
  const [q, setQ] = useState("");
  const [recallFilter, setRecallFilter] = useState<RecallStatus | "all">("all");
  const [selected, setSelected] = useState<Patient | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return snap.patients
      .filter((p) => (scope === "all" ? true : p.homeLocationId === scope))
      .filter((p) => recallFilter === "all" || p.recallStatus === recallFilter)
      .filter(
        (p) =>
          !needle ||
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(needle) ||
          p.phone.includes(needle),
      )
      .sort((a, b) => a.lastName.localeCompare(b.lastName))
      .slice(0, 200);
  }, [snap.patients, q, recallFilter, scope]);

  const history = useMemo(() => {
    if (!selected) return [];
    return snap.appointments
      .filter((a) => a.patientId === selected.id)
      .sort((a, b) => b.start.localeCompare(a.start));
  }, [selected, snap.appointments]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name or phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "due", "overdue", "lapsed", "scheduled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setRecallFilter(f)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                recallFilter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">{rows.length} patients</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border bg-secondary/40 text-xs text-muted-foreground">
            <tr>
              <Th>Patient</Th>
              <Th>Phone</Th>
              <Th>Last visit</Th>
              <Th>Next visit</Th>
              <Th className="text-right">Balance</Th>
              <Th className="text-center">No-shows</Th>
              <Th>Recall</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                onClick={() => setSelected(p)}
                className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-secondary/40"
              >
                <td className="p-2.5 font-medium">
                  {p.firstName} {p.lastName}
                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                    {getLocation(p.homeLocationId)?.shortName}
                  </span>
                </td>
                <td className="p-2.5 tabular-nums text-muted-foreground">{p.phone}</td>
                <td className="p-2.5 text-muted-foreground">
                  {p.lastVisit ? format(new Date(p.lastVisit), "MMM d, yyyy") : "—"}
                </td>
                <td className="p-2.5 text-muted-foreground">
                  {p.nextVisit ? format(new Date(p.nextVisit), "MMM d, yyyy") : "—"}
                </td>
                <td className={cn("p-2.5 text-right tabular-nums", p.balance > 0 && "font-semibold text-accent")}>
                  {p.balance > 0 ? formatMoney(p.balance) : "—"}
                </td>
                <td className="p-2.5 text-center tabular-nums">{p.noShowCount || "—"}</td>
                <td className="p-2.5">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", RECALL_BADGE[p.recallStatus])}>
                    {p.recallStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.firstName} {selected.lastName}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Phone" value={selected.phone} />
                <Field label="Email" value={selected.email || "—"} />
                <Field label="DOB" value={selected.dob || "—"} />
                <Field label="Home office" value={getLocation(selected.homeLocationId)?.shortName ?? "—"} />
                <Field label="Insurance" value={selected.insuranceCarrier ?? "Self-pay"} />
                <Field label="Balance" value={selected.balance ? formatMoney(selected.balance) : "$0"} />
                <Field label="No-shows" value={String(selected.noShowCount)} />
                <Field label="Recall" value={selected.recallStatus} />
              </div>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">Visit history</p>
              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {history.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 text-xs">
                    <span>
                      {getService(a.serviceId)?.shortName} · {getLocation(a.locationId)?.shortName}
                    </span>
                    <span className="text-muted-foreground">
                      {relativeWhen(a.start, { withTime: false })} · {a.status}
                    </span>
                  </div>
                ))}
                {history.length === 0 && <p className="text-xs text-muted-foreground">No visits on record.</p>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("p-2.5 text-left font-medium", className)}>{children}</th>;
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}
