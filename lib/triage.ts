import type { Lang } from "./i18n";

// ---------------------------------------------------------------------------
// AI triage assistant — a deterministic rule/keyword engine over a symptom map.
// Deliberately NOT an external API call: the demo must be instant and work
// offline, and a real deployment would keep triage auditable anyway.
// ---------------------------------------------------------------------------

export type Urgency = "emergency" | "urgent" | "routine" | "elective";

export interface TriageRule {
  id: string;
  /** words/phrases that fire this rule (lowercase, matched as substrings) */
  keywords: string[];
  /** stronger signals — worth double */
  strong?: string[];
  /** if any of these appear, the rule is suppressed */
  excludes?: string[];
  urgency: Urgency;
  serviceId: string;
  /** what the assistant says when this rule wins */
  reply: Record<Lang, string>;
  /** short label shown on the recommendation chip */
  label: Record<Lang, string>;
  /** red-flag copy shown above the recommendation */
  redFlag?: Record<Lang, string>;
}

export const URGENCY_META: Record<
  Urgency,
  { label: Record<Lang, string>; className: string; order: number }
> = {
  emergency: {
    label: { en: "See you today", es: "Atención hoy mismo" },
    className: "bg-destructive/12 text-destructive",
    order: 0,
  },
  urgent: {
    label: { en: "Within a few days", es: "En pocos días" },
    className: "bg-accent/15 text-accent",
    order: 1,
  },
  routine: {
    label: { en: "Routine visit", es: "Visita de rutina" },
    className: "bg-primary/12 text-primary",
    order: 2,
  },
  elective: {
    label: { en: "Consultation", es: "Consulta" },
    className: "bg-success/15 text-success",
    order: 3,
  },
};

