"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Search, UserCheck, UserPlus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { useBooking } from "@/hooks/use-booking";
import { useStore } from "@/hooks/use-store";
import { WizardShell } from "../wizard-shell";

export function StepPatient() {
  const { t } = useI18n();
  const store = useStore();
  const { state, patchPatient } = useBooking();
  const p = state.patient;
  const [lookupPhone, setLookupPhone] = useState(p.phone);
  const [looking, setLooking] = useState(false);
  const [lookupMsg, setLookupMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function doLookup() {
    setLooking(true);
    setLookupMsg(null);
    const found = await store.findPatientByPhone(lookupPhone);
    setLooking(false);
    if (found) {
      patchPatient({
        isNew: false,
        patientId: found.id,
        firstName: found.firstName,
        lastName: found.lastName,
        phone: found.phone,
        email: found.email,
        dob: found.dob,
      });
      setLookupMsg({ ok: true, text: t("step.patient.found", { name: found.firstName }) });
    } else {
      patchPatient({ isNew: true, phone: lookupPhone });
      setLookupMsg({ ok: false, text: t("step.patient.notFound") });
    }
  }

  return (
    <WizardShell title={t("step.patient.title")}>
      <div className="mb-5 grid grid-cols-2 gap-2">
        <button
          onClick={() => patchPatient({ isNew: false })}
          className={cn(
            "flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors",
            !p.isNew ? "border-primary bg-primary/[0.06]" : "border-border hover:bg-secondary",
          )}
        >
          <UserCheck className="size-4 text-primary" />
          {t("step.patient.returning")}
        </button>
        <button
          onClick={() => patchPatient({ isNew: true, patientId: undefined })}
          className={cn(
            "flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors",
            p.isNew ? "border-primary bg-primary/[0.06]" : "border-border hover:bg-secondary",
          )}
        >
          <UserPlus className="size-4 text-primary" />
          {t("step.patient.new")}
        </button>
      </div>

      {!p.isNew && (
        <div className="mb-5 rounded-2xl border border-border bg-secondary/40 p-4">
          <Label className="text-xs">{t("step.patient.lookupHint")}</Label>
          <div className="mt-1.5 flex gap-2">
            <Input
              inputMode="tel"
              placeholder="(904) 555-0143"
              value={lookupPhone}
              onChange={(e) => setLookupPhone(e.target.value)}
            />
            <Button onClick={doLookup} disabled={looking} className="shrink-0 rounded-xl">
              {looking ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              {t("step.patient.lookup")}
            </Button>
          </div>
          {lookupMsg && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "mt-2 text-xs font-medium",
                lookupMsg.ok ? "text-success" : "text-muted-foreground",
              )}
            >
              {lookupMsg.text}
            </motion.p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Demo tip: any seeded patient phone works, or just switch to “new”.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("step.patient.first")} required>
          <Input value={p.firstName} onChange={(e) => patchPatient({ firstName: e.target.value })} />
        </Field>
        <Field label={t("step.patient.last")} required>
          <Input value={p.lastName} onChange={(e) => patchPatient({ lastName: e.target.value })} />
        </Field>
        <Field label={t("step.patient.phone")} required>
          <Input
            inputMode="tel"
            value={p.phone}
            onChange={(e) => patchPatient({ phone: e.target.value })}
          />
        </Field>
        <Field label={t("step.patient.email")}>
          <Input
            type="email"
            value={p.email}
            onChange={(e) => patchPatient({ email: e.target.value })}
          />
        </Field>
        <Field label={t("step.patient.dob")}>
          <Input type="date" value={p.dob} onChange={(e) => patchPatient({ dob: e.target.value })} />
        </Field>
      </div>

      {state.family.length > 0 && (
        <p className="mt-4 rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
          Booking for {state.family.length + 1} people — we captured each name on the first step. Front
          desk confirms the rest at check-in.
        </p>
      )}
    </WizardShell>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {required && <span className="ml-0.5 text-accent">*</span>}
      </Label>
      {children}
    </div>
  );
}
