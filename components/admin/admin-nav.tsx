"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  Users,
  PhoneOutgoing,
  RefreshCw,
  BarChart3,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdmin, type AdminFeature } from "@/hooks/use-admin";
import { GleamLogo } from "@/components/gleam-logo";

const ITEMS: { href: string; label: string; icon: LucideIcon; feature: AdminFeature }[] = [
  { href: "/admin/today", label: "Today", icon: CalendarDays, feature: "today" },
  { href: "/admin/schedule", label: "Schedule", icon: CalendarRange, feature: "schedule" },
  { href: "/admin/recovery", label: "Recovery", icon: PhoneOutgoing, feature: "recovery" },
  { href: "/admin/patients", label: "Patients", icon: Users, feature: "patients" },
  { href: "/admin/recall", label: "Recall", icon: RefreshCw, feature: "recall" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, feature: "analytics" },
  { href: "/admin/growth", label: "Growth", icon: Sparkles, feature: "growth" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { can } = useAdmin();
  const items = ITEMS.filter((i) => can(i.feature));

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link href="/admin/today">
          <GleamLogo />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((i) => {
          const active = pathname === i.href;
          return (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <i.icon className="size-4" />
              {i.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← Patient site
        </Link>
      </div>
    </aside>
  );
}

export function AdminMobileTabs() {
  const pathname = usePathname();
  const { can } = useAdmin();
  const items = ITEMS.filter((i) => can(i.feature));
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-background px-3 py-2 lg:hidden">
      {items.map((i) => {
        const active = pathname === i.href;
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
            )}
          >
            <i.icon className="size-3.5" />
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
