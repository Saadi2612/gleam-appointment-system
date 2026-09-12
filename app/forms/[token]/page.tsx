"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { Check, HeartPulse, Pill, ShieldCheck, PenLine, TriangleAlert, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { COMMON_ALLERGIES, MEDICAL_CONDITIONS } from "@/lib/intake-options";
import { getService } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { useStore, useStoreQuery } from "@/hooks/use-store";
import { SignaturePad } from "@/components/intake/signature-pad";
import { ProgressRing } from "@/components/intake/progress-ring";

export default function IntakeFormPage() {
  const { t } = useI18n();
  const { token } = useParams<{ token: string }>();
  const store = useStore();

  const { data: appt, loading } = useStoreQuery((s) => s.getAppointmentByToken(token), [token]);
  const { data: saved } = useStoreQuery((s) => s.getIntake(token), [token]);

  // local form state
  const [conditions, setConditions] = useState<string[]>([]);
  const [noConditions, setNoConditions] = useState(false);
  const [medicalNotes, setMedicalNotes] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [noAllergies, setNoAllergies] = useState(false);
  const [medications, setMedications] = useState("");
  const [pharmacy, setPharmacy] = useState("");
  const [hipaa, setHipaa] = useState(false);
  const [consent, setConsent] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [signedName, setSignedName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!saved) return;
    setConditions(saved.medicalConditions);
    setMedicalNotes(saved.medicalNotes);
    setAllergies(saved.allergies);
    setMedications(saved.medications);
    setPharmacy(saved.pharmacy);
    setHipaa(saved.hipaaAcknowledged);
    setConsent(saved.consentToTreat);
    setSignature(saved.signatureDataUrl);
    setSignedName(saved.signedName);
    if (saved.completedSections.length === 5) setSubmitted(true);
  }, [saved]);

  const done = useMemo(
    () => ({
      medical: noConditions || conditions.length > 0,
      allergies: noAllergies || allergies.length > 0,
      medications: medications.trim().length > 0,
      hipaa: hipaa && consent,
      signature: !!signature && signedName.trim().length > 1,
    }),
    [noConditions, conditions, noAllergies, allergies, medications, hipaa, consent, signature, signedName],
  );
  const completeCount = Object.values(done).filter(Boolean).length;
  const allDone = completeCount === 5;

  // autosave
  useEffect(() => {
    if (loading) return;
    const id = setTimeout(() => {
      store.saveIntake(token, {
        medicalConditions: noConditions ? [] : conditions,
        medicalNotes,
        allergies: noAllergies ? [] : allergies,
        medications,
        pharmacy,
        hipaaAcknowledged: hipaa,
        consentToTreat: consent,
        signatureDataUrl: signature,
        signedName,
        completedSections: Object.entries(done)
          .filter(([, v]) => v)
          .map(([k]) => k),
      });
    }, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conditions, noConditions, medicalNotes, allergies, noAllergies, medications, pharmacy, hipaa, consent, signature, signedName]);

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!appt) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-muted-foreground">
        {t("manage.notFound")}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="mx-auto flex size-16 items-center justify-center rounded-full bg-success text-success-foreground"
        >
          <PartyPopper className="size-8" />
        </motion.div>
        <h1 className="mt-4 text-2xl font-semibold">{t("intake.done")}</h1>
        <p className="mt-2 text-muted-foreground">
          Your paperwork is on file for your {getService(appt.serviceId)?.name.toLowerCase()}.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link href={`/appt/${token}`}>{t("confirmed.manage")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="sticky top-16 z-10 mb-6 flex items-center gap-4 rounded-2xl border border-border bg-background/90 p-4 backdrop-blur">
        <ProgressRing value={completeCount / 5} label={`${completeCount}/5`} />
        <div>
          <h1 className="text-lg font-semibold">{t("intake.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("intake.progress", { done: completeCount, total: 5 })}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Section icon={<HeartPulse className="size-4" />} title={t("intake.medical")} done={done.medical}>
          <ChipGroup options={MEDICAL_CONDITIONS} value={conditions} onChange={setConditions} disabled={noConditions} />
          <label className="mt-3 flex items-center gap-2 text-sm">
            <Checkbox checked={noConditions} onCheckedChange={(v) => setNoConditions(!!v)} />
            {t("intake.none")} — no significant medical history
          </label>
          <Textarea
            className="mt-3"
            placeholder="Anything else we should know? (optional)"
            value={medicalNotes}
            onChange={(e) => setMedicalNotes(e.target.value)}
          />
        </Section>

        <Section icon={<TriangleAlert className="size-4" />} title={t("intake.allergies")} done={done.allergies}>
          <ChipGroup options={COMMON_ALLERGIES} value={allergies} onChange={setAllergies} disabled={noAllergies} />
          <label className="mt-3 flex items-center gap-2 text-sm">
            <Checkbox checked={noAllergies} onCheckedChange={(v) => setNoAllergies(!!v)} />
            {t("intake.none")} — no known allergies
          </label>
        </Section>

        <Section icon={<Pill className="size-4" />} title={t("intake.medications")} done={done.medications}>
          <Textarea
            placeholder="List current medications & dosages, or type “None”."
            value={medications}
            onChange={(e) => setMedications(e.target.value)}
          />
          <div className="mt-3 space-y-1.5">
            <Label className="text-xs">Preferred pharmacy (optional)</Label>
            <Input value={pharmacy} onChange={(e) => setPharmacy(e.target.value)} />
          </div>
        </Section>

        <Section icon={<ShieldCheck className="size-4" />} title={t("intake.hipaa")} done={done.hipaa}>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={hipaa} onCheckedChange={(v) => setHipaa(!!v)} className="mt-0.5" />
            <span>
              I acknowledge receipt of Gleam Dental Care's Notice of Privacy Practices (HIPAA) and understand how
              my health information may be used and disclosed.
            </span>
          </label>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />
            <span>I consent to the dental examination and treatment planned for this visit.</span>
          </label>
        </Section>

        <Section icon={<PenLine className="size-4" />} title={t("intake.signature")} done={done.signature}>
          <SignaturePad value={signature} onChange={setSignature} />
          <div className="mt-3 space-y-1.5">
            <Label className="text-xs">Type your full name</Label>
            <Input value={signedName} onChange={(e) => setSignedName(e.target.value)} placeholder="Full legal name" />
          </div>
        </Section>
      </div>

      <Button
        disabled={!allDone}
        onClick={() => {
          store.saveIntake(token, {
            completedSections: ["medical", "allergies", "medications", "hipaa", "signature"],
          });
          setSubmitted(true);
        }}
        className="mt-6 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
        size="lg"
      >
        {t("intake.submit")}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">Progress saves automatically as you go.</p>
    </div>
  );
}

function Section({
  icon,
  title,
  done,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-lg transition-colors",
            done ? "bg-success text-success-foreground" : "bg-primary/10 text-primary",
          )}
        >
          {done ? <Check className="size-4" strokeWidth={3} /> : icon}
        </span>
        <p className="font-semibold">{title}</p>
      </div>
      {children}
    </div>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
  disabled,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", disabled && "pointer-events-none opacity-40")}>
      {options.map((o) => {
        const active = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(active ? value.filter((x) => x !== o) : [...value, o])}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