export const TRIAGE_RULES: TriageRule[] = [
  // ---- true emergencies -------------------------------------------------
  {
    id: "swelling",
    keywords: ["swollen", "swelling", "abscess", "pus", "fever", "face is puffy", "hinchado", "hinchazón", "absceso", "fiebre"],
    strong: ["abscess", "pus", "swollen face", "absceso"],
    urgency: "emergency",
    serviceId: "emergency",
    label: { en: "Emergency / Tooth Pain", es: "Emergencia / Dolor de muela" },
    reply: {
      en: "Swelling with a tooth can mean an infection, and those don't wait. I'm putting you on today's emergency list — we hold same-day chairs at both offices for exactly this.",
      es: "La hinchazón con un diente puede indicar una infección, y eso no espera. Lo pongo en la lista de emergencias de hoy — reservamos sillas del mismo día en ambas oficinas justo para esto.",
    },
    redFlag: {
      en: "If you have trouble breathing or swallowing, or swelling around your eye, go to the ER or call 911 now.",
      es: "Si tiene dificultad para respirar o tragar, o hinchazón alrededor del ojo, vaya a emergencias o llame al 911 ahora.",
    },
  },
  {
    id: "knocked-out",
    keywords: ["knocked out", "fell out", "got hit", "trauma", "bleeding", "avulsed", "se me cayó el diente", "golpe", "sangrado"],
    strong: ["knocked out", "avulsed"],
    urgency: "emergency",
    serviceId: "emergency",
    label: { en: "Emergency / Tooth Pain", es: "Emergencia / Dolor de muela" },
    reply: {
      en: "A knocked-out tooth is time-critical — keep it in milk or your cheek, don't scrub the root, and get in within the hour if you can. Booking you into today's emergency slots.",
      es: "Un diente arrancado es urgente — guárdelo en leche o en su mejilla, no frote la raíz, y venga dentro de la hora si puede. Le reservo un espacio de emergencia hoy.",
    },
    redFlag: {
      en: "Call the office directly — we can often see a trauma faster than an online slot.",
      es: "Llame directamente a la oficina — a menudo podemos atender un trauma más rápido que una cita en línea.",
    },
  },
  {
    id: "severe-pain",
    keywords: ["severe pain", "throbbing", "can't sleep", "keeping me up", "worst pain", "10/10", "unbearable", "dolor severo", "no puedo dormir", "punzante"],
    strong: ["can't sleep", "unbearable", "throbbing"],
    urgency: "emergency",
    serviceId: "emergency",
    label: { en: "Emergency / Tooth Pain", es: "Emergencia / Dolor de muela" },
    reply: {
      en: "Pain that keeps you awake usually means the nerve is involved, and that's a same-day visit. Let's get you out of pain first and plan the fix after.",
      es: "El dolor que no lo deja dormir suele indicar que el nervio está afectado, y eso es una visita del mismo día. Primero le quitamos el dolor y después planeamos el tratamiento.",
    },
  },
  // ---- urgent but not same-day-critical ---------------------------------
  {
    id: "broken-tooth",
    keywords: ["chipped", "cracked", "broke", "broken", "chip", "fractured", "roto", "astillado", "fracturado", "quebrado"],
    strong: ["broken tooth", "cracked tooth", "chipped"],
    excludes: ["denture", "dentadura"],
    urgency: "urgent",
    serviceId: "emergency",
    label: { en: "Emergency / Tooth Pain", es: "Emergencia / Dolor de muela" },
    reply: {
      en: "A chipped or cracked tooth should be looked at quickly — even when it doesn't hurt, a sharp edge can cut your tongue and the crack can spread. We'll get you seen and talk about how to make it look right.",
      es: "Un diente astillado o fracturado debe revisarse pronto — aunque no duela, un borde filoso puede cortar la lengua y la fractura puede avanzar. Lo atendemos y hablamos de cómo dejarlo bien.",
    },
  },
  {
    id: "lost-crown",
    keywords: ["crown fell", "lost crown", "filling fell", "lost filling", "cap came off", "se cayó la corona", "se cayó el relleno", "empaste"],
    strong: ["crown fell out", "filling fell out"],
    urgency: "urgent",
    serviceId: "emergency",
    label: { en: "Emergency / Tooth Pain", es: "Emergencia / Dolor de muela" },
    reply: {
      en: "A crown or filling that came out leaves the tooth exposed — it's usually a quick re-cement or rebuild, but the sooner the better. Bring the crown with you if you still have it.",
      es: "Una corona o empaste que se salió deja el diente expuesto — normalmente es un recementado rápido, pero mientras antes mejor. Traiga la corona si todavía la tiene.",
    },
  },
  {
    id: "sensitivity",
    keywords: ["sensitive", "sensitivity", "cold hurts", "hot hurts", "twinge", "aches when", "sensible", "sensibilidad", "duele con el frío"],
    urgency: "urgent",
    serviceId: "emergency",
    label: { en: "Emergency / Tooth Pain", es: "Emergencia / Dolor de muela" },
    reply: {
      en: "Sensitivity to hot or cold is usually an early cavity, a worn spot, or a cracked filling — all easy to fix early and expensive to ignore. Let's take a look this week.",
      es: "La sensibilidad al frío o al calor suele ser una caries temprana, desgaste o un empaste fracturado — fáciles de tratar a tiempo y caros de ignorar. Revisémoslo esta semana.",
    },
  },
  {
    id: "bleeding-gums",
    keywords: ["gums bleed", "bleeding gums", "gum pain", "gums hurt", "receding", "encías sangran", "sangrado de encías", "encías"],
    strong: ["bleeding gums", "encías sangran"],
    urgency: "urgent",
    serviceId: "routine-cleaning",
    label: { en: "Routine Cleaning", es: "Limpieza de rutina" },
    reply: {
      en: "Bleeding gums are the earliest sign of gum disease, and it's very reversible at this stage. A cleaning plus a periodontal check is the right starting point.",
      es: "Las encías que sangran son la primera señal de enfermedad periodontal, y en esta etapa es muy reversible. Una limpieza más una evaluación periodontal es el punto de partida correcto.",
    },
  },
  // ---- cosmetic / elective ---------------------------------------------
  {
    id: "cosmetic",
    keywords: ["whiten", "whitening", "veneer", "veneers", "smile", "stained", "yellow", "gap", "wedding", "photos", "blanqueamiento", "carillas", "sonrisa", "manchado", "boda"],
    strong: ["veneers", "whitening", "wedding", "carillas", "blanqueamiento"],
    excludes: ["straighten", "invisalign", "braces", "crooked"],
    urgency: "elective",
    serviceId: "cosmetic-consult",
    label: { en: "Cosmetic Consult", es: "Consulta cosmética" },
    reply: {
      en: "This is exactly what our cosmetic consult is for — we'll scan your smile and show you a digital preview of the result before you commit to anything.",
      es: "Para esto es justamente nuestra consulta cosmética — escaneamos su sonrisa y le mostramos una vista previa digital del resultado antes de que decida nada.",
    },
  },
  {
    id: "invisalign",
    keywords: ["straighten", "crooked", "invisalign", "braces", "aligners", "crowded teeth", "overbite", "chueco", "torcido", "alineadores", "frenos"],
    strong: ["invisalign", "aligners", "straighten"],
    urgency: "elective",
    serviceId: "invisalign-consult",
    label: { en: "Invisalign Consult", es: "Consulta de Invisalign" },
    reply: {
      en: "We do Invisalign in-house — no referral needed. The consult includes an iTero scan and you'll see your projected result and timeline in the same visit.",
      es: "Hacemos Invisalign internamente — sin referido. La consulta incluye un escaneo iTero y verá su resultado proyectado y el cronograma en la misma visita.",
    },
  },
  {
    id: "implant",
    keywords: ["missing tooth", "missing teeth", "implant", "denture", "bridge", "gap where", "pulled", "extracted", "implante", "dentadura", "puente", "diente faltante"],
    strong: ["implant", "missing tooth", "denture", "implante"],
    urgency: "elective",
    serviceId: "implant-consult",
    label: { en: "Implant Consult", es: "Consulta de implantes" },
    reply: {
      en: "Replacing a missing tooth is very doable — the implant consult includes a 3D CBCT scan so you leave knowing the plan, the timeline, and the number. All done here, no referral.",
      es: "Reemplazar un diente faltante es muy factible — la consulta de implantes incluye un escaneo 3D CBCT para que salga sabiendo el plan, el tiempo y el costo. Todo aquí, sin referido.",
    },
  },
  // ---- routine ---------------------------------------------------------
  {
    id: "kids",
    keywords: ["my son", "my daughter", "my kid", "my child", "kids", "children", "year old", "mi hijo", "mi hija", "niño", "niña"],
    strong: ["my son", "my daughter", "mi hijo", "mi hija"],
    urgency: "routine",
    serviceId: "kids-visit",
    label: { en: "Kids' Visit", es: "Visita para niños" },
    reply: {
      en: "We love seeing kids — the visit includes a cleaning, exam, fluoride, and a little tour of the room so nothing feels scary.",
      es: "Nos encanta atender a los niños — la visita incluye limpieza, examen, flúor y un pequeño recorrido por el consultorio para que nada dé miedo.",
    },
  },
  {
    id: "new-patient",
    keywords: ["new patient", "haven't been", "havent been", "first time", "years since", "new to the area", "moved here", "checkup", "check up", "paciente nuevo", "primera vez", "hace años", "chequeo"],
    strong: ["new patient", "first time", "haven't been", "paciente nuevo"],
    urgency: "routine",
    serviceId: "new-patient-exam",
    label: { en: "New Patient Exam & Cleaning", es: "Examen y limpieza para paciente nuevo" },
    reply: {
      en: "Welcome — a new patient visit is the right start. It's 90 minutes: full X-rays, a digital scan, an exam, and a cleaning, so you leave knowing exactly where you stand.",
      es: "Bienvenido — una visita de paciente nuevo es el comienzo correcto. Son 90 minutos: radiografías completas, escaneo digital, examen y limpieza, para que salga sabiendo exactamente su situación.",
    },
  },
  {
    id: "cleaning",
    keywords: ["cleaning", "6 month", "six month", "hygiene", "due for", "recall", "limpieza", "seis meses", "higiene"],
    strong: ["cleaning", "limpieza"],
    urgency: "routine",
    serviceId: "routine-cleaning",
    label: { en: "Routine Cleaning", es: "Limpieza de rutina" },
    reply: {
      en: "Easy — a routine cleaning it is. Sixty minutes with the hygienist plus a quick exam from the dentist.",
      es: "Perfecto — una limpieza de rutina. Sesenta minutos con la higienista más un examen rápido del dentista.",
    },
  },
];

