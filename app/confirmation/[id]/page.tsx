"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { format } from "date-fns";
import {
  CalendarPlus,
  MapPin,
  Check,
  FileText,
  Clock,
  IdCard,
  DoorOpen,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocation, getProvider, getService } from "@/lib/domain";
import { downloadICS } from "@/lib/ics";
import { mapsUrl, relativeWhen, timeRange } from "@/lib/utils";
import { MonogramAvatar } from "@/components/monogram-avatar";
import { useI18n } from "@/components/i18n-provider";
import { useStore, useStoreQuery } from "@/hooks/use-store";
import type { Appointment } from "@/lib/types";

function ConfirmationInner() {
  const { t, service: sv } = useI18n();
  const params = useParams<{ id: string }>();
  const sp = useSearchParams();
  const store = useStore();

  const ids = sp.get("ids")?.split(",") ?? [params.id];
  const { data: appts, loading } = useStoreQuery(
    async (s) => {
      const list = await Promise.all(ids.map((id) => s.getAppointment(id)));
      return list.filter(Boolean) as Appointment[];
    },
    [sp.get("ids"), params.id],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Skeleton className="mx-auto h-16 w-16 rounded-full" />
        <Skeleton className="mx-auto mt-4 h-8 w-48" />
        <Skeleton className="mt-8 h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const primary = appts?.[0];
  if (!primary) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-muted-foreground">{t("manage.notFound")}</p>
        <Button asChild className="mt-4 rounded-full">
          <Link href="/book">{t("home.cta")}</Link>
        </Button>
      </div>
    );
  }

  const loc = getLocation(primary.locationId)!;
  const service = getService(primary.serviceId)!;
  const provider = getProvider(primary.providerId)!;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="mx-auto flex size-16 items-center justify-center rounded-full bg-success text-success-foreground shadow-lift"
      >
        <Check className="size-8" strokeWidth={3} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-5 text-center"
      >
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("confirmed.title")}</h1>
        <p className="mt-1.5 text-muted-foreground">
          {t("confirmed.subtitle", { phone: "your phone" })}
        </p>
      </motion.div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="bg-primary/[0.04] p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {relativeWhen(primary.start, { withTime: false })}
          </p>
          <p className="mt-1 text-xl font-semibold">
            {format(new Date(primary.start), "EEEE, MMMM d")}
          </p>
          <p className="text-primary">{timeRange(primary.start, primary.end)}</p>
        </div>

        <div className="space-y-3 p-5 text-sm">
          <div className="flex items-center gap-3">
            <MonogramAvatar initials={provider.initials} size="sm" />
            <div>
              <p className="font-medium">{sv(service.id).name}</p>
              <p className="text-xs text-muted-foreground">
                Dr. {provider.firstName} {provider.lastName}, {provider.credential}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium">{loc.name}</p>
              <p className="text-xs text-muted-foreground">
                {loc.address}, {loc.city}, {loc.state} {loc.zip} · {loc.phone}
              </p>
            </div>
          </div>

          {appts && appts.length > 1 && (
            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Family booking</p>
              {appts.map((a) => (
                <div key={a.id} className="flex justify-between text-xs">
                  <span>{getService(a.serviceId)?.shortName}</span>
                  <span className="font-medium tabular-nums">
                    {format(new Date(a.start), "h:mm a")} · Chair {a.chair}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border p-4">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => downloadICS(primary, `gleam-${primary.token}.ics`)}
          >
            <CalendarPlus className="size-4" />
            {t("confirmed.addCalendar")}
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <a href={mapsUrl(loc.address, loc.city, loc.state, loc.zip)} target="_blank" rel="noreferrer">
              <MapPin className="size-4" />
              {t("confirmed.directions")}
            </a>
          </Button>
        </div>
      </div>

      <Link
        href={`/forms/${primary.token}`}
        className="mt-4 flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/[0.07] p-4 transition-colors hover:bg-accent/[0.12]"
      >
        <FileText className="size-5 shrink-0 text-accent" />
        <span className="flex-1 text-sm font-medium">{t("confirmed.forms")}</span>
        <ArrowRight className="size-4 text-accent" />
      </Link>

      {/* cosmetic and Invisalign consults get the virtual smile design intake */}
      {(service.id === "cosmetic-consult" || service.id === "invisalign-consult") && (
        <Link
          href={`/smile/${primary.token}`}
          className="mt-3 flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/[0.05] p-4 transition-colors hover:bg-primary/[0.09]"
        >
          <Sparkles className="size-5 shrink-0 text-primary" />
          <span className="flex-1 text-sm font-medium">{t("confirmed.smile")}</span>
          <ArrowRight className="size-4 text-primary" />
        </Link>
      )}

      <div className="mt-4 rounded-2xl border border-border bg-card p-5">
        <p className="mb-3 text-sm font-semibold">{t("confirmed.expect")}</p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <DoorOpen className="size-4 text-primary" /> {t("confirmed.expectArrive")}
          </li>
          <li className="flex items-center gap-2">
            <IdCard className="size-4 text-primary" /> {t("confirmed.expectBring")}
          </li>
          <li className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            {t("confirmed.expectDuration", { min: service.durationMin })}
          </li>
        </ul>
      </div>

      <div className="mt-6 text-center">
        <Link
          href={`/appt/${primary.token}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("confirmed.manage")}
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmationInner />
    </Suspense>
  );
}
