"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { EligibilityResult, LiveLocationId, ProviderId, Slot } from "@/lib/types";

export type StepId =
  | "service"
  | "location"
  | "provider"
  | "datetime"
  | "patient"
  | "insurance"
  | "confirm";

export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  serviceId: string;
}

export interface BookingState {
  serviceId?: string;
  emergency: boolean;
  /** "either" means the patient asked for the soonest at any location */
  locationChoice?: LiveLocationId | "either";
  /** the concrete location once resolved */
  locationId?: LiveLocationId;
  providerId: ProviderId | "any";
  slot?: Slot;
  patient: {
    isNew: boolean;
    patientId?: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    dob: string;
  };
  family: FamilyMember[];
  familySlots?: { start: string; slots: Slot[] };
  familyMode: "concurrent" | "back-to-back";
  insurance: {
    carrier?: string;
    memberId?: string;
    skipped: boolean;
    eligibility?: EligibilityResult;
  };
}

const EMPTY: BookingState = {
  emergency: false,
  providerId: "any",
  patient: { isNew: true, firstName: "", lastName: "", phone: "", email: "", dob: "" },
  family: [],
  familyMode: "concurrent",
  insurance: { skipped: false },
};

const LS_KEY = "gleam.booking.v1";

export const STEP_ORDER: StepId[] = [
  "service",
  "location",
  "provider",
  "datetime",
  "patient",
  "insurance",
  "confirm",
];

interface BookingCtx {
  state: BookingState;
  patch: (p: Partial<BookingState>) => void;
  patchPatient: (p: Partial<BookingState["patient"]>) => void;
  patchInsurance: (p: Partial<BookingState["insurance"]>) => void;
  reset: () => void;
  step: StepId;
  steps: StepId[];
  stepIndex: number;
  goNext: () => void;
  goBack: () => void;
  goto: (s: StepId) => void;
  canAdvance: boolean;
}

const Ctx = createContext<BookingCtx | null>(null);

export function BookingProvider({
  children,
  initialService,
  initialEmergency,
  initialLocation,
  initialSlot,
  fresh,
}: {
  children: React.ReactNode;
  initialService?: string;
  initialEmergency?: boolean;
  initialLocation?: LiveLocationId;
  /** a slot picked outside the wizard (embed widget) */
  initialSlot?: Slot;
  /** ignore any saved draft — used when arriving from triage or the embed */
  fresh?: boolean;
}) {
  const [state, setState] = useState<BookingState>(EMPTY);
  const [step, setStep] = useState<StepId>("service");
  const hydrated = useRef(false);

  // hydrate once
  useEffect(() => {
    let base = EMPTY;
    if (!fresh) {
      try {
        const raw = window.localStorage.getItem(LS_KEY);
        if (raw) base = { ...EMPTY, ...(JSON.parse(raw) as BookingState) };
      } catch {
        /* ignore */
      }
    }
    if (initialService) {
      base = {
        ...base,
        serviceId: initialService,
        emergency: initialEmergency ?? initialService === "emergency",
        // a new intent invalidates a slot chosen for the old one
        slot: fresh ? undefined : base.slot,
      };
    }
    if (initialLocation) base = { ...base, locationChoice: initialLocation, locationId: initialLocation };
    if (initialSlot) {
      base = {
        ...base,
        slot: initialSlot,
        locationId: initialSlot.locationId,
        locationChoice: initialSlot.locationId,
        providerId: "any",
      };
    }
    setState(base);
    // resume at the first incomplete step
    setStep(firstIncomplete(base, initialEmergency ? "location" : undefined));
    hydrated.current = true;
  }, [initialService, initialEmergency, initialLocation, initialSlot, fresh]);

  // persist
  useEffect(() => {
    if (!hydrated.current) return;
    window.localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state]);

  const patch = useCallback((p: Partial<BookingState>) => setState((s) => ({ ...s, ...p })), []);
  const patchPatient = useCallback(
    (p: Partial<BookingState["patient"]>) =>
      setState((s) => ({ ...s, patient: { ...s.patient, ...p } })),
    [],
  );
  const patchInsurance = useCallback(
    (p: Partial<BookingState["insurance"]>) =>
      setState((s) => ({ ...s, insurance: { ...s.insurance, ...p } })),
    [],
  );
  const reset = useCallback(() => {
    setState(EMPTY);
    setStep("service");
    window.localStorage.removeItem(LS_KEY);
  }, []);

  const steps = useMemo(() => {
    // emergency skips the provider choice (always first-available)
    return state.emergency ? STEP_ORDER.filter((s) => s !== "provider") : STEP_ORDER;
  }, [state.emergency]);

  const stepIndex = Math.max(0, steps.indexOf(step));

  const canAdvance = useMemo(() => stepComplete(step, state), [step, state]);

  const goNext = useCallback(() => {
    setStep((cur) => {
      const i = steps.indexOf(cur);
      return steps[Math.min(i + 1, steps.length - 1)];
    });
  }, [steps]);
  const goBack = useCallback(() => {
    setStep((cur) => {
      const i = steps.indexOf(cur);
      return steps[Math.max(i - 1, 0)];
    });
  }, [steps]);
  const goto = useCallback((s: StepId) => setStep(s), []);

  const value: BookingCtx = {
    state,
    patch,
    patchPatient,
    patchInsurance,
    reset,
    step,
    steps,
    stepIndex,
    goNext,
    goBack,
    goto,
    canAdvance,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBooking(): BookingCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useBooking outside BookingProvider");
  return c;
}

// -- completeness rules -------------------------------------------------
export function stepComplete(step: StepId, s: BookingState): boolean {
  switch (step) {
    case "service":
      return !!s.serviceId;
    case "location":
      return !!s.locationId || s.locationChoice === "either";
    case "provider":
      return !!s.providerId;
    case "datetime":
      return !!s.slot || !!s.familySlots;
    case "patient":
      return (
        s.patient.firstName.trim().length > 0 &&
        s.patient.lastName.trim().length > 0 &&
        s.patient.phone.replace(/\D/g, "").length >= 10
      );
    case "insurance":
      return s.insurance.skipped || !!s.insurance.eligibility || !!s.insurance.carrier;
    case "confirm":
      return true;
  }
}

function firstIncomplete(s: BookingState, floor?: StepId): StepId {
  const order = s.emergency ? STEP_ORDER.filter((x) => x !== "provider") : STEP_ORDER;
  const start = floor ? Math.max(0, order.indexOf(floor)) : 0;
  for (let i = start; i < order.length; i++) {
    if (!stepComplete(order[i], s)) return order[i];
  }
  return "confirm";
}
