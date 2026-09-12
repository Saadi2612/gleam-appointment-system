import {
  addDays,
  addMinutes,
  differenceInCalendarDays,
  format,
  setHours,
  setMinutes,
  startOfDay,
  subDays,
  subYears,
} from "date-fns";
import { LOCATIONS, PROVIDERS, SERVICES, getService } from "./domain";
import type {
  Appointment,
  AppointmentStatus,
  BookingSource,
  Campaign,
  ComingSoonLead,
  IntakeForm,
  LiveLocationId,
  Member,
  MembershipTier,
  NotificationRecord,
  Patient,
  ProviderId,
  RecallStatus,
  ReviewResponse,
  ScheduleBlock,
  ScheduleOverride,
  SmileDesignSubmission,
  WaitlistEntry,
  Weekday,
} from "./types";

// ---------------------------------------------------------------------------
// Deterministic synthetic data. 100% fake. Seeded relative to "now" so the
// demo never looks stale. Tune the knobs at the top of this file before a pitch.
// ---------------------------------------------------------------------------

export const SEED_CONFIG = {
  patients: 240,
  /** appointments are generated per-day to a realistic fill rate, not a fixed count */
  pastDays: 60,
  futureDays: 45,
  waitlistActive: 13,
  comingSoonLeads: 34,
  seed: 20260830, // fixed; keeps a pitch reproducible
};

// mulberry32 — tiny deterministic PRNG
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "James", "Maria", "Robert", "Jennifer", "Michael", "Linda", "David", "Patricia",
  "Carlos", "Ashley", "Jose", "Jessica", "Daniel", "Amanda", "Anthony", "Sarah",
  "Andre", "Destiny", "Marcus", "Keisha", "Tyrone", "Latoya", "DeShawn", "Imani",
  "Luis", "Sofia", "Miguel", "Camila", "Diego", "Valentina", "Mateo", "Isabella",
  "William", "Emily", "Christopher", "Madison", "Joshua", "Olivia", "Ethan", "Ava",
  "Ryan", "Grace", "Nathan", "Chloe", "Brandon", "Hannah", "Kevin", "Samantha",
  "Aaliyah", "Xavier", "Priya", "Aiden", "Nguyen", "Mei", "Omar", "Fatima",
  "Bradley", "Savannah", "Colton", "Peyton", "Dalton", "Raylan", "Braxton", "Amelia",
];
const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Rivera", "Campbell", "Mitchell", "Carter",
  "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz",
];
const STREETS = [
  "Beach Blvd", "Atlantic Blvd", "Hodges Blvd", "San Pablo Rd", "Kernan Blvd",
  "Southside Blvd", "Old St. Augustine Rd", "Baymeadows Rd", "Gate Pkwy", "Butler Blvd",
  "3rd St", "Mayport Rd", "Girvin Rd", "McCormick Rd", "Monument Rd", "Racetrack Rd",
];
const CONDITIONS = [
  "High blood pressure", "Diabetes (Type 2)", "Asthma", "Heart murmur",
  "Acid reflux", "Thyroid condition", "Anxiety", "Pregnancy",
];
const ALLERGIES = ["Penicillin", "Latex", "Codeine", "Sulfa drugs", "Aspirin", "Local anesthetic (mild)"];
const CARRIERS_WEIGHTED: (string | null)[] = [
  "Delta Dental", "Delta Dental", "Delta Dental", "MetLife", "MetLife",
  "Cigna Dental", "Aetna", "Guardian", "United Concordia", "Humana Dental",
  "BlueCross BlueShield (FL)", null, null,
];
const SOURCES: BookingSource[] = ["online", "online", "online", "phone", "phone", "referral", "google", "walk-in"];

function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)];
}
function int(r: () => number, min: number, max: number): number {
  return Math.floor(r() * (max - min + 1)) + min;
}
function chance(r: () => number, p: number): boolean {
  return r() < p;
}
function phone(r: () => number): string {
  return `(904) ${int(r, 200, 989)}-${String(int(r, 1000, 9999))}`;
}
function id(prefix: string, n: number): string {
  return `${prefix}_${String(n).padStart(4, "0")}`;
}
function token(r: () => number): string {
  return Array.from({ length: 10 }, () => "abcdefghjkmnpqrstuvwxyz23456789"[Math.floor(r() * 30)]).join("");
}

