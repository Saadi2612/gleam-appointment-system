"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Check,
  ShieldOff,
  Infinity as InfinityIcon,
  Clock,
  Percent,
  Loader2,
  PartyPopper,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCATIONS, MEMBERSHIP_PLANS } from "@/lib/domain";
import { cn, formatMoney } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { useStore, useStoreSnapshot } from "@/hooks/use-store";
import type { LiveLocationId, MembershipTier } from "@/lib/types";

export default function MembershipPage() {
  const { lang } = useI18n();
  const store = useStore();
  const snap = useStoreSnapshot();

  const [tier, setTier] = useState<MembershipTier>("individual");
  const [billing, setBilling] = useState<"annual" | "monthly">("annual");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [locationId, setLocationId] = useState<LiveLocationId>("atlantic-beach");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const plan = MEMBERSHIP_PLANS.find((p) => p.id === tier)!;
  const memberCount = snap.members.filter((m) => m.status === "active").length;

  async function join() {
    if (!firstName || !lastName || phone.replace(/\D/g, "").length < 10) return;
    setBusy(true);
    await store.addMember({ firstName, lastName, phone, email, tier, billing, locationId });
    setBusy(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="mx-auto flex size-16 items-center justify-center rounded-full bg-success text-success-foreground"
        >
          <PartyPopper className="size-8" />
        </motion.div>
        <h1 className="mt-4 text-2xl font-semibold">
          {lang === "es" ? "¡Bienvenido a Gleam Care!" : "Welcome to Gleam Care!"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {lang === "es"
            ? `Su membresía ${plan.name} está activa. Le enviamos los detalles por correo.`
            : `Your ${plan.name} membership is active. We've emailed you the details.`}
        </p>
        <Button asChild className="mt-6 rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
          <Link href="/book">
            {lang === "es" ? "Reservar mi primera limpieza" : "Book my first cleaning"}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/[0.07] px-3 py-1 text-xs font-medium text-accent">
          <ShieldOff className="size-3.5" />
          {lang === "es" ? "¿Sin seguro dental? No hay problema." : "No dental insurance? No problem."}
        </p>
        <h1 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold sm:text-4xl">
          {lang === "es" ? "Gleam Care — nuestro plan interno" : "Gleam Care — our in-house plan"}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          {lang === "es"
            ? "Cuidado preventivo cubierto todo el año, más 15% de descuento en cualquier tratamiento. Sin deducibles, sin máximo anual, sin períodos de espera."
            : "Preventive care covered all year, plus 15% off any treatment. No deductibles, no annual maximum, no waiting periods."}
        </p>
        {memberCount > 0 && (
          <p className="mt-2 text-xs font-medium text-primary">
            {lang === "es"
              ? `${memberCount} vecinos ya son miembros`
              : `${memberCount} neighbors are already members`}
          </p>
        )}
      </div>

      {/* billing toggle */}
      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-full border border-border bg-card p-0.5 text-sm">
          {(["annual", "monthly"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={cn(
                "rounded-full px-4 py-1.5 font-medium transition-colors",
                billing === b ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {b === "annual"
                ? lang === "es" ? "Anual" : "Annual"
                : lang === "es" ? "Mensual" : "Monthly"}
              {b === "annual" && (
                <span className="ml-1.5 text-[10px] opacity-80">
                  {lang === "es" ? "ahorre 2 meses" : "save 2 months"}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* plans */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {MEMBERSHIP_PLANS.map((p) => {
          const selected = tier === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setTier(p.id)}
              className={cn(
                "flex flex-col rounded-2xl border bg-card p-5 text-left transition-all hover:shadow-lift",
                selected ? "border-primary ring-2 ring-primary/25" : "border-border hover:border-primary/40",
              )}
            >
              <p className="text-sm font-semibold">{p.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{p.bestFor}</p>
              <p className="mt-4 text-3xl font-semibold tabular-nums">
                {billing === "annual" ? formatMoney(p.price) : formatMoney(p.monthly)}
                <span className="text-sm font-normal text-muted-foreground">
                  {billing === "annual" ? (lang === "es" ? "/año" : "/yr") : (lang === "es" ? "/mes" : "/mo")}
                </span>
              </p>
              <ul className="mt-4 flex-1 space-y-1.5">
                {p.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" strokeWidth={3} />
                    <span className="text-muted-foreground">{b}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent/12 px-2.5 py-1 text-xs font-semibold text-accent">
                <Percent className="size-3" />
                {p.treatmentDiscountPct}% {lang === "es" ? "de descuento en tratamientos" : "off all other treatment"}
              </p>
            </button>
          );
        })}
      </div>

      {/* why it beats insurance */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Perk icon={<ShieldOff className="size-4" />} title={lang === "es" ? "Sin deducibles" : "No deductibles"} body={lang === "es" ? "Sus beneficios empiezan el día uno." : "Your benefits start on day one."} />
        <Perk icon={<InfinityIcon className="size-4" />} title={lang === "es" ? "Sin máximo anual" : "No annual maximum"} body={lang === "es" ? "El descuento no se agota a mitad de año." : "The discount doesn't run out mid-year."} />
        <Perk icon={<Clock className="size-4" />} title={lang === "es" ? "Sin espera" : "No waiting periods"} body={lang === "es" ? "Use el plan en su próxima visita." : "Use it at your very next visit."} />
      </div>

      {/* signup */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <p className="font-semibold">
          {lang === "es" ? `Únase a ${plan.name}` : `Join ${plan.name}`}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {billing === "annual"
              ? `${formatMoney(plan.price)}${lang === "es" ? "/año" : "/yr"}`
              : `${formatMoney(plan.monthly)}${lang === "es" ? "/mes" : "/mo"}`}
          </span>
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label={lang === "es" ? "Nombre" : "First name"}>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label={lang === "es" ? "Apellido" : "Last name"}>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
          <Field label={lang === "es" ? "Teléfono móvil" : "Mobile phone"}>
            <Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label={lang === "es" ? "Oficina preferida" : "Home office"}>
            <Select value={locationId} onValueChange={(v) => setLocationId(v as LiveLocationId)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Button
          onClick={join}
          disabled={busy}
          size="lg"
          className="mt-5 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {lang === "es" ? "Activar mi membresía" : "Activate my membership"}
        </Button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {lang === "es"
            ? "Demo — no se cobra ningún pago ni se recopilan datos de tarjeta."
            : "Demo — no payment is taken and no card details are collected."}
        </p>
      </div>
    </div>
  );
}

function Perk({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <p className="mt-2 text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
