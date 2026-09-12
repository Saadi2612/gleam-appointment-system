import {
  addDays,
  addMinutes,
  format,
  isSameDay,
  parse,
  startOfDay,
} from "date-fns";
import { LOCATIONS, PROVIDERS, getLocation, getProvider, getService, providersFor } from "./domain";
import type {
  Appointment,
  DayAvailability,
  DayHours,
  LiveLocationId,
  Provider,
  ProviderId,
  Service,
  Slot,
  Weekday,
} from "./types";

export const SLOT_STEP_MIN = 10;
/** How far ahead a same-day online booking must be. Emergency overrides this. */
export const DEFAULT_LEAD_MIN = 120;
export const EMERGENCY_LEAD_MIN = 30;
const WEEKDAY_LABEL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface AvailabilityQuery {
  serviceId: string;
  locationId: LiveLocationId;
  providerId?: ProviderId | "any";
  /** ISO date or Date; single day */
  date: Date | string;
  /** existing booked appointments to avoid */
  appointments: Appointment[];
  /** treat as an emergency same-day request */
  emergency?: boolean;
  /** "now" override for deterministic demos */
  now?: Date;
}

interface Interval {
  start: Date;
  end: Date;
}

function clockToDate(day: Date, clock: string): Date {
  return parse(clock, "HH:mm", startOfDay(day));
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** working window(s) for one provider at one location on one calendar day */
function workingWindows(
  provider: Provider,
  locationId: LiveLocationId,
  day: Date,
): { windows: Interval[]; hours: DayHours | null } {
  const loc = getLocation(locationId)!;
  const weekday = day.getDay() as Weekday;
  const hours = loc.hours[weekday];
  if (!hours) return { windows: [], hours: null };

  const locOpen = clockToDate(day, hours.open);
  const locClose = clockToDate(day, hours.close);

  const shifts = provider.schedule[locationId]?.[weekday] ?? [];
  const windows: Interval[] = [];
  for (const sh of shifts) {
    const s = clockToDate(day, sh.start);
    const e = clockToDate(day, sh.end);
    const start = s > locOpen ? s : locOpen;
    const end = e < locClose ? e : locClose;
    if (start < end) windows.push({ start, end });
  }
  return { windows, hours };
}

function busyForProvider(
  appointments: Appointment[],
  providerId: ProviderId,
  day: Date,
): Interval[] {
  return appointments
    .filter(
      (a) =>
        a.providerId === providerId &&
        a.status !== "cancelled" &&
        a.status !== "no-show" &&
        isSameDay(new Date(a.start), day),
    )
    .map((a) => {
      const svc = getService(a.serviceId);
      return {
        start: new Date(a.start),
        end: addMinutes(new Date(a.end), svc?.bufferMin ?? 10),
      };
    });
}

/** chair -> busy intervals, for one location + day */
function busyByChair(
  appointments: Appointment[],
  locationId: LiveLocationId,
  day: Date,
): Map<number, Interval[]> {
  const map = new Map<number, Interval[]>();
  for (const a of appointments) {
    if (a.locationId !== locationId) continue;
    if (a.status === "cancelled" || a.status === "no-show") continue;
    if (!isSameDay(new Date(a.start), day)) continue;
    const svc = getService(a.serviceId);
    const iv = {
      start: new Date(a.start),
      end: addMinutes(new Date(a.end), svc?.bufferMin ?? 10),
    };
    const list = map.get(a.chair) ?? [];
    list.push(iv);
    map.set(a.chair, list);
  }
  return map;
}

function firstFreeChair(
  chairs: number,
  chairBusy: Map<number, Interval[]>,
  need: Interval,
): number | null {
  for (let c = 1; c <= chairs; c++) {
    const list = chairBusy.get(c) ?? [];
    if (!list.some((iv) => overlaps(iv, need))) return c;
  }
  return null;
}

function slotsForProviderDay(
  provider: Provider,
  service: Service,
  locationId: LiveLocationId,
  day: Date,
  appointments: Appointment[],
  minStart: Date,
): Slot[] {
  const loc = getLocation(locationId)!;
  const { windows, hours } = workingWindows(provider, locationId, day);
  if (!hours || windows.length === 0) return [];

  const lunch: Interval | null = hours.lunch
    ? { start: clockToDate(day, hours.lunch[0]), end: clockToDate(day, hours.lunch[1]) }
    : null;

  const provBusy = busyForProvider(appointments, provider.id, day);
  const chairBusy = busyByChair(appointments, locationId, day);
  const dur = service.durationMin;

  const out: Slot[] = [];
  for (const w of windows) {
    let t = new Date(w.start);
    while (addMinutes(t, dur) <= w.end) {
      const need: Interval = { start: t, end: addMinutes(t, dur) };
      const ok =
        t >= minStart &&
        !(lunch && overlaps(need, lunch)) &&
        !provBusy.some((iv) => overlaps(iv, need));
      if (ok) {
        const chair = firstFreeChair(loc.chairs, chairBusy, need);
        if (chair != null) {
          out.push({
            start: t.toISOString(),
            end: need.end.toISOString(),
            providerId: provider.id,
            locationId,
            chair,
          });
        }
      }
      t = addMinutes(t, SLOT_STEP_MIN);
    }
  }
  return out;
}

/** All slots for a single day, honoring every rule. */
export function getDayAvailability(q: AvailabilityQuery): DayAvailability {
  const day = typeof q.date === "string" ? new Date(q.date) : q.date;
  const service = getService(q.serviceId)!;
  const loc = getLocation(q.locationId)!;
  const weekday = day.getDay() as Weekday;
  const now = q.now ?? new Date();
  const lead = q.emergency ? EMERGENCY_LEAD_MIN : DEFAULT_LEAD_MIN;
  const minStart = isSameDay(day, now) ? addMinutes(now, lead) : startOfDay(day);

  const hours = loc.hours[weekday];
  if (!hours) {
    return {
      date: format(day, "yyyy-MM-dd"),
      weekday,
      open: false,
      note: `${loc.shortName} is closed ${WEEKDAY_LABEL[weekday]}s`,
      slots: [],
    };
  }

  let candidates = PROVIDERS.filter((p) => {
    if (!p.serviceIds.includes(service.id)) return false;
    if (!p.locationIds.includes(q.locationId)) return false;
    if (q.providerId && q.providerId !== "any" && p.id !== q.providerId) return false;
    return true;
  });
  // emergency: any qualified provider
  if (q.emergency && candidates.length === 0) {
    candidates = providersFor("emergency", q.locationId);
  }

  const all: Slot[] = [];
  for (const p of candidates) {
    all.push(...slotsForProviderDay(p, service, q.locationId, day, q.appointments, minStart));
  }
  all.sort((a, b) => a.start.localeCompare(b.start) || a.providerId.localeCompare(b.providerId));

  // when "any" provider: keep one provider per start time (earliest-sorted wins)
  let slots = all;
  if (!q.providerId || q.providerId === "any") {
    const seen = new Set<string>();
    slots = all.filter((s) => {
      if (seen.has(s.start)) return false;
      seen.add(s.start);
      return true;
    });
  }

  let note: string | undefined;
  const shortFriday = weekday === 5;
  if (shortFriday) note = `Closed Fridays after ${format(clockToDate(day, hours.close), "h:mm a")}`;
  else if (hours.lunch)
    note = `Lunch break ${format(clockToDate(day, hours.lunch[0]), "h:mm")}–${format(
      clockToDate(day, hours.lunch[1]),
      "h:mm a",
    )}`;

  return {
    date: format(day, "yyyy-MM-dd"),
    weekday,
    open: true,
    note,
    slots,
  };
}

/** Availability across a date range (inclusive of `from`, `days` long). */
export function getRangeAvailability(
  q: Omit<AvailabilityQuery, "date"> & { from: Date; days: number },
): DayAvailability[] {
  const out: DayAvailability[] = [];
  for (let i = 0; i < q.days; i++) {
    const date = addDays(startOfDay(q.from), i);
    out.push(getDayAvailability({ ...q, date }));
  }
  return out;
}

/** The single earliest slot from `from`, scanning up to `withinDays`. */
export function nextAvailable(
  q: Omit<AvailabilityQuery, "date"> & { from?: Date; withinDays?: number },
): Slot | null {
  const from = startOfDay(q.from ?? q.now ?? new Date());
  const withinDays = q.withinDays ?? 30;
  for (let i = 0; i < withinDays; i++) {
    const day = getDayAvailability({ ...q, date: addDays(from, i) });
    if (day.slots.length) return day.slots[0];
  }
  return null;
}

/** Earliest slot at EITHER live location. */
export function soonestAnywhere(
  q: Omit<AvailabilityQuery, "date" | "locationId"> & { from?: Date; withinDays?: number },
): Slot | null {
  let best: Slot | null = null;
  for (const loc of LOCATIONS) {
    const s = nextAvailable({ ...q, locationId: loc.id });
    if (s && (!best || s.start < best.start)) best = s;
  }
  return best;
}

/** Concurrent (same start) or back-to-back slots for N family members. */
export function findFamilySlots(
  q: Omit<AvailabilityQuery, "date" | "serviceId" | "providerId"> & {
    serviceIds: string[];
    from?: Date;
    withinDays?: number;
    mode?: "concurrent" | "back-to-back";
  },
): { start: string; slots: Slot[] } | null {
  const from = startOfDay(q.from ?? q.now ?? new Date());
  const withinDays = q.withinDays ?? 21;
  const mode = q.mode ?? "concurrent";

  for (let i = 0; i < withinDays; i++) {
    const date = addDays(from, i);
    // build per-service day availability once
    const perService = q.serviceIds.map((sid) =>
      getDayAvailability({
        serviceId: sid,
        locationId: q.locationId,
        providerId: "any",
        date,
        appointments: q.appointments,
        now: q.now,
      }),
    );
    if (perService.some((d) => d.slots.length === 0)) continue;

    if (mode === "concurrent") {
      // find a start time present in every service's list, on distinct chairs/providers
      const firstList = perService[0].slots;
      for (const anchor of firstList) {
        const chosen: Slot[] = [];
        const usedChairs = new Set<number>();
        const usedProviders = new Set<string>();
        let ok = true;
        for (const day of perService) {
          const match = day.slots.find(
            (s) =>
              s.start === anchor.start &&
              !usedChairs.has(s.chair) &&
              !usedProviders.has(s.providerId),
          );
          if (!match) {
            ok = false;
            break;
          }
          chosen.push(match);
          usedChairs.add(match.chair);
          usedProviders.add(match.providerId);
        }
        if (ok) return { start: anchor.start, slots: chosen };
      }
    } else {
      // back-to-back: chain slots so each starts when the previous ends
      const firstList = perService[0].slots;
      for (const anchor of firstList) {
        const chosen: Slot[] = [anchor];
        let cursor = anchor.end;
        let ok = true;
        for (let k = 1; k < perService.length; k++) {
          const match = perService[k].slots.find((s) => s.start === cursor);
          if (!match) {
            ok = false;
            break;
          }
          chosen.push(match);
          cursor = match.end;
        }
        if (ok) return { start: anchor.start, slots: chosen };
      }
    }
  }
  return null;
}

export function labelWeekday(w: Weekday): string {
  return WEEKDAY_LABEL[w];
}
