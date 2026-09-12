import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/lib/types";

export const STATUS_META: Record<AppointmentStatus, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-secondary text-muted-foreground" },
  confirmed: { label: "Confirmed", className: "bg-info/15 text-info" },
  "checked-in": { label: "Checked In", className: "bg-warning/20 text-warning-foreground" },
  "in-chair": { label: "In Chair", className: "bg-primary/15 text-primary" },
  complete: { label: "Complete", className: "bg-success/15 text-success" },
  "no-show": { label: "No-Show", className: "bg-destructive/12 text-destructive" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground line-through" },
};

export const NEXT_STATUS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  scheduled: ["confirmed", "checked-in", "no-show"],
  confirmed: ["checked-in", "no-show"],
  "checked-in": ["in-chair", "no-show"],
  "in-chair": ["complete"],
  complete: [],
  "no-show": ["confirmed"],
};

export function StatusChip({ status, className }: { status: AppointmentStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
        m.className,
        className,
      )}
    >
      {m.label}
    </span>
  );
}