// --- schedule-aware slot helper ------------------------------------------
function locHours(locId: LiveLocationId, day: Date) {
  const loc = LOCATIONS.find((l) => l.id === locId)!;
  return loc.hours[day.getDay() as Weekday];
}
function toMinutes(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}
function providerWorksAt(pid: ProviderId, locId: LiveLocationId, day: Date): boolean {
  const p = PROVIDERS.find((x) => x.id === pid)!;
  const wd = day.getDay() as Weekday;
  return (p.schedule[locId]?.[wd]?.length ?? 0) > 0;
}

interface UsedMap {
  [key: string]: [number, number][]; // `${locId}:${chair}` or `prov:${pid}` -> [startMs,endMs]
}
function tryPlace(
  used: UsedMap,
  locId: LiveLocationId,
  chairs: number,
  pid: ProviderId,
  start: Date,
  durMin: number,
  bufMin: number,
  chairStart = 0,
): number | null {
  const s = start.getTime();
  const e = s + (durMin + bufMin) * 60_000;
  const provKey = `prov:${pid}`;
  const pClash = (used[provKey] ?? []).some(([a, b]) => s < b && a < e);
  if (pClash) return null;
  for (let i = 0; i < chairs; i++) {
    const c = ((chairStart + i) % chairs) + 1;
    const cKey = `${locId}:${c}`;
    const clash = (used[cKey] ?? []).some(([a, b]) => s < b && a < e);
    if (!clash) {
      (used[provKey] ??= []).push([s, e]);
      (used[cKey] ??= []).push([s, e]);
      return c;
    }
  }
  return null;
}

export interface SeedData {
  generatedAt: string;
  patients: Patient[];
  appointments: Appointment[];
  waitlist: WaitlistEntry[];
  comingSoonLeads: ComingSoonLead[];
  notifications: NotificationRecord[];
  intakeForms: IntakeForm[];
  blocks: ScheduleBlock[];
  scheduleOverrides: ScheduleOverride[];
  campaigns: Campaign[];
  members: Member[];
  smileDesigns: SmileDesignSubmission[];
  reviews: ReviewResponse[];
  /** appointment ids pre-wired for the one-click cancellation-recovery demo */
  demoScenario: { cancellableAppointmentIds: string[]; todayLocation: LiveLocationId };
}

