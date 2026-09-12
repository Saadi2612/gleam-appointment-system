"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Star, Loader2, Check, ExternalLink, MessageSquareHeart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocation, getProvider, getService } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { MonogramAvatar } from "@/components/monogram-avatar";
import { useI18n } from "@/components/i18n-provider";
import { useStore, useStoreQuery } from "@/hooks/use-store";

export default function ReviewPage() {
  const { lang } = useI18n();
  const { token } = useParams<{ token: string }>();
  const store = useStore();

  const { data: appt, loading } = useStoreQuery((s) => s.getAppointmentByToken(token), [token]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"rate" | "public" | "private" | "thanks">("rate");

  async function pick(stars: number) {
    if (!appt) return;
    setRating(stars);
    setBusy(true);
    await store.submitReview(appt.id, stars);
    setBusy(false);
    // 4–5 stars → invite a public Google review; 1–3 → private feedback form
    setStage(stars >= 4 ? "public" : "private");
  }

  async function sendPrivate() {
    if (!appt) return;
    setBusy(true);
    await store.submitReview(appt.id, rating, feedback);
    await store.notify({
      channel: "email",
      to: "office@gleamdental.com",
      kind: "review-request",
      relatedAppointmentId: appt.id,
      subject: `${rating}★ private feedback — needs follow-up`,
      body: feedback || "(no comment left)",
    });
    setBusy(false);
    setStage("thanks");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }
  if (!appt) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground">
        {lang === "es" ? "No pudimos encontrar esa visita." : "We couldn't find that visit."}
      </div>
    );
  }

  const provider = getProvider(appt.providerId)!;
  const loc = getLocation(appt.locationId)!;
  const service = getService(appt.serviceId)!;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
        <MonogramAvatar initials={provider.initials} size="lg" className="mx-auto" />
        <p className="mt-3 text-sm text-muted-foreground">
          {service.name} · {loc.shortName}
        </p>

        <AnimatePresence mode="wait">
          {stage === "rate" && (
            <motion.div key="rate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h1 className="mt-2 text-xl font-semibold">
                {lang === "es"
                  ? `¿Cómo estuvo su visita con el Dr. ${provider.lastName}?`
                  : `How was your visit with Dr. ${provider.lastName}?`}
              </h1>
              <div className="mt-5 flex justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    disabled={busy}
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => pick(s)}
                    className="transition-transform hover:scale-110 active:scale-95"
                    aria-label={`${s} stars`}
                  >
                    <Star
                      className={cn(
                        "size-9 transition-colors",
                        (hover || rating) >= s ? "fill-warning text-warning" : "text-border",
                      )}
                    />
                  </button>
                ))}
              </div>
              {busy && <Loader2 className="mx-auto mt-4 size-4 animate-spin text-muted-foreground" />}
              <p className="mt-4 text-xs text-muted-foreground">
                {lang === "es" ? "Toma diez segundos." : "Takes ten seconds."}
              </p>
            </motion.div>
          )}

          {/* 4–5 stars → route to Google */}
          {stage === "public" && (
            <motion.div key="public" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mt-3 flex justify-center gap-1">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star key={i} className="size-5 fill-warning text-warning" />
                ))}
              </div>
              <h1 className="mt-3 text-xl font-semibold">
                {lang === "es" ? "¡Gracias! Eso nos alegra el día." : "Thank you — that made our day."}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {lang === "es"
                  ? "¿Nos ayudaría compartiéndolo en Google? Es lo que ayuda a otras familias de Jacksonville a encontrarnos."
                  : "Would you share it on Google? It's what helps other Jacksonville families find us."}
              </p>
              <Button
                onClick={() => {
                  store.markReviewPosted(appt.id);
                  setStage("thanks");
                }}
                size="lg"
                className="mt-5 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {lang === "es" ? "Escribir reseña en Google" : "Leave a Google review"}
                <ExternalLink className="size-4" />
              </Button>
              <button
                onClick={() => setStage("thanks")}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground"
              >
                {lang === "es" ? "Ahora no" : "Not right now"}
              </button>
              <p className="mt-4 text-[10px] text-muted-foreground">
                {lang === "es" ? "Demo — no abre Google de verdad." : "Demo — doesn't actually open Google."}
              </p>
            </motion.div>
          )}

          {/* 1–3 stars → private feedback, stays off the public internet */}
          {stage === "private" && (
            <motion.div key="private" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mt-3 flex justify-center gap-1">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star key={i} className="size-5 fill-warning text-warning" />
                ))}
              </div>
              <h1 className="mt-3 text-xl font-semibold">
                {lang === "es" ? "Lo sentimos — cuéntenos qué pasó." : "We're sorry — tell us what happened."}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {lang === "es"
                  ? "Esto va directo a la gerente de la oficina, no a internet. Le responderemos."
                  : "This goes straight to the office manager, not the internet. We'll get back to you."}
              </p>
              <Textarea
                className="mt-4 text-left"
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={
                  lang === "es" ? "¿Qué podríamos haber hecho mejor?" : "What could we have done better?"
                }
              />
              <Button onClick={sendPrivate} disabled={busy} size="lg" className="mt-4 w-full rounded-full">
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {lang === "es" ? "Enviar en privado" : "Send privately"}
              </Button>
              <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3" />
                {lang === "es" ? "Solo lo ve la gerencia de Gleam." : "Only Gleam management sees this."}
              </p>
            </motion.div>
          )}

          {stage === "thanks" && (
            <motion.div key="thanks" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <span className="mx-auto mt-4 flex size-12 items-center justify-center rounded-full bg-success text-success-foreground">
                {rating >= 4 ? <Check className="size-6" strokeWidth={3} /> : <MessageSquareHeart className="size-6" />}
              </span>
              <h1 className="mt-3 text-xl font-semibold">
                {lang === "es" ? "¡Gracias!" : "Thank you!"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {rating >= 4
                  ? lang === "es"
                    ? "Nos vemos en su próxima limpieza."
                    : "See you at your next cleaning."
                  : lang === "es"
                    ? "La gerente de la oficina lo contactará pronto."
                    : "Our office manager will reach out shortly."}
              </p>
              <Button asChild variant="outline" className="mt-5 rounded-full">
                <Link href="/">{lang === "es" ? "Volver al inicio" : "Back to home"}</Link>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
