"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCATIONS } from "@/lib/domain";
import { formatMoney } from "@/lib/utils";
import { useHydrated, useStore, useStoreSnapshot } from "@/hooks/use-store";
import { useAdmin, ROLE_LABELS, type LocationScope } from "@/hooks/use-admin";
import type { AdminRole } from "@/lib/types";
import { NotificationDrawer } from "./notification-drawer";

const TITLES: Record<string, string> = {
  "/admin/today": "Today",
  "/admin/schedule": "Schedule",
  "/admin/recovery": "Cancellation recovery",
  "/admin/patients": "Patient list",
  "/admin/recall": "Recall & reactivation",
  "/admin/analytics": "Analytics",
  "/admin/growth": "Growth — reputation & membership",
};

export function AdminTopbar() {
  const pathname = usePathname();
  const { role, setRole, scope, setScope, can } = useAdmin();
  const store = useStore();
  const snap = useStoreSnapshot();
  const hydrated = useHydrated();
  const [drawer, setDrawer] = useState(false);

  const recovered = hydrated ? (snap.revenueRecovered ?? store.revenueRecovered) : 0;
  const recent = hydrated
    ? snap.notifications.filter(
        (n) => Date.now() - new Date(n.createdAt).getTime() < 1000 * 60 * 60 * 24,
      ).length
    : 0;

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-background px-4 sm:px-6">
      <h1 className="text-lg font-semibold">{TITLES[pathname] ?? "Practice dashboard"}</h1>

      <div className="ml-auto flex items-center gap-2">
        {recovered > 0 && (
          <span className="hidden items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-xs font-semibold text-success sm:inline-flex">
            <TrendingUp className="size-3.5" />
            {formatMoney(recovered)} recovered this month
          </span>
        )}

        <Select value={scope} onValueChange={(v) => setScope(v as LocationScope)}>
          <SelectTrigger className="h-9 w-[150px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {can("combined-analytics") && <SelectItem value="all">Both locations</SelectItem>}
            {LOCATIONS.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.shortName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
          <SelectTrigger className="h-9 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          onClick={() => setDrawer(true)}
          className="relative flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
        >
          <Bell className="size-4" />
          {recent > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
              {recent > 99 ? "99+" : recent}
            </span>
          )}
        </button>
      </div>

      <NotificationDrawer open={drawer} onClose={() => setDrawer(false)} />
    </header>
  );
}