// -- time-pressure detection ("wedding in three weeks") --------------------
const DEADLINE_PATTERNS: { re: RegExp; days: (m: RegExpMatchArray) => number }[] = [
  { re: /in\s+(\d+)\s*days?/i, days: (m) => Number(m[1]) },
  { re: /in\s+(\d+)\s*weeks?/i, days: (m) => Number(m[1]) * 7 },
  { re: /in\s+(\d+)\s*months?/i, days: (m) => Number(m[1]) * 30 },
  { re: /en\s+(\d+)\s*d[ií]as?/i, days: (m) => Number(m[1]) },
  { re: /en\s+(\d+)\s*semanas?/i, days: (m) => Number(m[1]) * 7 },
  { re: /en\s+(\d+)\s*meses?/i, days: (m) => Number(m[1]) * 30 },
  { re: /\b(next week|la pr[oó]xima semana)\b/i, days: () => 7 },
  { re: /\b(this week|esta semana)\b/i, days: () => 3 },
  { re: /\b(tomorrow|ma[ñn]ana)\b/i, days: () => 1 },
];

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
};

function normalizeNumberWords(text: string): string {
  return text.replace(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b/gi,
    (w) => String(WORD_NUMBERS[w.toLowerCase()] ?? w),
  );
}

export function detectDeadlineDays(text: string): number | null {
  const t = normalizeNumberWords(text);
  for (const p of DEADLINE_PATTERNS) {
    const m = t.match(p.re);
    if (m) return p.days(m);
  }
  return null;
}

