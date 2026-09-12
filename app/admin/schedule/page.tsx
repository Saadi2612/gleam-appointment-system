"use client";

import { useMemo, useState } from "react";
import { addDays, format, isSameDay, startOfDay, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, CalendarCog, Trash2, SplitSquareHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCATIONS, PROVIDERS, getProvider, getService } from "@/lib/domain";
import { CATEGORY_STYLE } from "@/lib/service-style";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/hooks/use-admin";
import { useStore, useStoreSnapshot } from "@/hooks/use-store";
import { OperatoryBoard } from "@/components/admin/operatory-board";
import type { BlockKind, LiveLocationId, ProviderId, Weekday } from "@/lib/types";

type View = "day" | "week" | "provider";
const WD: Weekday[] = [1, 2, 3, 4, 5];

export default function SchedulePage() {
  const { scope, can } = useAdmin();
  const store = useStore();
  const snap = useStoreSnapshot();
  const [view, setView] = useState<View>("day");
  const [date, setDate] = useState(() => {
    let d = startOfDay(new Date());
    for (let i = 0; i < 7; i++) {
      if (LOCATIONS.some((l) => l.hours[d.getDay() as Weekday])) return d;
      d = addDays(d, 1);
    }
    return startOfDay(new Date());
  });

  const locationId: LiveLocationId = scope === "all" ? "atlantic-beach" : scope;
  const [viewLoc, setViewLoc] = useState<LiveLocationId>(locationId);
  const activeLoc = scope === "all" ? viewLoc : scope;

  const weekStart = startOfWeek(date, { weekStartsOn: 1 });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-border bg-card p-0.5 text-sm">
          {(["day", "week", "provider"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-medium capitalize transition-colors",
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          <button
            onClick={() => setDate((d) => addDays(d, view === "week" ? -7 : -1))}
            className="rounded-lg p-1.5 hover:bg-secondary"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="px-2 text-sm font-medium">
            {view === "week"
              ? `Week of ${format(weekStart, "MMM d")}`
              : isSameDay(date, new Date())
                ? "Today"
                : format(date, "EEE, MMM d")}
          </span>
          <button
            onClick={() => setDate((d) => addDays(d, view === "week" ? 7 : 1))}
            className="rounded-lg p-1.5 hover:bg-secondary"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {scope === "all" && (
          <Select value={viewLoc} onValueChange={(v) => setViewLoc(v as LiveLocationId)}>
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCATIONS.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.shortName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="ml-auto flex gap-2">
          {can("provider-split") && <ProviderSplitDialog />}
          <BlockTimeDialog locationId={activeLoc} date={date} />
        </div>
      </div>

      {view === "day" && <OperatoryBoard locationId={activeLoc} date={date} />}
      {view === "provider" && <ProviderView locationId={activeLoc} date={date} />}
      {view === "week" && <WeekView locationId={activeLoc} weekStart={weekStart} />}

      {/* existing blocks */}
      <div>
        <p className="mb-2 text-sm font-semibold">Blocks & PTO</p>
        <div className="space-y-1.5">
          {snap.blocks
            .filter((b) => b.locationId === activeLoc)
            .sort((a, b) => a.start.localeCompare(b.start))
            .map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase">
                  {b.kind}
                </span>
                <span className="flex-1">{b.reason}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(b.start), "EEE MMM d, h:mm a")}–{format(new Date(b.end), "h:mm a")}
                  {b.providerId ? ` · Dr. ${getProvider(b.providerId)?.lastName}` : " · whole office"}
                </span>
                <button
                  onClick={() => store.removeBlock(b.id).then(() => toast.success("Block removed"))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          {snap.blocks.filter((b) => b.locationId === activeLoc).length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              No blocks scheduled.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProviderView({ locationId, date }: { locationId: LiveLocationId; date: Date }) {
  const snap = useStoreSnapshot();
  const docs = PROVIDERS.filter((p) => p.locationIds.includes(locationId));
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {docs.map((p) => {
        const appts = snap.appointments
          .filter(
            (a) =>
              a.providerId === p.id &&
              a.locationId === locationId &&
              a.status !== "cancelled" &&
              isSameDay(new Date(a.start), date),
          )
          .sort((a, b) => a.start.localeCompare(b.start));
        const works = (p.schedule[locationId]?.[date.getDay() as Weekday]?.length ?? 0) > 0;
        return (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-3">
            <p className="text-sm font-semibold">
              Dr. {p.lastName}
              {!works && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">off today</span>}
            </p>
            <div className="mt-2 space-y-1.5">
              {appts.map((a) => {
                const svc = getService(a.serviceId)!;
                return (
                  <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-xs">
                    <span className={cn("size-2 rounded-full", CATEGORY_STYLE[svc.category].bar)} />
                    <span className="w-14 tabular-nums text-muted-foreground">{format(new Date(a.start), "h:mm a")}</span>
                    <span className="truncate">{svc.shortName}</span>
                    <span className="ml-auto text-muted-foreground">Ch {a.chair}</span>
                  </div>
                );
              })}
              {appts.length === 0 && works && (
                <p className="text-xs text-muted-foreground">Open all day.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekView({ locationId, weekStart }: { locationId: LiveLocationId; weekStart: Date }) {
  const snap = useStoreSnapshot();
  const docs = PROVIDERS.filter((p) => p.locationIds.includes(locationId));
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-border bg-secondary/40 text-xs text-muted-foreground">
          <tr>
            <th className="p-2.5 text-left font-medium">Provider</th>
            {WD.map((d) => (
              <th key={d} className="p-2.5 text-center font-medium">
                {format(addDays(weekStart, d - 1), "EEE d")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {docs.map((p) => (
            <tr key={p.id} className="border-b border-border/60 last:border-0">
              <td className="p-2.5 font-medium">Dr. {p.lastName}</td>
              {WD.map((d) => {
                const day = addDays(weekStart, d - 1);
                const appts = snap.appointments.filter(
                  (a) =>
                    a.providerId === p.id &&
                    a.locationId === locationId &&
                    a.status !== "cancelled" &&
                    isSameDay(new Date(a.start), day),
                );
                const works = (p.schedule[locationId]?.[d as Weekday]?.length ?? 0) > 0;
                const hours = appts.reduce((s, a) => s + (getService(a.serviceId)?.durationMin ?? 0), 0) / 60;
                return (
                  <td key={d} className="p-2.5 text-center">
                    {!works ? (
                      <span className="text-xs text-muted-foreground">off</span>
                    ) : (
                      <span
                        className={cn(
                          "inline-block rounded-md px-2 py-1 text-xs font-medium tabular-nums",
                          appts.length ? "bg-primary/10 text-primary" : "text-muted-foreground",
                        )}
                      >
                        {appts.length} · {hours.toFixed(1)}h
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlockTimeDialog({ locationId, date }: { locationId: LiveLocationId; date: Date }) {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<string>("all");
  const [d, setD] = useState(format(date, "yyyy-MM-dd"));
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("13:00");
  const [kind, setKind] = useState<BlockKind>("block");
  const [reason, setReason] = useState("");

  const docs = PROVIDERS.filter((p) => p.locationIds.includes(locationId));

  async function save() {
    if (!reason.trim()) return;
    await store.addBlock({
      locationId,
      providerId: provider === "all" ? undefined : (provider as ProviderId),
      start: new Date(`${d}T${start}`).toISOString(),
      end: new Date(`${d}T${end}`).toISOString(),
      kind,
      reason,
    });
    toast.success("Block added to the schedule");
    setOpen(false);
    setReason("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-full">
          <Plus className="size-4" /> Block time
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCog className="size-4" /> Block time / PTO
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Whole office</SelectItem>
                {docs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    Dr. {p.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={d} onChange={(e) => setD(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Start</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as BlockKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="block">Block</SelectItem>
                <SelectItem value="pto">PTO</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Dr. Weaver — CE course" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} className="rounded-full">
            Add block
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProviderSplitDialog() {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const existing = store.getScheduleOverride("murphy");
  const murphy = getProvider("murphy")!;
  const defaultAssign = (wd: Weekday): LiveLocationId | "off" => {
    if (murphy.schedule["atlantic-beach"]?.[wd]?.length) return "atlantic-beach";
    if (murphy.schedule["bartram-park"]?.[wd]?.length) return "bartram-park";
    return "off";
  };
  const [assign, setAssign] = useState<Record<number, LiveLocationId | "off">>(() =>
    Object.fromEntries(WD.map((d) => [d, existing?.assignment[d] ?? defaultAssign(d)])),
  );

  async function save() {
    await store.setScheduleOverride("murphy", assign);
    toast.success("Dr. Murphy's location split updated — feeds the booking engine on next publish");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-full">
          <SplitSquareHorizontal className="size-4" /> Provider split
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Dr. Murphy — location split</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Dr. Murphy works across both offices. Set which location he's at each weekday.
        </p>
        <div className="mt-2 space-y-2">
          {WD.map((d) => (
            <div key={d} className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium">{format(new Date(2026, 0, 4 + d), "EEEE")}</span>
              <Select
                value={assign[d]}
                onValueChange={(v) => setAssign((a) => ({ ...a, [d]: v as LiveLocationId | "off" }))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="atlantic-beach">Atlantic Beach</SelectItem>
                  <SelectItem value="bartram-park">Bartram Park</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} className="rounded-full">
            Save split
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
