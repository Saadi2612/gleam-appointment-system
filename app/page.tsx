"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  CalendarCheck2,
  ShieldCheck,
  Clock3,
  HeartPulse,
  Ambulance,
  Users,
  BellRing,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LOCATIONS, COMING_SOON, BRAND } from "@/lib/domain";
import { hoursSummary, relativeWhen } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { useStore, useStoreSnapshot } from "@/hooks/use-store";

export default function Home() {
  const { t } = useI18n();
  const store = useStore();
  useStoreSnapshot();

  return (
    <div className="flex flex-col">
      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent)]" />
        <div className="mx-auto max-w-5xl px-4 pb-10 pt-14 text-center sm:pt-20">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            <HeartPulse className="size-3.5 text-primary" />
            {t("home.eyebrow")}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mx-auto max-w-2xl text-4xl font-semibold leading-[1.1] sm:text-5xl"
          >
            {t("home.title")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground"
          >
            {t("home.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button
              asChild
              size="lg"
              className="w-full rounded-full bg-accent px-8 text-accent-foreground hover:bg-accent/90 sm:w-auto"
            >
              <Link href="/book">
                {t("home.cta")} <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full rounded-full px-6 sm:w-auto"
            >
              <Link href="/book?service=emergency">
                <Ambulance className="size-4 text-accent" />
                {t("home.ctaEmergency")}
              </Link>
            </Button>
          </motion.div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-primary" /> {t("home.trust1")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-4 text-primary" /> {t("home.trust2")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <HeartPulse className="size-4 text-primary" /> {t("home.trust3")}
            </span>
          </div>
        </div>
      </section>

      {/* locations */}
      <section className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {LOCATIONS.map((l) => {
            const next = store.nextAvailableAnyService(l.id);
            return (
              <div key={l.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <p className="font-semibold">{l.shortName}</p>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" />
                  {l.address}, {l.city}, {l.state} {l.zip}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{hoursSummary(l.hours).join(" · ")}</p>
                <div className="mt-3 flex items-center justify-between">
                  {next && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-xs font-semibold text-success">
                      <CalendarCheck2 className="size-3.5" />
                      {t("step.location.next")}: {relativeWhen(next.start)}
                    </span>
                  )}
                  <Button asChild size="sm" variant="ghost" className="rounded-full">
                    <Link href={`/book?location=${l.id}`}>
                      {t("nav.book")} <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* feature teasers */}
      <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-8 sm:grid-cols-2">
        <Link
          href="/book"
          className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
        >
          <Users className="size-6 text-primary" />
          <p className="mt-3 font-semibold">{t("home.familyTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("home.familyBody")}</p>
        </Link>
        <Link
          href="/manage"
          className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
        >
          <BellRing className="size-6 text-primary" />
          <p className="mt-3 font-semibold">{t("home.waitlistTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("home.waitlistBody")}</p>
        </Link>
      </section>

      {/* coming soon strip */}
      <section className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="rounded-2xl border border-accent/30 bg-accent/[0.05] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{t("comingSoon.title")}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {COMING_SOON.map((c) => `${c.name} (${c.opening})`).join(" · ")}
              </p>
            </div>
            <Button asChild className="rounded-full">
              <Link href="/coming-soon">
                {t("comingSoon.join")} <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-5xl px-4 py-10 text-center text-xs text-muted-foreground">
        {BRAND.tagline} · Demo build with synthetic data.
      </footer>
    </div>
  );
}
