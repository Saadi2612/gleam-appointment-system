import type {
  ComingSoonLocation,
  Location,
  MembershipPlan,
  Provider,
  Service,
  Weekday,
} from "./types";

// ---------------------------------------------------------------------------
// GLEAM DENTAL CARE — real-world facts about the prospect.
// Everything a presenter might need to tweak before a pitch lives in this file.
// ---------------------------------------------------------------------------

export const BRAND = {
  name: "Gleam Dental Care",
  tagline: "Exceptional care you can trust. A smile to match.",
  legacyBookingUrl: "https://flexbook.me/",
  supportEmail: "hello@gleamdental.com",
} as const;

const MF = (open: string, close: string) => ({
  open,
  close,
  lunch: ["13:00", "14:00"] as [string, string],
});

export const LOCATIONS: Location[] = [
  {
    id: "atlantic-beach",
    name: "Atlantic Dentistry at Atlantic Beach",
    shortName: "Atlantic Beach",
    address: "13474 Atlantic Blvd #109",
    city: "Jacksonville",
    state: "FL",
    zip: "32225",
    phone: "(904) 647-1800",
    chairs: 6,
    // 0 Sun .. 6 Sat
    hours: [
      null,
      MF("08:00", "17:00"), // Mon
      MF("08:00", "17:00"), // Tue
      MF("08:30", "17:00"), // Wed
      MF("08:00", "17:00"), // Thu
      { open: "08:30", close: "14:00" }, // Fri (no lunch block, short day)
      null,
    ],
    lat: 30.3225,
    lng: -81.4293,
    blurb: "Our flagship on Atlantic Blvd — sedation suite, iTero scanners, Netflix in every operatory.",
  },
  {
    id: "bartram-park",
    name: "Atlantic Dentistry at Bartram Park",
    shortName: "Bartram Park",
    address: "13920 Old St. Augustine Rd #103",
    city: "Jacksonville",
    state: "FL",
    zip: "32258",
    phone: "(904) 425-8281",
    chairs: 5,
    hours: [
      null,
      MF("08:00", "17:00"), // Mon
      MF("08:00", "17:00"), // Tue
      MF("08:00", "17:00"), // Wed
      MF("08:00", "17:00"), // Thu
      { open: "08:00", close: "14:00" }, // Fri
      null,
    ],
    lat: 30.1361,
    lng: -81.5457,
    blurb: "South Jacksonville — family-friendly, digital smile design, same-day emergency chairs held daily.",
  },
];

export const COMING_SOON: ComingSoonLocation[] = [
  {
    id: "fleming-island",
    name: "Fleming Island",
    region: "Clay County",
    opening: "2026",
    blurb: "Full-service general, cosmetic & Invisalign — just off US-17.",
  },
  {
    id: "tinseltown",
    name: "Tinseltown",
    region: "Southside Jacksonville",
    opening: "2026",
    blurb: "Our third Duval County office, steps from Tinseltown shops.",
  },
  {
    id: "world-golf-village",
    name: "World Golf Village",
    region: "St. Johns County",
    opening: "2027",
    blurb: "Serving St. Johns families with the full Gleam experience.",
  },
];

