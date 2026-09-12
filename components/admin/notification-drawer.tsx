"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { X, Mail, MessageSquare, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHydrated, useStoreSnapshot } from "@/hooks/use-store";
import type { NotificationRecord } from "@/lib/types";

const KIND_LABEL: Record<NotificationRecord["kind"], string> = {
  confirmation: "Confirmation",
  reminder: "Reminder",
  "waitlist-offer": "Waitlist offer",
  "waitlist-filled": "Waitlist filled",
  recall: "Recall",
  reactivation: "Reactivation",
  "review-request": "Review request",
  "intake-nudge": "Intake nudge",
  "coming-soon": "Coming soon",
  membership: "Membership",
  "smile-design": "Smile design",
};

export function NotificationDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const snap = useStoreSnapshot();
  const hydrated = useHydrated();
  const [filter, setFilter] = useState<"all" | "sms" | "email">("all");

  const items = useMemo(() => {
    if (!hydrated) return [];
    return [...snap.notifications]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((n) => filter === "all" || n.channel === filter)
      .slice(0, 120);
  }, [snap.notifications, filter, hydrated]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/30 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-background shadow-lift transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="flex items-center gap-2 font-semibold">
            <BellRing className="size-4 text-primary" /> Notification center
          </p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-border px-4 py-2">
          {(["all", "sms", "email"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
          <span className="ml-auto self-center text-xs text-muted-foreground">{items.length} shown</span>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {items.map((n) => (
            <div key={n.id} className={cn("flex flex-col", n.channel === "email" ? "items-start" : "items-end")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-soft",
                  n.channel === "sms"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm border border-border bg-card",
                )}
              >
                {n.subject && n.channel === "email" && <p className="mb-0.5 font-semibold">{n.subject}</p>}
                {n.body}
              </div>
              <p className="mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                {n.channel === "sms" ? <MessageSquare className="size-3" /> : <Mail className="size-3" />}
                {KIND_LABEL[n.kind]} · {n.to} · {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </p>
            </div>
          ))}
          {items.length === 0 && (
            <p className="pt-10 text-center text-sm text-muted-foreground">No messages yet.</p>
          )}
        </div>
      </aside>
    </>
  );
}
