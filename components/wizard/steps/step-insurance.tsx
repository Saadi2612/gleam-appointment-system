"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ShieldCheck, Loader2, BadgeCheck, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INSURANCE_CARRIERS } from "@/lib/domain";
import { formatMoney } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { useBooking } from "@/hooks/use-booking";
import { useStore } from "@/hooks/use-store";
import { WizardShell } from "../wizard-shell";

export function StepInsurance() {
  const { t } = useI18n();
  const store = useStore();
  const { state, patchInsurance, goNext } = useBooking();
  const ins = state.insurance;
  const [verifying, setVerifying] = useState(false);

  const selfPay = ins.carrier === "I'll pay out of pocket";

  async function verify() {
    if (!ins.carrier || !ins.memberId) return;
    setVerifying(true);
    const result = await store.checkEligibility(ins.carrier, ins.memberId);
    patchInsurance({ eligibility: result, skipped: false });
    setVerifying(false);
  }

  return (
    <WizardShell title={t("step.insurance.title")} subtitle={t("step.insurance.subtitle")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("step.insurance.carrier")}</Label>
          <Select
            value={ins.carrier}
            onValueChange={(v) => patchInsurance({ carrier: v, eligibility: undefined })}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {INSURANCE_CARRIERS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!selfPay && (
          <div className="space-y-1.5">
            <Label className="text-xs">{t("step.insurance.memberId")}</Label>
            <Input
              value={ins.memberId ?? ""}
              onChange={(e) => patchInsurance({ memberId: e.target.value, eligibility: undefined })}
              placeholder="e.g. D123456789"
            />
          </div>
        )}
      </div>

      {!selfPay && (
        <div className="mt-4">
          <Button
            onClick={verify}
            disabled={!ins.carrier || !ins.memberId || verifying}
            className="rounded-full"
          >
            {verifying ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {t("step.insurance.verify")}
          </Button>
        </div>
      )}

      {verifying && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-4 text-sm"
        >
          <Loader2 className="size-5 animate-spin text-primary" />
          {t("step.insurance.verifying", { carrier: ins.carrier ?? "" })}
        </motion.div>
      )}

      {ins.eligibility && !verifying && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          className="mt-4 overflow-hidden rounded-2xl border border-success/30 bg-success/[0.06]"
        >
          <div className="flex items-center gap-2 border-b border-success/20 bg-success/10 px-4 py-2.5">
            <BadgeCheck className="size-4 text-success" />
            <span className="text-sm font-semibold text-success">
              Coverage active · {t("step.insurance.network")}
            </span>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Info label={t("step.insurance.plan")} value={ins.eligibility.planName} />
            <Info
              label={t("step.insurance.remaining")}
              value={`${formatMoney(ins.eligibility.annualMaximumRemaining)} / ${formatMoney(
                ins.eligibility.annualMaximum,
              )}`}
            >
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-success"
                  style={{
                    width: `${
                      (ins.eligibility.annualMaximumRemaining / ins.eligibility.annualMaximum) * 100
                    }%`,
                  }}
                />
              </div>
            </Info>
            <Info
              label="Deductible"
              value={`${formatMoney(ins.eligibility.deductibleMet)} of ${formatMoney(
                ins.eligibility.deductible,
              )} met`}
            />
            <Info label="Preventive" value={`${ins.eligibility.preventiveCoveragePct}% covered`} />
          </div>
          <div className="flex items-center gap-2 border-t border-success/20 px-4 py-2.5 text-sm font-medium text-success">
            <BadgeCheck className="size-4" />
            {t("step.insurance.covered")}
          </div>
        </motion.div>
      )}

      <button
        onClick={() => {
          patchInsurance({ skipped: true });
          goNext();
        }}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        {t("step.insurance.skip")}
        <ArrowRight className="size-3.5" />
      </button>
    </WizardShell>
  );
}

function Info({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
      {children}
    </div>
  );
}