export const SERVICES: Service[] = [
  {
    id: "new-patient-exam",
    name: "New Patient Exam & Cleaning",
    shortName: "New Patient Exam",
    icon: "sparkles",
    category: "general",
    durationMin: 90,
    bufferMin: 10,
    providerIds: ["murphy", "greenberg", "acosta", "weaver", "salgado"],
    equipment: ["iTero scanner", "Pano X-ray"],
    emergency: false,
    patientType: "new",
    description: "Comprehensive exam, full X-rays, digital scan, and a gentle cleaning. Plan for 90 minutes.",
    value: 285,
  },
  {
    id: "routine-cleaning",
    name: "Routine Cleaning",
    shortName: "Cleaning",
    icon: "toothbrush",
    category: "general",
    durationMin: 60,
    bufferMin: 10,
    providerIds: ["murphy", "greenberg", "acosta", "weaver", "salgado"],
    equipment: ["Hygiene chair"],
    emergency: false,
    patientType: "returning",
    description: "Your 6-month recall cleaning, polish, and exam.",
    value: 165,
  },
  {
    id: "emergency",
    name: "Emergency / Tooth Pain",
    shortName: "Emergency",
    icon: "alert",
    category: "urgent",
    durationMin: 45,
    bufferMin: 10,
    providerIds: ["murphy", "greenberg", "acosta", "weaver", "salgado"],
    equipment: ["Emergency chair", "PA X-ray"],
    emergency: true,
    patientType: "any",
    description: "Same-day relief for pain, swelling, a broken tooth, or a lost crown.",
    value: 240,
  },
  {
    id: "cosmetic-consult",
    name: "Cosmetic Consult",
    shortName: "Cosmetic",
    icon: "smile",
    category: "cosmetic",
    durationMin: 45,
    bufferMin: 10,
    providerIds: ["murphy", "greenberg", "weaver"],
    equipment: ["Virtual smile design", "Intraoral camera"],
    emergency: false,
    patientType: "any",
    description: "Veneers, whitening, bonding — see your new smile previewed digitally before you commit.",
    value: 95,
  },
  {
    id: "invisalign-consult",
    name: "Invisalign Consult",
    shortName: "Invisalign",
    icon: "align",
    category: "ortho",
    durationMin: 45,
    bufferMin: 10,
    providerIds: ["murphy", "acosta", "salgado"],
    equipment: ["iTero scanner"],
    emergency: false,
    patientType: "any",
    description: "A digital scan and a same-visit look at your Invisalign treatment plan and timeline.",
    value: 120,
  },
  {
    id: "implant-consult",
    name: "Implant Consult",
    shortName: "Implant",
    icon: "implant",
    category: "surgical",
    durationMin: 60,
    bufferMin: 15,
    providerIds: ["murphy", "greenberg"],
    equipment: ["CBCT 3D scan"],
    emergency: false,
    patientType: "any",
    description: "3D imaging and a full plan for single implants, bridges, or full-arch — no referral needed.",
    value: 150,
  },
  {
    id: "kids-visit",
    name: "Kids' Visit",
    shortName: "Kids",
    icon: "kids",
    category: "pediatric",
    durationMin: 45,
    bufferMin: 10,
    providerIds: ["acosta", "weaver", "salgado", "murphy"],
    equipment: ["Hygiene chair"],
    emergency: false,
    patientType: "any",
    description: "Cleaning, exam, fluoride, and a tour of the operatory for kids 3–14.",
    value: 145,
  },
];

// -- Provider schedules -----------------------------------------------------
// Standard full weekday shift, split around the location lunch block.
const FULL: Record<number, { start: string; end: string }[]> = {
  1: [{ start: "08:00", end: "17:00" }],
  2: [{ start: "08:00", end: "17:00" }],
  3: [{ start: "08:00", end: "17:00" }],
  4: [{ start: "08:00", end: "17:00" }],
  5: [{ start: "08:00", end: "14:00" }],
};
const pick = (days: Weekday[]) =>
  Object.fromEntries(days.map((d) => [d, FULL[d]])) as Record<
    Weekday,
    { start: string; end: string }[]
  >;

