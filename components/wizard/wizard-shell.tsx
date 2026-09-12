"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { useBooking } from "@/hooks/use-booking";

export function WizardShell({
  title,
  subtitle,
  children,
  onContinue,
  continueLabel,
  hideContinue,
  aside,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onContinue?: () => void;
  continueLabel?: string;
  hideContinue?: boolean;
  aside?: React.ReactNode;
}) {
  const { t } = useI18n();
  const { steps, stepIndex, step, goBack, goNext, canAdvance } = useBooking();
  const pct = Math.round(((stepIndex + (canAdvance ? 1 : 0.35)) / steps.length) * 100);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-6 sm:pt-10">
      {/* progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={stepIndex === 0}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-0"
          >
            <ArrowLeft className="size-4" />
            {t("wizard.back")}
          </button>
          <span className="text-xs font-medium text-muted-foreground">
            {t("wizard.step", { n: stepIndex + 1, total: steps.length })}
          </span>
        </div>
        <div className="flex gap-1.5">
          {steps.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-500",
                i < stepIndex ? "bg-primary" : i === stepIndex ? "bg-primary/60" : "bg-border",
              )}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1.5 text-muted-foreground">{subtitle}</p> : null}
            <div className="mt-6">{children}</div>
            {aside}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* footer CTA */}
      {!hideContinue && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <Check className="mr-1 inline size-3.5 text-success" />
              {t("wizard.saved")}
            </p>
            <Button
              size="lg"
              className="rounded-full bg-accent px-8 text-accent-foreground hover:bg-accent/90"
              disabled={!canAdvance}
              onClick={onContinue ?? goNext}
            >
              {continueLabel ?? t("wizard.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
