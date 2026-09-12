"use client";

import { addMinutes, differenceInCalendarDays, isSameDay, startOfDay } from "date-fns";
import {
  getDayAvailability,
  getRangeAvailability,
  findFamilySlots,
  nextAvailable,
  soonestAnywhere,
} from "./availability";
import {
  INSURANCE_CARRIERS,
  LOCATIONS,
  MEMBERSHIP_PLANS,
  PROVIDERS,
  SERVICES,
  getLocation,
  getService,
} from "./domain";
import { generateSeed, type SeedData } from "./seed";
import type {
  Appointment,
  AppointmentStatus,
  BlockKind,
  BookingSource,
  Campaign,
  ComingSoonLead,
  EligibilityResult,
  IntakeForm,
  LiveLocationId,
  Member,
  MembershipTier,
  NotificationChannel,
  NotificationRecord,
  Patient,
  PreferredWindow,
  ProviderId,
  ReviewResponse,
  ScheduleBlock,
  ScheduleOverride,
  Slot,
  SmileDesignSubmission,
  WaitlistEntry,
  Weekday,
} from "./types";

// ---------------------------------------------------------------------------
// Client-side data layer. Shaped like an async API so it could be swapped for
// a real backend without touching component code. Persists to localStorage.
// ---------------------------------------------------------------------------

