"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { MapPin, Check, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COMING_SOON } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { useStore, useStoreSnapshot } from "@/hooks/use-store";
import type { ComingSoonLocationId } from "@/lib/types";

export default function ComingSoonPage() {
  const { t } = useI18n();
  const store = useStore();
  const snap = useStoreSnapshot();

  const [pref, setPref] = useState<ComingSoonLocationId>("fleming-island");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of snap.comingSoonLeads) c[l.preferredLocation] = (c[l.preferredLocation] ?? 0) + 1;
    return c;
  }, [snap.comingSoonLeads]);

  async function submit() {
    if (!name || !email || zip.length < 5) return;
    setBusy(true);
    await store.addComingSoonLead({ name, email, zip, preferredLocation: pref });
    setBusy(false);
    setDone(true);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/[0.07] px-3 py-1 text-xs font-medium text-accent">
        <Sparkles className="size-3.5" /> {t("comingSoon.opening", { year: "2026–2027" })}
      </p>
      <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{t("comingSoon.title")}</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">{t("comingSoon.subtitle")}</p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {COMING_SOON.map((l) => (
            <button
              key={l.id}
              onClick={() => setPref(l.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl border bg-card p-4 text-left transition-all",
                pref === l.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40",
              )}
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="size-4" />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{l.name}</p>
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("comingSoon.opening", { year: l.opening })}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{l.blurb}</p>
                <p className="mt-1.5 text-xs font-medium text-primary">
                  {t("comingSoon.count", { n: counts[l.id] ?? 0 })}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="h-fit rounded-2xl border border-border bg-card p-5 shadow-soft">
          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-6 text-center"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-success text-success-foreground">
                <Check className="size-6" strokeWidth={3} />
              </span>
              <p className="font-medium">
                {t("comingSoon.joined", {
                  location: COMING_SOON.find((l) => l.id === pref)?.name ?? "",
                })}
              </p>
              <button
                onClick={() => {
                  setDone(false);
                  setName("");
                  setEmail("");
                  setZip("");
                }}
                className="text-sm text-primary hover:underline"
              >
                Add another
              </button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("comingSoon.zip")}</Label>
                <Input
                  inputMode="numeric"
                  maxLength={5}
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Preferred: <span className="font-medium text-foreground">{COMING_SOON.find((l) => l.id === pref)?.name}</span>
              </p>
              <Button onClick={submit} disabled={busy} className="w-full rounded-full">
                {busy ? <Loader2 className="size-4 animate-spin" /> : t("comingSoon.join")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
