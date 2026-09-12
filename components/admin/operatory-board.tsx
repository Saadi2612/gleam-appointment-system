"use client";

import { useMemo, useRef, useState } from "react";
import { format, isSameDay, startOfDay } from "date-fns";
import { toast } from "sonner";
import { GripVertical } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getLocation, getProvider, getService } from "@/lib/domain";
import { CATEGORY_STYLE } from "@/lib/service-style";
import { cn } from "@/lib/utils";
import { useStore, useStoreSnapshot } from "@/hooks/use-store";
import type { Appointment, LiveLocationId } from "@/lib/types";
import { StatusChip, STATUS_META, NEXT_STATUS } from "./status-chip";

const DAY_START = 8 * 60;
const DAY_END = 17 * 60;
const STEP = 15;
const PX = 16; // px per 15-min step
const STEPS = (DAY_END - DAY_START) / STEP;

export function OperatoryBoard({ locationId, date }: { locationId: LiveLocationId; date: Date }) {
  const store = useStore();
  const snap = useStoreSnapshot();
  const loc = getLocation(locationId)!;
  const grabOffset = useRef(0);
  const [dragId, setDragId] = useState<string | null>(null);

  const patients = useMemo(() => {
    const m = new Map(snap.patients.map((p) => [p.id, p]));
    return m;
  }, [snap.patients]);

  const appts = useMemo(
    () =>
      snap.appointments.filter(
        (a) => a.locationId === locationId && a.status !== "cancelled" && isSameDay(new Date(a.start), date),
      ),
    [snap.appointments, locationId, date],
  );
  const blocks = useMemo(
    () => snap.blocks.filter((b) => b.locationId === locationId && isSameDay(new Date(b.start), date)),
    [snap.blocks, locationId, date],
  );

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const showNow = isSameDay(date, new Date()) && nowMin >= DAY_START && nowMin <= DAY_END;

  function yToStart(clientY: number, colTop: number): Date {
    const y = clientY - colTop - grabOffset.current;
    let step = Math.round(y / PX);
    step = Math.max(0, Math.min(STEPS - 1, step));
    const min = DAY_START + step * STEP;
    return new Date(startOfDay(date).getTime() + min * 60_000);
  }

  async function onDrop(chair: number, clientY: number, colTop: number) {
    if (!dragId) return;
    const start = yToStart(clientY, colTop);
    const res = await store.moveAppointment(dragId, { chair, start: start.toISOString() });
    setDragId(null);
    if (!res.ok) toast.error(`Can't move there — ${res.conflict}`);
    else toast.success(`Moved to chair ${chair} · ${format(start, "h:mm a")}`);
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <div className="min-w-[640px]">
        {/* header row */}
        <div
          className="grid border-b border-border bg-secondary/40 text-xs font-semibold"
          style={{ gridTemplateColumns: `56px repeat(${loc.chairs}, 1fr)` }}
        >
          <div className="p-2 text-muted-foreground">Time</div>
          {Array.from({ length: loc.chairs }, (_, i) => (
            <div key={i} className="border-l border-border p-2 text-center">
              Chair {i + 1}
            </div>
          ))}
        </div>

        {/* body */}
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `56px repeat(${loc.chairs}, 1fr)`, height: STEPS * PX }}
        >
          {/* time gutter */}
          <div className="relative border-r border-border">
            {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => (
              <div
                key={i}
                className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                style={{ top: i * 4 * PX }}
              >
                {format(new Date(0, 0, 0, 8 + i), "h a")}
              </div>
            ))}
          </div>

          {/* chair columns */}
          {Array.from({ length: loc.chairs }, (_, ci) => {
            const chair = ci + 1;
            const colAppts = appts.filter((a) => a.chair === chair);
            return (
              <div
                key={chair}
                className="relative border-l border-border"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  onDrop(chair, e.clientY, rect.top);
                }}
              >
                {/* hour gridlines */}
                {Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute inset-x-0 border-t border-border/50"
                    style={{ top: i * 4 * PX }}
                  />
                ))}
                {colAppts.map((a) => (
                  <ApptCard
                    key={a.id}
                    appt={a}
                    patientName={
                      patients.get(a.patientId)
                        ? `${patients.get(a.patientId)!.firstName} ${patients.get(a.patientId)!.lastName}`
                        : "Patient"
                    }
                    onDragStart={(offsetY) => {
                      grabOffset.current = offsetY;
                      setDragId(a.id);
                    }}
                    onDragEnd={() => setDragId(null)}
                    onStatus={async (s) => {
                      await store.setAppointmentStatus(a.id, s);
                      // marking a visit complete kicks off the review request
                      if (s === "complete") {
                        await store.requestReview(a.id);
                        toast.success("Visit complete — review request sent", {
                          description: "4–5★ routes to Google, 1–3★ opens a private form.",
                        });
                      }
                    }}
                  />
                ))}
              </div>
            );
          })}

          {/* block bands over the columns */}
          <div className="pointer-events-none absolute inset-y-0" style={{ left: 56, right: 0 }}>
            {blocks.map((b) => {
              const s = new Date(b.start);
              const e = new Date(b.end);
              const top = ((s.getHours() * 60 + s.getMinutes() - DAY_START) / STEP) * PX;
              const h = ((e.getTime() - s.getTime()) / 60000 / STEP) * PX;
              return (
                <div
                  key={b.id}
                  className="absolute inset-x-0 flex items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-muted/70 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-[1px]"
                  style={{ top, height: Math.max(h, 14) }}
                >
                  {b.reason}
                </div>
              );
            })}
          </div>

          {/* now line */}
          {showNow && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
              style={{ top: ((nowMin - DAY_START) / STEP) * PX }}
            >
              <span className="ml-[52px] size-2 rounded-full bg-destructive" />
              <span className="h-px flex-1 bg-destructive" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApptCard({
  appt,
  patientName,
  onDragStart,
  onDragEnd,
  onStatus,
}: {
  appt: Appointment;
  patientName: string;
  onDragStart: (offsetY: number) => void;
  onDragEnd: () => void;
  onStatus: (s: Appointment["status"]) => void | Promise<void>;
}) {
  const svc = getService(appt.serviceId)!;
  const prov = getProvider(appt.providerId)!;
  const style = CATEGORY_STYLE[svc.category];
  const s = new Date(appt.start);
  const top = ((s.getHours() * 60 + s.getMinutes() - DAY_START) / STEP) * PX;
  const height = (svc.durationMin / STEP) * PX;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          draggable
          onDragStart={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            onDragStart(e.clientY - rect.top);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragEnd={onDragEnd}
          className={cn(
            "group absolute inset-x-1 cursor-grab overflow-hidden rounded-lg border px-1.5 py-1 text-left shadow-soft transition-shadow hover:z-20 hover:shadow-lift active:cursor-grabbing",
            style.soft,
            "border-border",
          )}
          style={{ top: top + 1, height: height - 2 }}
        >
          <span className={cn("absolute inset-y-0 left-0 w-1", style.bar)} />
          <div className="flex items-center gap-1 pl-1">
            <span className="truncate text-[11px] font-semibold">{patientName}</span>
          </div>
          <div className="flex items-center gap-1 pl-1 text-[10px] text-muted-foreground">
            <span className="truncate">{svc.shortName}</span>
          </div>
          {height > 44 && (
            <div className="mt-0.5 flex items-center gap-1 pl-1">
              <StatusChip status={appt.status} />
              <span className="text-[9px] text-muted-foreground">Dr. {prov.lastName}</span>
            </div>
          )}
          <GripVertical className="absolute right-0.5 top-1 size-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-60" align="start">
        <p className="text-sm font-semibold">{patientName}</p>
        <p className="text-xs text-muted-foreground">
          {svc.name} · {format(s, "h:mm a")}–{format(new Date(appt.end), "h:mm a")}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Dr. {prov.firstName} {prov.lastName} · Chair {appt.chair}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <StatusChip status={appt.status} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(NEXT_STATUS[appt.status] ?? []).map((s) => (
            <button
              key={s}
              onClick={() => onStatus(s)}
              className="rounded-full border border-border px-2 py-1 text-[11px] font-medium hover:bg-secondary"
            >
              → {STATUS_META[s].label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
