import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import type { DayHours } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(n: number, opts: { cents?: boolean } = {}): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  }).format(n);
}

export function initials(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

/** "Tomorrow 9:20 AM" / "Mon, Sep 8 at 9:20 AM" */
export function relativeWhen(iso: string | Date, opts: { withTime?: boolean } = { withTime: true }): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const days = differenceInCalendarDays(startOfDay(d), startOfDay(new Date()));
  const rel =
    days === 0 ? "Today" : days === 1 ? "Tomorrow" : days === -1 ? "Yesterday" : format(d, "EEE, MMM d");
  return opts.withTime ? `${rel} ${format(d, "h:mm a")}` : rel;
}

export function timeRange(startISO: string, endISO: string): string {
  return `${format(new Date(startISO), "h:mm")}–${format(new Date(endISO), "h:mm a")}`;
}

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Compact hours summary like "Mon–Thu 8–5 · Fri 8–2 · Sat/Sun closed" */
export function hoursSummary(hours: (DayHours | null)[]): string[] {
  const parts: string[] = [];
  let i = 1;
  while (i <= 5) {
    const h = hours[i];
    if (!h) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 <= 5 && sameHours(hours[j + 1], h)) j++;
    const label = i === j ? WD[i] : `${WD[i]}–${WD[j]}`;
    parts.push(`${label} ${fmtClock(h.open)}–${fmtClock(h.close)}`);
    i = j + 1;
  }
  parts.push("Sat/Sun closed");
  return parts;
}

function sameHours(a: DayHours | null, b: DayHours | null): boolean {
  if (!a || !b) return false;
  return a.open === b.open && a.close === b.close;
}
function fmtClock(c: string): string {
  const [h, m] = c.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hr}${ampm}` : `${hr}:${String(m).padStart(2, "0")}${ampm}`;
}

export function mapsUrl(address: string, city: string, state: string, zip: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${address}, ${city}, ${state} ${zip}`,
  )}`;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
