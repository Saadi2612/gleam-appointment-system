"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AdminRole, LiveLocationId } from "@/lib/types";

export type LocationScope = LiveLocationId | "all";

interface AdminCtx {
  role: AdminRole;
  setRole: (r: AdminRole) => void;
  scope: LocationScope;
  setScope: (s: LocationScope) => void;
  can: (feature: AdminFeature) => boolean;
}

export type AdminFeature =
  | "today"
  | "schedule"
  | "patients"
  | "recovery"
  | "recall"
  | "analytics"
  | "growth"
  | "provider-split"
  | "combined-analytics";

const ROLE_FEATURES: Record<AdminRole, AdminFeature[]> = {
  "front-desk": ["today", "schedule", "patients"],
  "office-manager": [
    "today",
    "schedule",
    "patients",
    "recovery",
    "recall",
    "analytics",
    "growth",
    "provider-split",
  ],
  "regional-director": [
    "today",
    "schedule",
    "patients",
    "recovery",
    "recall",
    "analytics",
    "growth",
    "provider-split",
    "combined-analytics",
  ],
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  "front-desk": "Front Desk",
  "office-manager": "Office Manager",
  "regional-director": "Regional Director",
};

const Ctx = createContext<AdminCtx | null>(null);
const LS_ROLE = "gleam.admin.role";
const LS_SCOPE = "gleam.admin.scope";

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<AdminRole>("office-manager");
  const [scope, setScopeState] = useState<LocationScope>("atlantic-beach");

  useEffect(() => {
    const r = window.localStorage.getItem(LS_ROLE) as AdminRole | null;
    const s = window.localStorage.getItem(LS_SCOPE) as LocationScope | null;
    if (r) setRoleState(r);
    if (s) setScopeState(s);
  }, []);

  const setRole = useCallback((r: AdminRole) => {
    setRoleState(r);
    window.localStorage.setItem(LS_ROLE, r);
    // only the Regional Director sees the combined "all locations" scope
    if (!ROLE_FEATURES[r].includes("combined-analytics")) {
      setScopeState((s) => {
        if (s !== "all") return s;
        window.localStorage.setItem(LS_SCOPE, "atlantic-beach");
        return "atlantic-beach";
      });
    }
  }, []);
  const setScope = useCallback((s: LocationScope) => {
    setScopeState(s);
    window.localStorage.setItem(LS_SCOPE, s);
  }, []);

  const value = useMemo<AdminCtx>(
    () => ({
      role,
      setRole,
      scope,
      setScope,
      can: (f) => ROLE_FEATURES[role].includes(f),
    }),
    [role, scope, setRole, setScope],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdmin(): AdminCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin outside AdminProvider");
  return c;
}
