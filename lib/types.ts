// ---------------------------------------------------------------------------
// Gleam Dental Care — domain types.  Demo only. No real PHI ever stored here.
// ---------------------------------------------------------------------------

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

/** "HH:mm" 24h local time. */
export type Clock = string;

export interface DayHours {
  open: Clock;
  close: Clock;
  /** [start, end] closed-for-lunch window, optional. */
  lunch?: [Clock, Clock];
}

export type LiveLocationId = "atlantic-beach" | "bartram-park";
export type ComingSoonLocationId = "fleming-island" | "tinseltown" | "world-golf-village";
export type LocationId = LiveLocationId;

export interface Location {
  id: LiveLocationId;
  name: string;
  shortName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  /** number of operatories / chairs */
  chairs: number;
  /** index 0 = Sunday .. 6 = Saturday; null = closed that day */
  hours: (DayHours | null)[];
  lat: number;
  lng: number;
  /** blurb for the location card */
  blurb: string;
}

export interface ComingSoonLocation {
  id: ComingSoonLocationId;
  name: string;
  region: string;
  opening: string; // "2026" | "2027"
  blurb: string;
}

export type ServiceCategory = "general" | "cosmetic" | "surgical" | "ortho" | "pediatric" | "urgent";
export type ServiceIcon =
  | "sparkles"
  | "toothbrush"
  | "alert"
  | "smile"
  | "align"
  | "implant"
  | "kids";

export interface Service {
  id: string;
  name: string;
  shortName: string;
  icon: ServiceIcon;
  category: ServiceCategory;
  /** chair time in minutes */
  durationMin: number;
  /** turnover / cleanup buffer after the appointment */
  bufferMin: number;
  /** providers who can perform this service */
  providerIds: string[];
  /** equipment the operatory needs */
  equipment: string[];
  emergency: boolean;
  /** typical patient intent */
  patientType: "new" | "returning" | "any";
  description: string;
  /** rough production value, used by analytics + ROI */
  value: number;
}

export type ProviderId = "murphy" | "greenberg" | "acosta" | "weaver" | "salgado";

export interface Shift {
  start: Clock;
  end: Clock;
}

export interface Provider {
  id: ProviderId;
  firstName: string;
  lastName: string;
  credential: "DDS" | "DMD";
  initials: string; // SM, AG, AA, LW, KS
  title: string;
  bio: string;
  locationIds: LiveLocationId[];
  serviceIds: string[];
  /** per location, per weekday -> shifts worked. Missing weekday = off. */
  schedule: Partial<Record<LiveLocationId, Partial<Record<Weekday, Shift[]>>>>;
}

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked-in"
  | "in-chair"
  | "complete"
  | "no-show"
  | "cancelled";

export type BookingSource = "online" | "phone" | "walk-in" | "referral" | "google";

export interface Appointment {
  id: string;
  token: string; // for /appt/[token] management links
  patientId: string;
  providerId: ProviderId;
  locationId: LiveLocationId;
  serviceId: string;
  chair: number; // 1..N
  start: string; // ISO
  end: string; // ISO
  status: AppointmentStatus;
  source: BookingSource;
  isNewPatient: boolean;
  createdAt: string; // ISO
  familyGroupId?: string;
  notes?: string;
  /** set when a cancelled slot was refilled from the waitlist */
  filledFromWaitlist?: boolean;
  reviewRating?: number;
}

export type RecallStatus = "scheduled" | "due" | "overdue" | "lapsed";

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dob: string; // ISO date
  insuranceCarrier: string | null;
  memberId: string | null;
  homeLocationId: LiveLocationId;
  lastVisit: string | null; // ISO
  nextVisit: string | null; // ISO
  balance: number;
  noShowCount: number;
  recallStatus: RecallStatus;
  source: BookingSource;
  familyGroupId?: string;
  createdAt: string;
}

export interface PreferredWindow {
  /** weekday buckets the patient can do */
  days: ("weekday" | "weekend" | "mon" | "tue" | "wed" | "thu" | "fri")[];
  /** time-of-day buckets */
  times: ("morning" | "midday" | "afternoon")[];
}

export interface WaitlistEntry {
  id: string;
  patientName: string;
  phone: string;
  patientId?: string;
  locationPref: LiveLocationId | "either";
  providerId?: ProviderId | "any";
  serviceId: string;
  window: PreferredWindow;
  /** don't offer slots later than the appointment they already hold */
  currentAppointmentId?: string;
  createdAt: string;
  status: "active" | "offered" | "filled" | "expired";
  notBefore?: string; // ISO
}