const STORE_KEY = "gleam.store.v17";
/** rough operating cost of an idle chair, per hour — used by analytics + ROI */
export const CHAIR_HOUR_COST = 165;
/** Atlantic Beach ↔ Bartram Park, off-peak. Shown in the load-balancing nudge. */
export const DRIVE_MINUTES_BETWEEN = 14;
const LATENCY = { query: 90, mutate: 160, eligibility: 1500 } as const;
/** the notification center keeps this many messages; older ones roll off */
const MAX_NOTIFICATIONS = 400;

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;
const makeToken = () =>
  Array.from({ length: 10 }, () => "abcdefghjkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 30)]).join("");

interface Persisted extends SeedData {
  version: string;
  revenueRecovered: number;
  tourSeen: boolean;
}

type Listener = () => void;

class GleamStore {
  private data: Persisted;
  private listeners = new Set<Listener>();

  constructor() {
    this.data = this.hydrate();
  }

  // -- persistence ---------------------------------------------------------
  private freshSeed(): Persisted {
    return {
      ...generateSeed(new Date()),
      version: STORE_KEY,
      revenueRecovered: 0,
      tourSeen: false,
    };
  }

  /** Drop snapshots left behind by earlier store versions — they eat the quota. */
  private purgeOldVersions() {
    try {
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith("gleam.store.") && key !== STORE_KEY) {
          window.localStorage.removeItem(key);
        }
      }
    } catch {
      /* ignore */
    }
  }

  private hydrate(): Persisted {
    if (typeof window === "undefined") return this.freshSeed();
    this.purgeOldVersions();
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return this.persist(this.freshSeed());
      const parsed = JSON.parse(raw) as Persisted;
      if (parsed.version !== STORE_KEY) return this.persist(this.freshSeed());
      // "today is always today" — re-seed if the calendar day rolled over
      if (!isSameDay(new Date(parsed.generatedAt), new Date())) {
        return this.persist(this.freshSeed());
      }
      return parsed;
    } catch {
      return this.persist(this.freshSeed());
    }
  }

  private persist(next: Persisted): Persisted {
    // keep the message log from growing without bound during a long demo
    if (next.notifications.length > MAX_NOTIFICATIONS) {
      next.notifications = next.notifications
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, MAX_NOTIFICATIONS);
    }
    this.data = next;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
      } catch {
        // Out of quota (usually smile-design photos). Shed the heaviest optional
        // data and retry once; if that still fails, run from memory for this
        // session rather than breaking the demo.
        try {
          window.localStorage.removeItem(STORE_KEY);
          this.purgeOldVersions();
          window.localStorage.setItem(
            STORE_KEY,
            JSON.stringify({ ...next, smileDesigns: [] }),
          );
        } catch {
          /* in-memory only from here */
        }
      }
    }
    return next;
  }

  private commit(mutate: (d: Persisted) => void) {
    const next = structuredClone(this.data);
    mutate(next);
    this.persist(next);
    this.emit();
  }

  // -- subscription (for React) -----------------------------------------
  subscribe = (fn: Listener) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.data;
  private emit() {
    this.listeners.forEach((l) => l());
  }

  // -- demo controls ---------------------------------------------------
  async reset() {
    this.persist(this.freshSeed());
    this.emit();
  }
  async setTourSeen(v: boolean) {
    this.commit((d) => {
      d.tourSeen = v;
    });
  }
  get revenueRecovered() {
    return this.data.revenueRecovered;
  }

  // -- patients -------------------------------------------------------
  async listPatients(): Promise<Patient[]> {
    await wait(LATENCY.query);
    return this.data.patients;
  }
  async getPatient(id: string) {
    await wait(LATENCY.query);
    return this.data.patients.find((p) => p.id === id) ?? null;
  }
  /** fake "look up by phone" for returning patients */
  async findPatientByPhone(phone: string): Promise<Patient | null> {
    await wait(LATENCY.query + 250);
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (digits.length < 10) return null;
    return (
      this.data.patients.find((p) => p.phone.replace(/\D/g, "").slice(-10) === digits) ?? null
    );
  }
  async familyMembers(familyGroupId: string): Promise<Patient[]> {
    await wait(LATENCY.query);
    return this.data.patients.filter((p) => p.familyGroupId === familyGroupId);
  }
  async upsertPatient(input: Partial<Patient> & { firstName: string; lastName: string; phone: string }): Promise<Patient> {
    await wait(LATENCY.mutate);
    const digits = input.phone.replace(/\D/g, "").slice(-10);
    const existing = this.data.patients.find(
      (p) => p.phone.replace(/\D/g, "").slice(-10) === digits && p.firstName === input.firstName,
    );
    if (existing) {
      this.commit((d) => {
        const t = d.patients.find((p) => p.id === existing.id)!;
        Object.assign(t, input);
      });
      return this.data.patients.find((p) => p.id === existing.id)!;
    }
    const patient: Patient = {
      id: uid("pat"),
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email ?? "",
      dob: input.dob ?? "",
      insuranceCarrier: input.insuranceCarrier ?? null,
      memberId: input.memberId ?? null,
      homeLocationId: input.homeLocationId ?? "atlantic-beach",
      lastVisit: null,
      nextVisit: null,
      balance: 0,
      noShowCount: 0,
      recallStatus: "scheduled",
      source: input.source ?? "online",
      familyGroupId: input.familyGroupId,
      createdAt: new Date().toISOString(),
    };
    this.commit((d) => {
      d.patients.push(patient);
    });
    return patient;
  }

  // -- appointments ------------------------------------------------
  async listAppointments(filter?: {
    locationId?: LiveLocationId;
    providerId?: ProviderId;
    from?: Date;
    to?: Date;
    status?: AppointmentStatus[];
    patientId?: string;
  }): Promise<Appointment[]> {
    await wait(LATENCY.query);
    return this.data.appointments.filter((a) => {
      if (filter?.locationId && a.locationId !== filter.locationId) return false;
      if (filter?.providerId && a.providerId !== filter.providerId) return false;
      if (filter?.patientId && a.patientId !== filter.patientId) return false;
      if (filter?.status && !filter.status.includes(a.status)) return false;
      if (filter?.from && new Date(a.start) < filter.from) return false;
      if (filter?.to && new Date(a.start) > filter.to) return false;
      return true;
    });
  }
  async getAppointment(id: string) {
    await wait(LATENCY.query);
    return this.data.appointments.find((a) => a.id === id) ?? null;
  }
  async getAppointmentByToken(tok: string) {
    await wait(LATENCY.query);
    return this.data.appointments.find((a) => a.token === tok) ?? null;
  }

  /** raw list, no latency — for the availability engine */
  private activeAppointments() {
    return this.data.appointments;
  }

  async createAppointment(input: {
    patientId: string;
    providerId: ProviderId;
    locationId: LiveLocationId;
    serviceId: string;
    chair: number;
    start: string;
    end: string;
    source?: BookingSource;
    isNewPatient?: boolean;
    familyGroupId?: string;
    filledFromWaitlist?: boolean;
  }): Promise<Appointment> {
    await wait(LATENCY.mutate);
    const appt: Appointment = {
      id: uid("apt"),
      token: makeToken(),
      status: "confirmed",
      source: input.source ?? "online",
      isNewPatient: input.isNewPatient ?? false,
      createdAt: new Date().toISOString(),
      ...input,
    };
    this.commit((d) => {
      d.appointments.push(appt);
      const p = d.patients.find((x) => x.id === appt.patientId);
      if (p) p.nextVisit = appt.start.slice(0, 10);
    });
    await this.notify({
      channel: "sms",
      to: this.data.patients.find((p) => p.id === appt.patientId)?.phone ?? "",
      kind: "confirmation",
      relatedAppointmentId: appt.id,
      body: `Gleam Dental: you're booked. ${fmtWhen(appt.start)}. Manage: gleam.care/appt/${appt.token}`,
    });
    return appt;
  }

  async rescheduleAppointment(id: string, start: string): Promise<Appointment | null> {
    await wait(LATENCY.mutate);
    const svc = this.data.appointments.find((a) => a.id === id);
    if (!svc) return null;
    const service = getService(svc.serviceId)!;
    this.commit((d) => {
      const a = d.appointments.find((x) => x.id === id)!;
      a.start = start;
      a.end = addMinutes(new Date(start), service.durationMin).toISOString();
      a.status = "confirmed";
    });
    return this.data.appointments.find((a) => a.id === id) ?? null;
  }

  async setAppointmentStatus(id: string, status: AppointmentStatus) {
    await wait(LATENCY.mutate);
    this.commit((d) => {
      const a = d.appointments.find((x) => x.id === id);
      if (a) a.status = status;
    });
  }

  /**
   * Cancel an appointment. If `runRecovery`, immediately page the matching
   * waitlist and fill the freed slot — the money demo.
   */
  async cancelAppointment(
    id: string,
    opts: { runRecovery?: boolean } = {},
  ): Promise<{ cancelled: Appointment; recovery?: RecoveryResult }> {
    await wait(LATENCY.mutate);
    const target = this.data.appointments.find((a) => a.id === id);
    if (!target) throw new Error("appointment not found");
    this.commit((d) => {
      const a = d.appointments.find((x) => x.id === id)!;
      a.status = "cancelled";
    });
    let recovery: RecoveryResult | undefined;
    if (opts.runRecovery) recovery = await this.runWaitlistRecovery(target);
    return { cancelled: target, recovery };
  }

  // -- waitlist ----------------------------------------------------
  async listWaitlist(): Promise<WaitlistEntry[]> {
    await wait(LATENCY.query);
    return this.data.waitlist;
  }
  async addWaitlistEntry(input: {
    patientName: string;
    phone: string;
    patientId?: string;
    locationPref: LiveLocationId | "either";
    providerId?: ProviderId | "any";
    serviceId: string;
    window: PreferredWindow;
    currentAppointmentId?: string;
  }): Promise<WaitlistEntry> {
    await wait(LATENCY.mutate);
    const entry: WaitlistEntry = {
      id: uid("wl"),
      status: "active",
      createdAt: new Date().toISOString(),
      ...input,
    };
    this.commit((d) => {
      d.waitlist.push(entry);
    });
    return entry;
  }

  /** Simulate paging the waitlist to backfill a freed appointment. */
  async runWaitlistRecovery(freed: Appointment): Promise<RecoveryResult> {
    const service = getService(freed.serviceId)!;
    const candidates = this.data.waitlist
      .filter((w) => w.status === "active")
      .filter((w) => w.serviceId === freed.serviceId || w.serviceId === "routine-cleaning")
      .filter(
        (w) =>
          w.locationPref === "either" || w.locationPref === freed.locationId,
      )
      .filter((w) => !w.providerId || w.providerId === "any" || w.providerId === freed.providerId)
      .slice(0, 4);

    const offers: NotificationRecord[] = [];
    for (const w of candidates) {
      const n = await this.notify({
        channel: "sms",
        to: w.phone,
        kind: "waitlist-offer",
        relatedAppointmentId: freed.id,
        body: `Gleam Dental: an earlier ${service.shortName} opened ${fmtWhen(freed.start)}. Reply YES to grab it.`,
        silent: true,
      });
      offers.push(n);
      await wait(500);
    }

    // first candidate accepts
    const winner = candidates[0];
    if (!winner) {
      return { freed, offersSent: offers, filled: null, revenueRecovered: 0 };
    }
    const patient =
      this.data.patients.find((p) => p.id === winner.patientId) ??
      (await this.upsertPatient({
        firstName: winner.patientName.split(" ")[0],
        lastName: winner.patientName.split(" ").slice(1).join(" ") || "Patient",
        phone: winner.phone,
      }));

    const filled: Appointment = {
      id: uid("apt"),
      token: makeToken(),
      patientId: patient.id,
      providerId: freed.providerId,
      locationId: freed.locationId,
      serviceId: freed.serviceId,
      chair: freed.chair,
      start: freed.start,
      end: freed.end,
      status: "confirmed",
      source: "online",
      isNewPatient: false,
      createdAt: new Date().toISOString(),
      filledFromWaitlist: true,
    };
    const recovered = service.value || 165;
    this.commit((d) => {
      d.appointments.push(filled);
      const wl = d.waitlist.find((x) => x.id === winner.id);
      if (wl) wl.status = "filled";
      if (winner.currentAppointmentId) {
        const old = d.appointments.find((a) => a.id === winner.currentAppointmentId);
        if (old && old.status !== "cancelled") old.status = "cancelled";
      }
      d.revenueRecovered += recovered;
    });
    await this.notify({
      channel: "sms",
      to: winner.phone,
      kind: "waitlist-filled",
      relatedAppointmentId: filled.id,
      body: `Gleam Dental: you're confirmed for ${fmtWhen(filled.start)}. See you soon!`,
    });

    return { freed, offersSent: offers, filled, revenueRecovered: recovered };
  }

  // -- coming-soon leads ----------------------------------------
  async listComingSoonLeads(): Promise<ComingSoonLead[]> {
    await wait(LATENCY.query);
    return this.data.comingSoonLeads;
  }
  async addComingSoonLead(input: Omit<ComingSoonLead, "id" | "createdAt">): Promise<ComingSoonLead> {
    await wait(LATENCY.mutate);
    const lead: ComingSoonLead = { id: uid("cs"), createdAt: new Date().toISOString(), ...input };
    this.commit((d) => {
      d.comingSoonLeads.push(lead);
    });
    await this.notify({
      channel: "email",
      to: input.email,
      kind: "coming-soon",
      subject: "You're on the list for Gleam Dental",
      body: `Thanks ${input.name}! We'll email you the moment our ${input.preferredLocation.replace(/-/g, " ")} office opens for booking.`,
    });
    return lead;
  }

  // -- intake forms -------------------------------------------
  async getIntake(token: string): Promise<IntakeForm | null> {
    await wait(LATENCY.query);
    return this.data.intakeForms.find((f) => f.token === token) ?? null;
  }
  async saveIntake(token: string, patch: Partial<IntakeForm>): Promise<IntakeForm> {
    await wait(LATENCY.mutate);
    let form = this.data.intakeForms.find((f) => f.token === token);
    if (!form) {
      form = {
        token,
        medicalConditions: [],
        medicalNotes: "",
        allergies: [],
        medications: "",
        pharmacy: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        hipaaAcknowledged: false,
        consentToTreat: false,
        signatureDataUrl: null,
        signedName: "",
        completedSections: [],
        updatedAt: new Date().toISOString(),
      };
      this.commit((d) => {
        d.intakeForms.push(form!);
      });
    }
    this.commit((d) => {
      const f = d.intakeForms.find((x) => x.token === token)!;
      Object.assign(f, patch, { updatedAt: new Date().toISOString() });
    });
    return this.data.intakeForms.find((f) => f.token === token)!;
  }

  // -- notifications ----------------------------------------
  async listNotifications(): Promise<NotificationRecord[]> {
    await wait(LATENCY.query);
    return [...this.data.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async notify(
    input: Omit<NotificationRecord, "id" | "createdAt"> & { silent?: boolean },
  ): Promise<NotificationRecord> {
    const { silent, ...rest } = input;
    const rec: NotificationRecord = { id: uid("ntf"), createdAt: new Date().toISOString(), ...rest };
    this.commit((d) => {
      d.notifications.push(rec);
    });
    if (!silent) await wait(30);
    return rec;
  }

  // -- insurance eligibility mock -------------------------
  async checkEligibility(carrier: string, memberId: string): Promise<EligibilityResult> {
    await wait(LATENCY.eligibility);
    const known = INSURANCE_CARRIERS.includes(carrier as never);
    const base = 1500;
    const used = 200 + (hashStr(memberId) % 900);
    return {
      carrier: known ? carrier : "Delta Dental",
      planName: `${carrier.split(" ")[0]} PPO — Employer Group`,
      memberId,
      status: "active",
      annualMaximum: base,
      annualMaximumRemaining: base - used,
      deductible: 50,
      deductibleMet: hashStr(memberId) % 2 === 0 ? 50 : 0,
      preventiveCoveragePct: 100,
      basicCoveragePct: 80,
      majorCoveragePct: 50,
      network: "in-network",
    };
  }

  // -- availability (delegates, injecting live appointments) -----
  availabilityDay(args: {
    serviceId: string;
    locationId: LiveLocationId;
    providerId?: ProviderId | "any";
    date: Date | string;
    emergency?: boolean;
  }) {
    return getDayAvailability({ ...args, appointments: this.activeAppointments() });
  }
  availabilityRange(args: {
    serviceId: string;
    locationId: LiveLocationId;
    providerId?: ProviderId | "any";
    from: Date;
    days: number;
    emergency?: boolean;
  }) {
    return getRangeAvailability({ ...args, appointments: this.activeAppointments() });
  }
  nextAvailable(args: {
    serviceId: string;
    locationId: LiveLocationId;
    providerId?: ProviderId | "any";
    from?: Date;
    withinDays?: number;
    emergency?: boolean;
  }): Slot | null {
    return nextAvailable({ ...args, appointments: this.activeAppointments() });
  }
  soonestAnywhere(args: {
    serviceId: string;
    providerId?: ProviderId | "any";
    from?: Date;
    withinDays?: number;
    emergency?: boolean;
  }): Slot | null {
    return soonestAnywhere({ ...args, appointments: this.activeAppointments() });
  }
  familySlots(args: {
    serviceIds: string[];
    locationId: LiveLocationId;
    from?: Date;
    withinDays?: number;
    mode?: "concurrent" | "back-to-back";
  }) {
    return findFamilySlots({ ...args, appointments: this.activeAppointments() });
  }

  // -- schedule blocks & overrides (admin schedule view) --------
  async listBlocks(filter?: { locationId?: LiveLocationId; from?: Date; to?: Date }): Promise<ScheduleBlock[]> {
    await wait(LATENCY.query);
    return this.data.blocks.filter((b) => {
      if (filter?.locationId && b.locationId !== filter.locationId) return false;
      if (filter?.from && new Date(b.end) < filter.from) return false;
      if (filter?.to && new Date(b.start) > filter.to) return false;
      return true;
    });
  }
  async addBlock(input: {
    locationId: LiveLocationId;
    providerId?: ProviderId;
    start: string;
    end: string;
    kind: BlockKind;
    reason: string;
  }): Promise<ScheduleBlock> {
    await wait(LATENCY.mutate);
    const block: ScheduleBlock = { id: uid("blk"), ...input };
    this.commit((d) => {
      d.blocks.push(block);
    });
    return block;
  }
  async removeBlock(id: string) {
    await wait(LATENCY.mutate);
    this.commit((d) => {
      d.blocks = d.blocks.filter((b) => b.id !== id);
    });
  }
  getScheduleOverride(providerId: ProviderId): ScheduleOverride | undefined {
    return this.data.scheduleOverrides.find((o) => o.providerId === providerId);
  }
  async setScheduleOverride(providerId: ProviderId, assignment: ScheduleOverride["assignment"]) {
    await wait(LATENCY.mutate);
    this.commit((d) => {
      const existing = d.scheduleOverrides.find((o) => o.providerId === providerId);
      if (existing) existing.assignment = assignment;
      else d.scheduleOverrides.push({ providerId, assignment });
    });
  }

  /** Move (drag-drop) an appointment to a new chair/time, with conflict detection. */
  async moveAppointment(
    id: string,
    target: { chair: number; start: string },
  ): Promise<{ ok: boolean; conflict?: string; appointment?: Appointment }> {
    await wait(LATENCY.mutate);
    const appt = this.data.appointments.find((a) => a.id === id);
    if (!appt) return { ok: false, conflict: "not found" };
    const svc = getService(appt.serviceId)!;
    const start = new Date(target.start);
    const end = addMinutes(start, svc.durationMin);
    const bufEnd = addMinutes(end, svc.bufferMin);

    const loc = getLocation(appt.locationId)!;
    const hrs = loc.hours[start.getDay() as Weekday];
    if (!hrs) return { ok: false, conflict: `${loc.shortName} is closed that day` };
    const openM = toMin(hrs.open);
    const closeM = toMin(hrs.close);
    const sM = start.getHours() * 60 + start.getMinutes();
    if (sM < openM || sM + svc.durationMin > closeM)
      return { ok: false, conflict: "outside office hours" };

    for (const b of this.data.blocks) {
      if (b.locationId !== appt.locationId) continue;
      if (b.providerId && b.providerId !== appt.providerId) continue;
      if (start < new Date(b.end) && new Date(b.start) < end)
        return { ok: false, conflict: `overlaps ${b.reason}` };
    }
    for (const other of this.data.appointments) {
      if (other.id === id) continue;
      if (other.status === "cancelled" || other.status === "no-show") continue;
      if (other.locationId !== appt.locationId) continue;
      if (!isSameDay(new Date(other.start), start)) continue;
      const oSvc = getService(other.serviceId)!;
      const oStart = new Date(other.start);
      const oEnd = addMinutes(new Date(other.end), oSvc.bufferMin);
      const sameChair = other.chair === target.chair;
      const sameProvider = other.providerId === appt.providerId;
      if ((sameChair || sameProvider) && start < oEnd && oStart < bufEnd) {
        return {
          ok: false,
          conflict: sameChair ? `chair ${target.chair} is taken` : `Dr. ${getProviderLast(appt.providerId)} is booked`,
        };
      }
    }

    this.commit((d) => {
      const a = d.appointments.find((x) => x.id === id)!;
      a.chair = target.chair;
      a.start = start.toISOString();
      a.end = end.toISOString();
    });
    return { ok: true, appointment: this.data.appointments.find((a) => a.id === id) };
  }

  // -- recall & reactivation campaigns --------------------------
  async listCampaigns(): Promise<Campaign[]> {
    await wait(LATENCY.query);
    return [...this.data.campaigns].sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  }
  async sendCampaign(
    kind: "recall" | "reactivation",
    patientIds: string[],
    channel: NotificationChannel = "sms",
  ): Promise<Campaign> {
    await wait(LATENCY.mutate);
    const patients = this.data.patients.filter((p) => patientIds.includes(p.id));
    const perPatient = kind === "recall" ? 165 : 320;
    const campaign: Campaign = {
      id: uid("cmp"),
      kind,
      sentAt: new Date().toISOString(),
      patientIds,
      channel,
      estimatedRevenue: Math.round(patients.length * perPatient * (kind === "recall" ? 0.45 : 0.18)),
    };
    this.commit((d) => {
      d.campaigns.push(campaign);
      for (const p of d.patients) {
        if (!patientIds.includes(p.id)) continue;
        p.recallStatus = "scheduled";
      }
      for (const p of patients) {
        d.notifications.push({
          id: uid("ntf"),
          channel,
          to: channel === "sms" ? p.phone : p.email,
          kind: kind === "recall" ? "recall" : "reactivation",
          createdAt: new Date().toISOString(),
          subject: kind === "recall" ? "Time for your cleaning" : "We miss you at Gleam Dental",
          body:
            kind === "recall"
              ? `Hi ${p.firstName}, you're due for your 6-month cleaning. Book online: gleam.care/book`
              : `Hi ${p.firstName}, it's been a while! Come back for a fresh start — new-patient-style exam, book at gleam.care/book`,
        });
      }
    });
    return campaign;
  }

  // -- membership plan ------------------------------------------
  async listMembers(): Promise<Member[]> {
    await wait(LATENCY.query);
    return this.data.members;
  }
  async addMember(input: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    tier: MembershipTier;
    billing: "annual" | "monthly";
    locationId: LiveLocationId;
    patientId?: string;
  }): Promise<Member> {
    await wait(LATENCY.mutate + 600);
    const now = new Date();
    const member: Member = {
      id: uid("mem"),
      startedAt: now.toISOString(),
      renewsAt: new Date(now.getTime() + 365 * 864e5).toISOString(),
      status: "active",
      ...input,
    };
    this.commit((d) => {
      d.members.push(member);
    });
    const plan = MEMBERSHIP_PLANS.find((p) => p.id === input.tier)!;
    await this.notify({
      channel: "email",
      to: input.email,
      kind: "membership",
      subject: `Welcome to ${plan.name}`,
      body: `Hi ${input.firstName}, your Gleam Care membership is active. Two cleanings, exams and X-rays are covered, and you get ${plan.treatmentDiscountPct}% off any other treatment. No deductibles, no annual maximum.`,
    });
    return member;
  }
  /** Monthly recurring revenue across active members. */
  membershipStats() {
    const active = this.data.members.filter((m) => m.status === "active");
    const mrr = active.reduce((s, m) => {
      const plan = MEMBERSHIP_PLANS.find((p) => p.id === m.tier);
      if (!plan) return s;
      return s + (m.billing === "monthly" ? plan.monthly : plan.price / 12);
    }, 0);
    const byTier: Record<string, number> = {};
    for (const m of active) byTier[m.tier] = (byTier[m.tier] ?? 0) + 1;
    const joinedLast30 = active.filter(
      (m) => Date.now() - new Date(m.startedAt).getTime() < 30 * 864e5,
    ).length;
    return {
      active: active.length,
      cancelled: this.data.members.length - active.length,
      mrr,
      arr: mrr * 12,
      byTier,
      joinedLast30,
    };
  }

  // -- virtual smile design -------------------------------------
  async getSmileDesign(token: string): Promise<SmileDesignSubmission | null> {
    await wait(LATENCY.query);
    return this.data.smileDesigns.find((s) => s.token === token) ?? null;
  }
  async saveSmileDesign(
    token: string,
    patch: Partial<Omit<SmileDesignSubmission, "id" | "token" | "createdAt">>,
  ): Promise<SmileDesignSubmission> {
    await wait(LATENCY.mutate);
    const existing = this.data.smileDesigns.find((s) => s.token === token);
    if (!existing) {
      const created: SmileDesignSubmission = {
        id: uid("smile"),
        token,
        photos: [],
        goals: [],
        notes: "",
        createdAt: new Date().toISOString(),
        ...patch,
      };
      this.commit((d) => {
        d.smileDesigns.push(created);
      });
      return created;
    }
    this.commit((d) => {
      const s = d.smileDesigns.find((x) => x.token === token)!;
      Object.assign(s, patch);
    });
    return this.data.smileDesigns.find((s) => s.token === token)!;
  }

  // -- post-visit review routing --------------------------------
  async listReviews(): Promise<ReviewResponse[]> {
    await wait(LATENCY.query);
    return this.data.reviews;
  }
  async getReviewForAppointment(appointmentId: string): Promise<ReviewResponse | null> {
    await wait(LATENCY.query);
    return this.data.reviews.find((r) => r.appointmentId === appointmentId) ?? null;
  }
  /** Patient picks a star rating; 4–5 routes public, 1–3 routes to private feedback. */
  async submitReview(
    appointmentId: string,
    rating: number,
    privateFeedback?: string,
  ): Promise<ReviewResponse> {
    await wait(LATENCY.mutate);
    const appt = this.data.appointments.find((a) => a.id === appointmentId);
    const route: ReviewResponse["route"] = rating >= 4 ? "public" : "private";
    const existing = this.data.reviews.find((r) => r.appointmentId === appointmentId);
    if (existing) {
      this.commit((d) => {
        const rv = d.reviews.find((x) => x.appointmentId === appointmentId)!;
        rv.rating = rating;
        rv.route = route;
        if (privateFeedback !== undefined) rv.privateFeedback = privateFeedback;
      });
      return this.data.reviews.find((r) => r.appointmentId === appointmentId)!;
    }
    const review: ReviewResponse = {
      id: uid("rev"),
      appointmentId,
      patientId: appt?.patientId ?? "",
      rating,
      route,
      privateFeedback,
      createdAt: new Date().toISOString(),
    };
    this.commit((d) => {
      d.reviews.push(review);
      if (appt) {
        const a = d.appointments.find((x) => x.id === appointmentId);
        if (a) a.reviewRating = rating;
      }
    });
    return review;
  }
  async markReviewPosted(appointmentId: string) {
    await wait(LATENCY.mutate);
    this.commit((d) => {
      const rv = d.reviews.find((x) => x.appointmentId === appointmentId);
      if (rv) rv.postedPublicly = true;
    });
  }
  /** Sends the simulated post-visit "how did we do?" message. */
  async requestReview(appointmentId: string) {
    const appt = this.data.appointments.find((a) => a.id === appointmentId);
    if (!appt) return null;
    const patient = this.data.patients.find((p) => p.id === appt.patientId);
    return this.notify({
      channel: "sms",
      to: patient?.phone ?? "",
      kind: "review-request",
      relatedAppointmentId: appointmentId,
      body: `Gleam Dental: thanks for coming in${patient ? `, ${patient.firstName}` : ""}! How did we do? gleam.care/review/${appt.token}`,
    });
  }
  reputationStats() {
    const rated = this.data.reviews;
    const avg = rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0;
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of rated) dist[r.rating] = (dist[r.rating] ?? 0) + 1;
    const promoters = rated.filter((r) => r.rating >= 4).length;
    return {
      total: rated.length,
      average: avg,
      distribution: dist,
      publicRouted: promoters,
      privateRouted: rated.filter((r) => r.rating <= 3).length,
      postedToGoogle: rated.filter((r) => r.postedPublicly).length,
      /** what % of feedback got steered to a public review instead of a public complaint */
      captureRate: rated.length ? promoters / rated.length : 0,
    };
  }

  // -- cross-location load balancing -----------------------------
  /**
   * If the chosen location's next opening is far out, check whether the other
   * office can see the patient sooner. Returns a nudge only when the gain is
   * worth the extra drive.
   */
  crossLocationSuggestion(args: {
    serviceId: string;
    locationId: LiveLocationId;
    providerId?: ProviderId | "any";
    /** show the nudge once the chosen office is this many days out */
    thresholdDays?: number;
    /** the alternative must beat the chosen office by at least this many days */
    minGainDays?: number;
  }): {
    from: LiveLocationId;
    to: LiveLocationId;
    chosenSlot: Slot | null;
    betterSlot: Slot;
    daysSaved: number;
    extraDriveMinutes: number;
  } | null {
    const thresholdDays = args.thresholdDays ?? 8;
    const minGainDays = args.minGainDays ?? 2;
    const chosen = this.nextAvailable({
      serviceId: args.serviceId,
      locationId: args.locationId,
      providerId: args.providerId ?? "any",
      withinDays: 60,
    });
    const chosenDays = chosen
      ? differenceInCalendarDays(new Date(chosen.start), startOfDay(new Date()))
      : Infinity;
    if (chosenDays < thresholdDays) return null;

    const other = LOCATIONS.find((l) => l.id !== args.locationId);
    if (!other) return null;
    const alt = this.nextAvailable({
      serviceId: args.serviceId,
      locationId: other.id,
      providerId: "any",
      withinDays: 60,
    });
    if (!alt) return null;
    const altDays = differenceInCalendarDays(new Date(alt.start), startOfDay(new Date()));
    const daysSaved = chosenDays - altDays;
    if (daysSaved < minGainDays) return null;

    return {
      from: args.locationId,
      to: other.id,
      chosenSlot: chosen,
      betterSlot: alt,
      daysSaved,
      extraDriveMinutes: DRIVE_MINUTES_BETWEEN,
    };
  }

  /** Soonest opening at a location for ANY service — the "next opening" teaser. */
  nextAvailableAnyService(locationId: LiveLocationId, withinDays = 45): Slot | null {
    let best: Slot | null = null;
    for (const svc of SERVICES) {
      if (svc.emergency) continue; // emergency chairs aren't a general teaser
      const s = this.nextAvailable({ serviceId: svc.id, locationId, providerId: "any", withinDays });
      if (s && (!best || s.start < best.start)) best = s;
    }
    return best;
  }

  /** Rolling utilization per location — powers the balancing decision. */
  utilizationByLocation(days = 14): Record<LiveLocationId, number> {
    const from = startOfDay(new Date());
    const to = new Date(from.getTime() + days * 864e5);
    const out = {} as Record<LiveLocationId, number>;
    for (const loc of LOCATIONS) {
      out[loc.id] = this.analytics({ from, to, locationId: loc.id }).utilization;
    }
    return out;
  }

  // -- analytics ------------------------------------------------
  analytics(range: { from: Date; to: Date; locationId?: LiveLocationId }) {
    const inRange = this.data.appointments.filter((a) => {
      const t = new Date(a.start);
      if (t < range.from || t > range.to) return false;
      if (range.locationId && a.locationId !== range.locationId) return false;
      return true;
    });
    const locations = range.locationId ? [getLocation(range.locationId)!] : LOCATIONS;

    const completed = inRange.filter((a) => a.status === "complete");
    const noShow = inRange.filter((a) => a.status === "no-show");
    const cancelled = inRange.filter((a) => a.status === "cancelled");
    const kept = completed.length + noShow.length;
    const noShowRate = kept ? noShow.length / kept : 0;

    // chair utilization: booked minutes vs. staffed provider-minutes (real capacity)
    let availableMin = 0;
    for (let d = new Date(range.from); d <= range.to; d = addMinutes(d, 24 * 60)) {
      const wd = d.getDay() as Weekday;
      for (const loc of locations) {
        const h = loc.hours[wd];
        if (!h) continue;
        const staffed = PROVIDERS.filter((p) => (p.schedule[loc.id]?.[wd]?.length ?? 0) > 0).length;
        if (staffed === 0) continue;
        // minus the lunch hour that isn't bookable
        const span = toMin(h.close) - toMin(h.open) - (h.lunch ? 60 : 0);
        availableMin += span * staffed;
      }
    }
    const bookedMin = inRange
      .filter((a) => a.status !== "cancelled")
      .reduce((s, a) => s + (getService(a.serviceId)?.durationMin ?? 0), 0);
    const utilization = availableMin ? Math.min(1, bookedMin / availableMin) : 0;
    const openChairHours = Math.max(0, (availableMin - bookedMin) / 60);

    const bySource: Record<string, number> = {};
    for (const a of inRange.filter((x) => x.isNewPatient)) bySource[a.source] = (bySource[a.source] ?? 0) + 1;

    const channelSplit = { online: 0, phone: 0, other: 0 };
    for (const a of inRange) {
      if (a.source === "online") channelSplit.online++;
      else if (a.source === "phone") channelSplit.phone++;
      else channelSplit.other++;
    }

    const productionByProvider: Record<string, number> = {};
    for (const a of completed) {
      const v = getService(a.serviceId)?.value ?? 0;
      productionByProvider[a.providerId] = (productionByProvider[a.providerId] ?? 0) + v;
    }

    // weekly series
    const weeks: { week: string; booked: number; completed: number; noShow: number; production: number }[] = [];
    const wkStart = startOfDay(range.from);
    for (let w = 0; w < 10; w++) {
      const s = addMinutes(wkStart, w * 7 * 24 * 60);
      const e = addMinutes(s, 7 * 24 * 60);
      if (s > range.to) break;
      const slice = inRange.filter((a) => {
        const t = new Date(a.start);
        return t >= s && t < e;
      });
      weeks.push({
        week: `${s.getMonth() + 1}/${s.getDate()}`,
        booked: slice.length,
        completed: slice.filter((a) => a.status === "complete").length,
        noShow: slice.filter((a) => a.status === "no-show").length,
        production: slice
          .filter((a) => a.status === "complete")
          .reduce((sum, a) => sum + (getService(a.serviceId)?.value ?? 0), 0),
      });
    }

    return {
      totals: {
        booked: inRange.length,
        completed: completed.length,
        noShow: noShow.length,
        cancelled: cancelled.length,
        production: completed.reduce((s, a) => s + (getService(a.serviceId)?.value ?? 0), 0),
      },
      noShowRate,
      utilization,
      openChairHours,
      openChairCost: openChairHours * CHAIR_HOUR_COST,
      newPatientsBySource: bySource,
      channelSplit,
      productionByProvider,
      weeks,
    };
  }

  // -- raw accessor -------------------------------------------
  raw() {
    return this.data;
  }
}

function getProviderLast(id: ProviderId): string {
  return PROVIDERS.find((p) => p.id === id)?.lastName ?? id;
}
function toMin(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}

export interface RecoveryResult {
  freed: Appointment;
  offersSent: NotificationRecord[];
  filled: Appointment | null;
  revenueRecovered: number;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const day = differenceInCalendarDays(startOfDay(d), startOfDay(new Date()));
  const rel = day === 0 ? "today" : day === 1 ? "tomorrow" : d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  return `${rel} at ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

// singleton
let _store: GleamStore | null = null;
export function getStore(): GleamStore {
  if (!_store) _store = new GleamStore();
  return _store;
}
export type { GleamStore };
