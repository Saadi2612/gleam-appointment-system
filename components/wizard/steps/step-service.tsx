"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Clock, Users, Plus, X, Ambulance } from "lucide-react";
import { SERVICES } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/i18n-provider";
import { useBooking, type FamilyMember } from "@/hooks/use-booking";
import { WizardShell } from "../wizard-shell";
import { ServiceIcon } from "../service-icon";
import { SelectCard } from "../select-card";

export function StepService() {
  const { t, service: sv } = useI18n();
  const { state, patch, goNext } = useBooking();
  const [familyOpen, setFamilyOpen] = useState(state.family.length > 0);

  function choose(id: string) {
    const emergency = id === "emergency";
    patch({
      serviceId: id,
      emergency,
      // emergency is always first-available and same-location
      providerId: emergency ? "any" : state.providerId,
    });
    if (!familyOpen) setTimeout(goNext, 240);
  }

  function addMember() {
    const m: FamilyMember = {
      id: `m_${Date.now()}`,
      firstName: "",
      lastName: state.patient.lastName || "",
      dob: "",
      serviceId: state.serviceId ?? "routine-cleaning",
    };
    patch({ family: [...state.family, m] });
  }
  function updateMember(id: string, p: Partial<FamilyMember>) {
    patch({ family: state.family.map((m) => (m.id === id ? { ...m, ...p } : m)) });
  }
  function removeMember(id: string) {
    const next = state.family.filter((m) => m.id !== id);
    patch({ family: next, familySlots: undefined });
    if (next.length === 0) setFamilyOpen(false);
  }

  return (
    <WizardShell title={t("step.service.title")} subtitle={t("step.service.subtitle")}>
      <div className="grid gap-3 sm:grid-cols-2">
        {SERVICES.map((s) => {
          const copy = sv(s.id);
          const selected = state.serviceId === s.id;
          return (
            <SelectCard
              key={s.id}
              selected={selected}
              tone={s.emergency ? "accent" : "default"}
              onClick={() => choose(s.id)}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    s.emergency ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary",
                  )}
                >
                  <ServiceIcon name={s.icon} className="size-5" />
                </span>
                <div className="min-w-0 pr-4">
                  <p className="font-semibold leading-tight">{copy.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{copy.description}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    {s.emergency ? (
                      <>
                        <Ambulance className="size-3.5" /> {t("common.sameDay")}
                      </>
                    ) : (
                      <>
                        <Clock className="size-3.5" /> {s.durationMin} {t("common.minutes")}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </SelectCard>
          );
        })}
      </div>

      {/* family booking */}
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-secondary/40 p-4">
        {!familyOpen ? (
          <button
            onClick={() => {
              setFamilyOpen(true);
              if (state.family.length === 0) addMember();
            }}
            className="flex w-full items-center gap-2 text-sm font-medium text-primary"
          >
            <Users className="size-4" />
            {t("home.familyTitle")}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Users className="size-4 text-primary" /> {t("family.title")}
              </p>
              <button
                onClick={() => {
                  setFamilyOpen(false);
                  patch({ family: [], familySlots: undefined });
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {t("common.close")}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{t("family.subtitle")}</p>

            <AnimatePresence initial={false}>
              {state.family.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-border bg-card p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t("family.member", { n: i + 1 })}
                      </span>
                      <button onClick={() => removeMember(m.id)} className="text-muted-foreground hover:text-destructive">
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder={t("step.patient.first")}
                        value={m.firstName}
                        onChange={(e) => updateMember(m.id, { firstName: e.target.value })}
                      />
                      <Input
                        placeholder={t("step.patient.last")}
                        value={m.lastName}
                        onChange={(e) => updateMember(m.id, { lastName: e.target.value })}
                      />
                      <Input
                        type="date"
                        aria-label={t("step.patient.dob")}
                        value={m.dob}
                        onChange={(e) => updateMember(m.id, { dob: e.target.value })}
                      />
                      <Select value={m.serviceId} onValueChange={(v) => updateMember(m.id, { serviceId: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICES.filter((s) => !s.emergency).map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {sv(s.id).name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={addMember}>
                <Plus className="size-4" /> {t("family.add")}
              </Button>
              {state.serviceId && (
                <Button type="button" size="sm" className="rounded-full" onClick={goNext}>
                  {t("wizard.next")}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </WizardShell>
  );
}
