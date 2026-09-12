"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Lock,
  ChevronDown,
  Phone,
  MapPin,
  Star,
  Code2,
  Copy,
  Check,
  ArrowLeft,
  Monitor,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LOCATIONS, BRAND } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { GleamLogo } from "@/components/gleam-logo";
import { EmbeddedBooking } from "@/components/embed/embedded-booking";

const SNIPPET = `<!-- Gleam booking widget — paste once, anywhere on the page -->
<div id="gleam-booking"></div>
<script src="https://book.gleamdental.com/embed.js"
        data-practice="gleam-dental"
        data-location="auto" defer></script>`;

export default function EmbedPage() {
  const [copied, setCopied] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className="min-h-screen bg-secondary/40">
      {/* presenter chrome — not part of the mock site */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to demo
          </Link>
          <p className="text-sm font-semibold">Website embed</p>
          <p className="hidden text-xs text-muted-foreground sm:block">
            The widget running inside a mock of an existing WordPress site — no redirect, no new domain.
          </p>
          <div className="ml-auto inline-flex rounded-full border border-border bg-card p-0.5 text-xs">
            {(["desktop", "mobile"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium capitalize transition-colors",
                  device === d ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {d === "desktop" ? <Monitor className="size-3.5" /> : <Smartphone className="size-3.5" />}
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* browser frame */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <motion.div
          layout
          className={cn(
            "mx-auto overflow-hidden rounded-2xl border border-border bg-white shadow-lift transition-all",
            device === "mobile" ? "max-w-[400px]" : "max-w-full",
          )}
        >
          {/* fake browser bar */}
          <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-100 px-3 py-2">
            <span className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
            </span>
            <span className="mx-auto inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-[11px] text-neutral-500">
              <Lock className="size-3 text-green-600" />
              gleamdental.com
            </span>
          </div>

          {/* ---- MOCK WORDPRESS SITE ---- */}
          <div className="bg-white text-neutral-800">
            {/* their nav */}
            <div className="flex items-center gap-4 border-b border-neutral-200 px-5 py-3">
              <GleamLogo />
              {device === "desktop" && (
                <nav className="ml-4 hidden items-center gap-4 text-[13px] text-neutral-600 md:flex">
                  {["Home", "About", "Services", "Smile Gallery", "New Patients", "Contact"].map((n) => (
                    <span key={n} className="inline-flex items-center gap-0.5 hover:text-neutral-900">
                      {n}
                      {n === "Services" && <ChevronDown className="size-3" />}
                    </span>
                  ))}
                </nav>
              )}
              <span className="ml-auto hidden items-center gap-1.5 text-[13px] font-semibold text-neutral-700 sm:flex">
                <Phone className="size-3.5" />
                {LOCATIONS[0].phone}
              </span>
            </div>

            {/* their hero — with OUR widget dropped in */}
            <div
              className={cn(
                "grid gap-6 px-5 py-8",
                device === "desktop" ? "md:grid-cols-[1.05fr_400px] md:px-10 md:py-12" : "",
              )}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[oklch(0.44_0.058_205)]">
                  Jacksonville · Atlantic Beach & Bartram Park
                </p>
                <h1 className="mt-3 text-3xl font-semibold leading-tight text-neutral-900 md:text-[40px]">
                  {BRAND.tagline}
                </h1>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-neutral-600">
                  General, cosmetic, implants and Invisalign — everything under one roof, no referrals
                  needed. Sedation options and Netflix in every operatory.
                </p>
                <div className="mt-4 flex items-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-4 fill-[#f5b301] text-[#f5b301]" />
                  ))}
                  <span className="ml-1 text-[13px] text-neutral-500">4.9 · 612 Google reviews</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 text-[13px] text-neutral-600">
                  {["Most PPO insurance accepted", "Emergency same-day care", "Financing available"].map(
                    (b) => (
                      <span key={b} className="rounded-full bg-neutral-100 px-3 py-1">
                        {b}
                      </span>
                    ),
                  )}
                </div>
              </div>

              {/* the embed itself */}
              <div className="relative">
                <span className="absolute -top-2 left-3 z-10 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground shadow">
                  Gleam widget
                </span>
                <div className="rounded-2xl border-2 border-dashed border-accent/50 p-1.5">
                  <EmbeddedBooking />
                </div>
              </div>
            </div>

            {/* the rest of their page, for context */}
            <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-8 md:px-10">
              <h2 className="text-center text-xl font-semibold text-neutral-900">Our Services</h2>
              <div className="mx-auto mt-5 grid max-w-4xl gap-3 sm:grid-cols-2 md:grid-cols-4">
                {["General Dentistry", "Cosmetic & Veneers", "Dental Implants", "Invisalign"].map((s) => (
                  <div key={s} className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
                    <p className="text-sm font-semibold text-neutral-800">{s}</p>
                    <p className="mt-1 text-xs text-neutral-500">Learn more →</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 border-t border-neutral-200 px-5 py-8 sm:grid-cols-2 md:px-10">
              {LOCATIONS.map((l) => (
                <div key={l.id} className="text-[13px] text-neutral-600">
                  <p className="font-semibold text-neutral-900">{l.name}</p>
                  <p className="mt-1 flex items-start gap-1.5">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    {l.address}, {l.city}, {l.state} {l.zip}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5">
                    <Phone className="size-3.5" />
                    {l.phone}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-200 bg-neutral-900 px-5 py-5 text-center text-[11px] text-neutral-400">
              © {new Date().getFullYear()} Gleam Dental Care · Privacy Policy · Accessibility
            </div>
          </div>
        </motion.div>

        {/* the pitch line + snippet */}
        <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Code2 className="size-4 text-primary" /> Drops into the existing WordPress site
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            One div and one script tag. No theme changes, no plugin conflicts, no rebuild — and the patient
            never leaves gleamdental.com. Today that same click sends them to{" "}
            <span className="font-mono text-xs">flexbook.me</span>.
          </p>
          <div className="relative mt-3">
            <pre className="overflow-x-auto rounded-xl bg-foreground/[0.04] p-3 text-[11px] leading-relaxed text-foreground">
              <code>{SNIPPET}</code>
            </pre>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(SNIPPET);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
              className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium hover:bg-secondary"
            >
              {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm" className="rounded-full">
              <Link href="/book">Open the full booking flow</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href="/roi">See the ROI math</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