export function generateSeed(now: Date = new Date()): SeedData {
  const r = rng(SEED_CONFIG.seed);
  const today = startOfDay(now);

  // -- patients ----------------------------------------------------------
  const patients: Patient[] = [];
  let famCounter = 0;
  for (let i = 0; i < SEED_CONFIG.patients; i++) {
    const homeLocationId = pick(r, LOCATIONS).id as LiveLocationId;
    const carrier = pick(r, CARRIERS_WEIGHTED);
    const lastName = pick(r, LAST_NAMES);
    // ~22% of patients belong to a family group
    let familyGroupId: string | undefined;
    if (chance(r, 0.22)) {
      if (chance(r, 0.4) || famCounter === 0) famCounter++;
      familyGroupId = id("fam", famCounter);
    }
    const isChild = familyGroupId ? chance(r, 0.45) : chance(r, 0.08);
    const dob = isChild
      ? subYears(today, int(r, 3, 15))
      : subYears(today, int(r, 18, 78));

    const lastVisitDaysAgo = int(r, 20, 520);
    const lastVisit = subDays(today, lastVisitDaysAgo);
    let recallStatus: RecallStatus;
    if (lastVisitDaysAgo > 365) recallStatus = "lapsed";
    else if (lastVisitDaysAgo > 240) recallStatus = "overdue";
    else if (lastVisitDaysAgo > 165) recallStatus = "due";
    else recallStatus = "scheduled";

    patients.push({
      id: id("pat", i + 1),
      firstName: pick(r, FIRST_NAMES),
      lastName,
      phone: phone(r),
      email: `${lastName.toLowerCase()}${int(r, 1, 999)}@example.com`,
      dob: format(dob, "yyyy-MM-dd"),
      insuranceCarrier: carrier,
      memberId: carrier ? `${String.fromCharCode(65 + int(r, 0, 25))}${int(r, 100000000, 999999999)}` : null,
      homeLocationId,
      lastVisit: format(lastVisit, "yyyy-MM-dd"),
      nextVisit: null, // filled below from future appointments
      balance: chance(r, 0.28) ? int(r, 15, 40) * 10 : 0,
      noShowCount: chance(r, 0.75) ? 0 : int(r, 1, 4),
      recallStatus,
      source: pick(r, SOURCES),
      familyGroupId,
      createdAt: format(subDays(today, int(r, 30, 900)), "yyyy-MM-dd"),
    });
  }

  // -- appointments ----------------------------------------------------
  const appointments: Appointment[] = [];
  const notifications: NotificationRecord[] = [];
  const used: UsedMap = {};

  const pastStatuses: AppointmentStatus[] = [
    ...Array(80).fill("complete"),
    ...Array(9).fill("no-show"),
    ...Array(11).fill("cancelled"),
  ];

  let made = 0;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Patients eligible for FUTURE bookings — keep the lapsed/overdue cohorts
  // genuinely unbooked so Recall & reactivation has a real target list.
  const futurePool = patients.filter((p) => p.recallStatus === "scheduled");

  // Per-day generation: for every open day in [-pastDays, +futureDays], fill each
  // location to a realistic chair-utilization (~65–80% of provider capacity).
  for (let off = -SEED_CONFIG.pastDays; off <= SEED_CONFIG.futureDays; off++) {
    const day = addDays(today, off);
    for (const loc of LOCATIONS) {
      const locId = loc.id as LiveLocationId;
      const hrs = locHours(locId, day);
      if (!hrs) continue;

      const workingDocs = PROVIDERS.filter((p) => providerWorksAt(p.id, locId, day));
      if (workingDocs.length === 0) continue;

      const [oh, om] = hrs.open.split(":").map(Number);
      const [ch, cm] = hrs.close.split(":").map(Number);
      const openMin = oh * 60 + om;
      const closeMin = ch * 60 + cm;
      const spanHours = (closeMin - openMin) / 60;

      // Booking curve: past & near-term are full; further out fills in gradually
      // (patients haven't booked 3+ weeks ahead yet).
      let fill: number;
      if (off < 0) fill = 0.74 + r() * 0.2; // the past looks busy
      else if (off <= 2) fill = 0.72 + r() * 0.16; // this week is nearly full
      else if (off <= 10) fill = 0.5 + r() * 0.18; // next week has real gaps
      else if (off <= 21) fill = 0.3 + r() * 0.16;
      else fill = 0.1 + r() * 0.12;
      const target = Math.round(workingDocs.length * spanHours * fill);

      let added = 0;
      let tries = 0;
      while (added < target && tries < target * 8 + 40) {
        tries++;
        const svc = pick(r, SERVICES);
        const eligible = workingDocs.filter((p) => p.serviceIds.includes(svc.id));
        if (eligible.length === 0) continue;
        const pid = pick(r, eligible).id;

        const latestStart = closeMin - svc.durationMin;
        if (latestStart <= openMin) continue;
        const startMin = openMin + int(r, 0, Math.floor((latestStart - openMin) / 10)) * 10;
        if (hrs.lunch) {
          const [lh, lm] = hrs.lunch[0].split(":").map(Number);
          const lstart = lh * 60 + lm;
          if (startMin < lstart + 60 && startMin + svc.durationMin > lstart) continue;
        }
        const start = setMinutes(setHours(startOfDay(day), Math.floor(startMin / 60)), startMin % 60);
        const chair = tryPlace(
          used,
          locId,
          loc.chairs,
          pid,
          start,
          svc.durationMin,
          svc.bufferMin,
          int(r, 0, loc.chairs - 1),
        );
        if (chair == null) continue;

        const patient = off > 0 ? pick(r, futurePool.length ? futurePool : patients) : pick(r, patients);

        let status: AppointmentStatus;
        if (off < 0) {
          status = pick(r, pastStatuses);
        } else if (off === 0) {
          if (startMin + svc.durationMin < nowMin)
            status = pick(r, ["complete", "complete", "complete", "no-show"] as AppointmentStatus[]);
          else if (startMin <= nowMin) status = "in-chair";
          else if (startMin - nowMin < 45) status = "checked-in";
          else status = chance(r, 0.75) ? "confirmed" : "scheduled";
        } else {
          status = chance(r, 0.68) ? "confirmed" : "scheduled";
        }

        made++;
        appointments.push({
          id: id("apt", made),
          token: token(r),
          patientId: patient.id,
          providerId: pid,
          locationId: locId,
          serviceId: svc.id,
          chair,
          start: start.toISOString(),
          end: addMinutes(start, svc.durationMin).toISOString(),
          status,
          source: pick(r, SOURCES),
          isNewPatient: svc.id === "new-patient-exam" || chance(r, 0.12),
          createdAt: subDays(start, int(r, 2, 40)).toISOString(),
        });
        added++;
      }
    }
  }

  // -- Deliberate demo scenario: Atlantic Beach runs hot -----------------
  // The flagship books out for long appointments while Bartram Park still has
  // room. This is what a real two-office group looks like, and it's what makes
  // the cross-location load-balancing nudge fire during the pitch.
  {
    const SHORT = SERVICES.filter((s) => s.durationMin <= 60 && !s.emergency);
    for (let off = 1; off <= 12; off++) {
      const day = addDays(today, off);
      const locId: LiveLocationId = "atlantic-beach";
      const loc = LOCATIONS.find((l) => l.id === locId)!;
      const hrs = locHours(locId, day);
      if (!hrs) continue;
      const workingDocs = PROVIDERS.filter((p) => providerWorksAt(p.id, locId, day));
      if (workingDocs.length === 0) continue;

      const openMin = toMinutes(hrs.open);
      const closeMin = toMinutes(hrs.close);
      const dayStartMs = startOfDay(day).getTime();

      for (const doc of workingDocs) {
        const eligible = SHORT.filter((s) => s.providerIds.includes(doc.id));
        if (eligible.length === 0) continue;

        // The provider's real free gaps today, from what's already booked.
        const busy = (used[`prov:${doc.id}`] ?? [])
          .filter(([a]) => a >= dayStartMs && a < dayStartMs + 864e5)
          .map(([a, b]) => [(a - dayStartMs) / 60000, (b - dayStartMs) / 60000] as [number, number])
          .sort((x, y) => x[0] - y[0]);
        if (hrs.lunch) busy.push([toMinutes(hrs.lunch[0]), toMinutes(hrs.lunch[0]) + 60]);
        busy.sort((x, y) => x[0] - y[0]);

        const gaps: [number, number][] = [];
        let cursor = openMin;
        for (const [bs, be] of busy) {
          if (bs > cursor) gaps.push([cursor, Math.min(bs, closeMin)]);
          cursor = Math.max(cursor, be);
        }
        if (cursor < closeMin) gaps.push([cursor, closeMin]);

        // Pack every gap wide enough to have held a 90-minute new-patient exam.
        for (const [gs, ge] of gaps) {
          if (ge - gs < 90) continue;
          let t = Math.ceil(gs / 10) * 10;
          while (t < ge) {
            const svc = pick(r, eligible);
            if (t + svc.durationMin > ge) break;
            const start = setMinutes(setHours(startOfDay(day), Math.floor(t / 60)), t % 60);
            const chair = tryPlace(used, locId, loc.chairs, doc.id, start, svc.durationMin, svc.bufferMin);
            if (chair == null) break;
            made++;
            appointments.push({
              id: id("apt", made),
              token: token(r),
              patientId: pick(r, futurePool.length ? futurePool : patients).id,
              providerId: doc.id,
              locationId: locId,
              serviceId: svc.id,
              chair,
              start: start.toISOString(),
              end: addMinutes(start, svc.durationMin).toISOString(),
              status: chance(r, 0.7) ? "confirmed" : "scheduled",
              source: pick(r, SOURCES),
              isNewPatient: false,
              createdAt: subDays(start, int(r, 2, 25)).toISOString(),
            });
            t += svc.durationMin + svc.bufferMin;
          }
        }
      }
    }
  }

  // link nextVisit on patients from earliest future confirmed/scheduled appt
  const futureByPatient = new Map<string, string>();
  for (const a of appointments) {
    if (new Date(a.start) > now && (a.status === "confirmed" || a.status === "scheduled")) {
      const cur = futureByPatient.get(a.patientId);
      if (!cur || a.start < cur) futureByPatient.set(a.patientId, a.start);
    }
  }
  for (const p of patients) {
    const nv = futureByPatient.get(p.id);
    if (nv) {
      // has an upcoming visit -> recall is satisfied
      p.nextVisit = format(new Date(nv), "yyyy-MM-dd");
      p.recallStatus = "scheduled";
    }
  }

  // -- waitlist --------------------------------------------------------
  const waitlist: WaitlistEntry[] = [];
  const futureAppts = appointments
    .filter((a) => new Date(a.start) > now && a.status !== "cancelled")
    .sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 0; i < SEED_CONFIG.waitlistActive; i++) {
    const anchor = futureAppts[int(r, 0, Math.min(futureAppts.length - 1, 60))];
    const p = patients.find((x) => x.id === anchor?.patientId) ?? pick(r, patients);
    waitlist.push({
      id: id("wl", i + 1),
      patientName: `${p.firstName} ${p.lastName}`,
      phone: p.phone,
      patientId: p.id,
      locationPref: chance(r, 0.3) ? "either" : (anchor?.locationId ?? p.homeLocationId),
      providerId: chance(r, 0.6) ? "any" : (anchor?.providerId as ProviderId),
      serviceId: anchor?.serviceId ?? "routine-cleaning",
      window: {
        days: pick(r, [["weekday"], ["mon", "tue", "wed"], ["thu", "fri"], ["weekday", "weekend"]] as WaitlistEntry["window"]["days"][]),
        times: pick(r, [["morning"], ["afternoon"], ["morning", "midday"], ["midday", "afternoon"]] as WaitlistEntry["window"]["times"][]),
      },
      currentAppointmentId: chance(r, 0.7) ? anchor?.id : undefined,
      createdAt: subDays(now, int(r, 1, 20)).toISOString(),
      status: "active",
      notBefore: chance(r, 0.4) ? addDays(today, 1).toISOString() : undefined,
    });
  }

  // -- coming-soon leads --------------------------------------------
  const comingSoonLeads: ComingSoonLead[] = [];
  const csIds = ["fleming-island", "tinseltown", "world-golf-village"] as const;
  const ZIPS = ["32003", "32065", "32068", "32073", "32081", "32092", "32095", "32256", "32258", "32259"];
  for (let i = 0; i < SEED_CONFIG.comingSoonLeads; i++) {
    const fn = pick(r, FIRST_NAMES);
    const ln = pick(r, LAST_NAMES);
    comingSoonLeads.push({
      id: id("cs", i + 1),
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      zip: pick(r, ZIPS),
      preferredLocation: pick(r, csIds as unknown as (typeof csIds)[number][]),
      createdAt: subDays(now, int(r, 0, 55)).toISOString(),
    });
  }

  // -- a few historical notifications for the notification center --
  for (const a of appointments.slice(0, 40)) {
    const p = patients.find((x) => x.id === a.patientId)!;
    notifications.push({
      id: id("ntf", notifications.length + 1),
      channel: "sms",
      to: p.phone,
      body: `Gleam Dental: ${p.firstName}, you're confirmed for ${format(new Date(a.start), "EEE MMM d 'at' h:mm a")}. Reply C to confirm.`,
      createdAt: subDays(new Date(a.start), 2).toISOString(),
      kind: "confirmation",
      relatedAppointmentId: a.id,
    });
  }
  notifications.sort((x, y) => y.createdAt.localeCompare(x.createdAt));

  // -- demo scenario wiring --------------------------------------------
  const cancellable = futureAppts
    .filter((a) => {
      const d = differenceInCalendarDays(new Date(a.start), today);
      return (
        d >= 1 &&
        d <= 9 &&
        (a.serviceId === "routine-cleaning" || a.serviceId === "new-patient-exam") &&
        (a.status === "confirmed" || a.status === "scheduled")
      );
    })
    .slice(0, 6)
    .map((a) => a.id);

  // -- schedule blocks (PTO / meetings) -------------------------------
  const blocks: ScheduleBlock[] = [];
  const nextMon = addDays(today, ((8 - today.getDay()) % 7) || 7);
  blocks.push({
    id: id("blk", 1),
    locationId: "atlantic-beach",
    providerId: "acosta",
    start: setMinutes(setHours(nextMon, 8), 0).toISOString(),
    end: setMinutes(setHours(nextMon, 17), 0).toISOString(),
    kind: "pto",
    reason: "Dr. Acosta — PTO",
  });
  blocks.push({
    id: id("blk", 2),
    locationId: "bartram-park",
    start: setMinutes(setHours(addDays(today, 2), 12), 0).toISOString(),
    end: setMinutes(setHours(addDays(today, 2), 13), 0).toISOString(),
    kind: "meeting",
    reason: "All-hands team huddle",
  });

  // -- membership plan members (the uninsured cohort) ------------------
  const members: Member[] = [];
  const uninsured = patients.filter((p) => !p.insuranceCarrier);
  const tiers: MembershipTier[] = ["individual", "individual", "individual", "child", "perio"];
  for (let i = 0; i < Math.min(uninsured.length, 46); i++) {
    const p = uninsured[i];
    const startedAt = subDays(today, int(r, 5, 400));
    // renewal is always the next anniversary ahead of today
    let renewsAt = addDays(startedAt, 365);
    while (renewsAt <= today) renewsAt = addDays(renewsAt, 365);
    members.push({
      id: id("mem", i + 1),
      patientId: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      email: p.email,
      tier: pick(r, tiers),
      billing: chance(r, 0.62) ? "monthly" : "annual",
      startedAt: startedAt.toISOString(),
      renewsAt: renewsAt.toISOString(),
      status: chance(r, 0.94) ? "active" : "cancelled",
      locationId: p.homeLocationId,
    });
  }

  // -- post-visit reviews on completed appointments -------------------
  const reviews: ReviewResponse[] = [];
  const completed = appointments.filter((a) => a.status === "complete");
  for (const a of completed) {
    if (!chance(r, 0.42)) continue;
    // realistic skew: mostly 5s, a thin tail of unhappy visits
    const roll = r();
    const rating = roll < 0.62 ? 5 : roll < 0.84 ? 4 : roll < 0.93 ? 3 : roll < 0.98 ? 2 : 1;
    reviews.push({
      id: id("rev", reviews.length + 1),
      appointmentId: a.id,
      patientId: a.patientId,
      rating,
      route: rating >= 4 ? "public" : "private",
      privateFeedback:
        rating <= 3
          ? pick(r, [
              "Waited almost 30 minutes past my appointment time.",
              "The care was fine but I wasn't told what my portion would cost.",
              "Front desk was hard to reach by phone.",
              "Felt rushed at the end of the visit.",
            ])
          : undefined,
      postedPublicly: rating >= 4 ? chance(r, 0.58) : false,
      createdAt: addDays(new Date(a.end), 1).toISOString(),
    });
    // keep the appointment in step with its review — one source of truth
    a.reviewRating = rating;
  }

  const smileDesigns: SmileDesignSubmission[] = [];

  return {
    generatedAt: now.toISOString(),
    patients,
    appointments,
    waitlist,
    comingSoonLeads,
    notifications,
    intakeForms: [],
    blocks,
    scheduleOverrides: [],
    campaigns: [],
    members,
    smileDesigns,
    reviews,
    demoScenario: {
      cancellableAppointmentIds: cancellable,
      todayLocation: "atlantic-beach",
    },
  };
}
