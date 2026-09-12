"use client";

import { useMemo, useState } from "react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LOCATIONS, getLocation } from "@/lib/domain";
import type { Weekday } from "@/lib/types";
import { CATEGORY_STYLE } from "@/lib/service-style";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/hooks/use-admin";
import { useStoreSnapshot } from "@/hooks/use-store";
import { OperatoryBoard } from "@/components/admin/operatory-board";
import type { LiveLocationId } from "@/lib/types";

export default function TodayPage() {
  const { scope } = useAdmin();
  const snap = useStoreSnapshot();

  const locs: LiveLocationId[] = scope === "all" ? LOCATIONS.map((l) => l.id) : [scope];

  // if the practice is closed today (weekend), open on the next working day
  const openInitial = () => {
    let d = startOfDay(new Date());
    for (let i = 0; i < 7; i++) {
      if (locs.some((id) => getLocation(id)!.hours[d.getDay() as Weekday])) return d;
      d = addDays(d, 1);
    }
    return startOfDay(new Date());
  };
  const [date, setDate] = useState(openInitial);
  const closedToday = !locs.some((id) => getLocation(id)!.hours[new Date().getDay() as Weekday]);

  const dayAppts = useMemo(
    () =>
      snap.appointments.filter(
        (a) => isSameDay(new Date(a.start), date) && locs.includes(a.locationId) && a.status !== "cancelled",
      ),
    [snap.appointments, date, locs],
  );

  const stats = {
    total: dayAppts.length,
    checkedIn: dayAppts.filter((a) => a.status === "checked-in").length,
    inChair: dayAppts.filter((a) => a.status === "in-chair").length,
    complete: dayAppts.filter((a) => a.status === "complete").length,
    noShow: dayAppts.filter((a) => a.status === "no-show").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          <button onClick={() => setDate((d) => addDays(d, -1))} className="rounded-lg p-1.5 hover:bg-secondary">
            <ChevronLeft className="size-4" />
          </button>
          <span className="flex items-center gap-1.5 px-2 text-sm font-medium">
            <CalendarDays className="size-4 text-primary" />
            {isSameDay(date, new Date()) ? "Today" : format(date, "EEE, MMM d")}
          </span>
          <button onClick={() => setDate((d) => addDays(d, 1))} className="rounded-lg p-1.5 hover:bg-secondary">
            <ChevronRight className="size-4" />
          </button>
        </div>
        {!isSameDay(date, new Date()) && (
          <Button variant="ghost" size="sm" onClick={() => setDate(startOfDay(new Date()))}>
            Jump to today
          </Button>
        )}

        <div className="ml-auto flex flex-wrap gap-2 text-xs">
          <Stat label="Booked" value={stats.total} />
          <Stat label="Checked in" value={stats.checkedIn} tone="warning" />
          <Stat label="In chair" value={stats.inChair} tone="primary" />
          <Stat label="Complete" value={stats.complete} tone="success" />
          <Stat label="No-show" value={stats.noShow} tone="destructive" />
        </div>
      </div>

      {closedToday && (
        <p className="inline-flex items-center gap-1.5 rounded-lg bg-warning/12 px-2.5 py-1 text-xs font-medium text-warning-foreground">
          <Info className="size-3.5" />
          Both offices are closed today — showing the next working day.
        </p>
      )}

      <Legend />

      <div className="space-y-6">
        {locs.map((id) => (
          <div key={id}>
            {scope === "all" && (
              <p className="mb-2 text-sm font-semibold">{LOCATIONS.find((l) => l.id === id)!.name}</p>
            )}
            <OperatoryBoard locationId={id} date={date} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: number;
  tone?: "muted" | "warning" | "primary" | "success" | "destructive";
}) {
  const toneClass = {
    muted: "text-muted-foreground",
    warning: "text-warning-foreground",
    primary: "text-primary",
    success: "text-success",
    destructive: "text-destructive",
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-card px-2.5 py-1.5">
      <span className={cn("text-sm font-semibold tabular-nums", toneClass)}>{value}</span>{" "}
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
      {Object.entries(CATEGORY_STYLE).map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-full", v.bar)} />
          {v.label}
        </span>
      ))}
      <span className="ml-2">Drag a card to reschedule · click for status</span>
    </div>
  );
}