export interface TriageResult {
  rule: TriageRule;
  urgency: Urgency;
  serviceId: string;
  /** 0..1 rough confidence, shown as a subtle hint not a hard number */
  confidence: number;
  /** days until the patient's stated deadline, if they mentioned one */
  deadlineDays: number | null;
  /** secondary rules that also matched, offered as alternatives */
  alternates: TriageRule[];
}

export function triage(input: string): TriageResult | null {
  const text = ` ${input.toLowerCase().replace(/[^\p{L}\p{N}\s/]/gu, " ")} `;
  const scored: { rule: TriageRule; score: number }[] = [];

  for (const rule of TRIAGE_RULES) {
    if (rule.excludes?.some((x) => text.includes(x))) continue;
    let score = 0;
    for (const k of rule.keywords) if (text.includes(k)) score += 1;
    for (const k of rule.strong ?? []) if (text.includes(k)) score += 2;
    if (score > 0) scored.push({ rule, score });
  }
  if (scored.length === 0) return null;

  // Highest score wins; ties break toward the more urgent rule.
  scored.sort(
    (a, b) => b.score - a.score || URGENCY_META[a.rule.urgency].order - URGENCY_META[b.rule.urgency].order,
  );

  const top = scored[0];
  const deadlineDays = detectDeadlineDays(input);

  return {
    rule: top.rule,
    urgency: top.rule.urgency,
    serviceId: top.rule.serviceId,
    confidence: Math.min(1, 0.45 + top.score * 0.18),
    deadlineDays,
    alternates: scored
      .slice(1, 3)
      .map((s) => s.rule)
      .filter((r) => r.serviceId !== top.rule.serviceId),
  };
}

/** Copy for when nothing matched — never leave the patient stuck. */
export const FALLBACK_REPLY: Record<Lang, string> = {
  en: "I'm not sure I caught that. Tell me what's bothering you — pain, a chip, a cleaning that's overdue, or how your smile looks — or just pick a visit type and I'll take you straight to booking.",
  es: "No estoy seguro de haber entendido. Cuénteme qué le molesta — dolor, un diente astillado, una limpieza atrasada, o cómo se ve su sonrisa — o elija un tipo de visita y lo llevo directo a reservar.",
};

export const TRIAGE_GREETING: Record<Lang, string> = {
  en: "Hi! Tell me what's going on and I'll point you to the right visit — and how soon you should be seen.",
  es: "¡Hola! Cuénteme qué le pasa y le indico la visita correcta — y con qué urgencia debe venir.",
};

export const TRIAGE_EXAMPLES: Record<Lang, string[]> = {
  en: [
    "I have a chipped front tooth and a wedding in three weeks",
    "My gums bleed when I brush",
    "Woke up with the side of my face swollen",
    "It's been about four years since my last cleaning",
  ],
  es: [
    "Se me astilló un diente y tengo una boda en tres semanas",
    "Me sangran las encías al cepillarme",
    "Amanecí con el lado de la cara hinchado",
    "Hace unos cuatro años que no me hago una limpieza",
  ],
};

export const TRIAGE_DISCLAIMER: Record<Lang, string> = {
  en: "Guidance only — not a diagnosis. A dentist confirms everything at your visit.",
  es: "Solo orientación — no es un diagnóstico. Un dentista lo confirma todo en su visita.",
};