export const PROVIDERS: Provider[] = [
  {
    id: "murphy",
    firstName: "Sebastien",
    lastName: "Murphy",
    credential: "DDS",
    initials: "SM",
    title: "Founding Dentist",
    bio: "Practice founder. Splits the week between both Jacksonville offices. Sedation, implants, and full-mouth reconstruction.",
    locationIds: ["atlantic-beach", "bartram-park"],
    serviceIds: SERVICES.map((s) => s.id),
    // The demo split: Mon/Wed/Fri Atlantic Beach, Tue/Thu Bartram Park
    schedule: {
      "atlantic-beach": pick([1, 3, 5]),
      "bartram-park": pick([2, 4]),
    },
  },
  {
    id: "greenberg",
    firstName: "Adam",
    lastName: "Greenberg",
    credential: "DMD",
    initials: "AG",
    title: "General & Implant Dentistry",
    bio: "Surgical implant placement and complex restorative work. Atlantic Beach.",
    locationIds: ["atlantic-beach"],
    serviceIds: ["new-patient-exam", "routine-cleaning", "emergency", "cosmetic-consult", "implant-consult"],
    schedule: { "atlantic-beach": pick([1, 2, 4, 5]) }, // off Wednesday
  },
  {
    id: "acosta",
    firstName: "Aillen",
    lastName: "Acosta",
    credential: "DMD",
    initials: "AA",
    title: "General & Family Dentistry",
    bio: "Invisalign provider and a favorite with anxious patients and kids. Atlantic Beach. Bilingual (English / Spanish).",
    locationIds: ["atlantic-beach"],
    serviceIds: ["new-patient-exam", "routine-cleaning", "emergency", "invisalign-consult", "kids-visit"],
    schedule: { "atlantic-beach": pick([2, 3, 4, 5]) }, // off Monday
  },
  {
    id: "weaver",
    firstName: "Laura",
    lastName: "Weaver",
    credential: "DDS",
    initials: "LW",
    title: "General & Cosmetic Dentistry",
    bio: "Cosmetic bonding, veneers, and whitening. Bartram Park.",
    locationIds: ["bartram-park"],
    serviceIds: ["new-patient-exam", "routine-cleaning", "emergency", "cosmetic-consult", "kids-visit"],
    schedule: { "bartram-park": pick([1, 2, 3, 5]) }, // off Thursday
  },
  {
    id: "salgado",
    firstName: "K.",
    lastName: "Salgado",
    credential: "DMD",
    initials: "KS",
    title: "General & Family Dentistry",
    bio: "Invisalign and family care. Bartram Park. Bilingual (English / Spanish).",
    locationIds: ["bartram-park"],
    serviceIds: ["new-patient-exam", "routine-cleaning", "emergency", "invisalign-consult", "kids-visit"],
    schedule: { "bartram-park": pick([1, 2, 3, 4]) }, // off Friday
  },
];

// -- In-house membership plan (for the ~30% of patients with no insurance) ---
export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: "individual",
    name: "Gleam Care — Individual",
    price: 349,
    monthly: 32,
    benefits: [
      "2 professional cleanings a year",
      "2 comprehensive exams",
      "All routine X-rays included",
      "1 emergency exam per year",
      "No deductibles, no annual maximum, no waiting periods",
    ],
    treatmentDiscountPct: 15,
    bestFor: "Adults without dental insurance",
  },
  {
    id: "child",
    name: "Gleam Care — Child (under 14)",
    price: 279,
    monthly: 26,
    benefits: [
      "2 cleanings with fluoride",
      "2 exams a year",
      "All routine X-rays included",
      "Sealants at member pricing",
      "No deductibles or waiting periods",
    ],
    treatmentDiscountPct: 15,
    bestFor: "Kids 3–13",
  },
  {
    id: "perio",
    name: "Gleam Care — Perio",
    price: 599,
    monthly: 55,
    benefits: [
      "3–4 periodontal maintenance visits",
      "2 comprehensive exams",
      "All routine X-rays included",
      "1 emergency exam per year",
      "No deductibles, no annual maximum",
    ],
    treatmentDiscountPct: 15,
    bestFor: "Patients in periodontal maintenance",
  },
];

export const INSURANCE_CARRIERS = [
  "Delta Dental",
  "MetLife",
  "Cigna Dental",
  "Aetna",
  "Guardian",
  "United Concordia",
  "Humana Dental",
  "BlueCross BlueShield (FL)",
  "Careington",
  "I'll pay out of pocket",
] as const;

// -- lookup helpers -------------------------------------------------------

export const getLocation = (id: string) => LOCATIONS.find((l) => l.id === id);
export const getProvider = (id: string) => PROVIDERS.find((p) => p.id === id);
export const getService = (id: string) => SERVICES.find((s) => s.id === id);

export function providersFor(serviceId: string, locationId?: string): Provider[] {
  return PROVIDERS.filter((p) => {
    if (!p.serviceIds.includes(serviceId)) return false;
    if (locationId && !p.locationIds.includes(locationId as never)) return false;
    return true;
  });
}

export function servicesForProvider(providerId: string): Service[] {
  return SERVICES.filter((s) => s.providerIds.includes(providerId));
}