export type BlockKind = "pto" | "block" | "lunch" | "meeting";

export interface ScheduleBlock {
  id: string;
  locationId: LiveLocationId;
  providerId?: ProviderId; // undefined = whole-office block
  start: string; // ISO
  end: string; // ISO
  kind: BlockKind;
  reason: string;
}

/** Overrides a provider's default weekday split between locations (Dr. Murphy demo). */
export interface ScheduleOverride {
  providerId: ProviderId;
  /** weekday -> location the provider works that day (or "off") */
  assignment: Partial<Record<Weekday, LiveLocationId | "off">>;
}

export type AdminRole = "front-desk" | "office-manager" | "regional-director";

export interface Campaign {
  id: string;
  kind: "recall" | "reactivation";
  sentAt: string;
  patientIds: string[];
  channel: NotificationChannel;
  estimatedRevenue: number;
}

export interface ComingSoonLead {
  id: string;
  name: string;
  email: string;
  zip: string;
  preferredLocation: ComingSoonLocationId;
  createdAt: string;
}

export interface IntakeForm {
  token: string; // matches appointment token
  medicalConditions: string[];
  medicalNotes: string;
  allergies: string[];
  medications: string;
  pharmacy: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  hipaaAcknowledged: boolean;
  consentToTreat: boolean;
  signatureDataUrl: string | null;
  signedName: string;
  completedSections: string[]; // ids of finished sections
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Phase 3 — differentiators
// ---------------------------------------------------------------------------

export type MembershipTier = "individual" | "perio" | "child";

export interface MembershipPlan {
  id: MembershipTier;
  name: string;
  /** annual price in dollars */
  price: number;
  monthly: number;
  benefits: string[];
  /** % off other treatment */
  treatmentDiscountPct: number;
  bestFor: string;
}

export interface Member {
  id: string;
  patientId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  tier: MembershipTier;
  /** "annual" bills once, "monthly" bills 12x */
  billing: "annual" | "monthly";
  startedAt: string; // ISO
  renewsAt: string; // ISO
  status: "active" | "cancelled";
  locationId: LiveLocationId;
}

export interface SmileDesignSubmission {
  id: string;
  /** appointment token this is attached to */
  token: string;
  /** data URLs — demo only, never leaves the browser */
  photos: { id: string; label: string; dataUrl: string }[];
  goals: string[];
  notes: string;
  budgetRange?: string;
  timeline?: string;
  createdAt: string;
}

export type ReviewRoute = "public" | "private" | "pending";

export interface ReviewResponse {
  id: string;
  appointmentId: string;
  patientId: string;
  rating: number; // 1..5
  route: ReviewRoute;
  /** only captured on the private (1–3★) path */
  privateFeedback?: string;
  /** true once the patient clicked through to Google */
  postedPublicly?: boolean;
  createdAt: string;
}

export type NotificationChannel = "sms" | "email";

export interface NotificationRecord {
  id: string;
  channel: NotificationChannel;
  to: string;
  subject?: string;
  body: string;
  createdAt: string;
  kind:
    | "confirmation"
    | "reminder"
    | "waitlist-offer"
    | "waitlist-filled"
    | "recall"
    | "reactivation"
    | "review-request"
    | "intake-nudge"
    | "coming-soon"
    | "membership"
    | "smile-design";
  relatedAppointmentId?: string;
}

// The eligibility mock result shown after "Verifying coverage..."
export interface EligibilityResult {
  carrier: string;
  planName: string;
  memberId: string;
  status: "active";
  annualMaximum: number;
  annualMaximumRemaining: number;
  deductible: number;
  deductibleMet: number;
  preventiveCoveragePct: number; // 100
  basicCoveragePct: number; // 80
  majorCoveragePct: number; // 50
  network: "in-network";
}

// ---------------------------------------------------------------------------
// Availability engine
// ---------------------------------------------------------------------------

export interface Slot {
  start: string; // ISO
  end: string; // ISO
  providerId: ProviderId;
  locationId: LiveLocationId;
  chair: number;
}

export interface DayAvailability {
  date: string; // ISO date (yyyy-MM-dd)
  weekday: Weekday;
  open: boolean;
  /** human reason when closed / limited, e.g. "Closed Fridays after 2 PM" */
  note?: string;
  slots: Slot[];
}
