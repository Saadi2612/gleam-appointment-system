"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  ArrowRight,
  Phone,
  TriangleAlert,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LOCATIONS, getService } from "@/lib/domain";
import { cn } from "@/lib/utils";
import {
  FALLBACK_REPLY,
  TRIAGE_DISCLAIMER,
  TRIAGE_EXAMPLES,
  TRIAGE_GREETING,
  URGENCY_META,
  triage,
  type TriageResult,
} from "@/lib/triage";
import { useI18n } from "@/components/i18n-provider";

interface Msg {
  id: string;
  from: "bot" | "user";
  text: string;
  result?: TriageResult | null;
}

export function TriageAssistant() {
  const { lang } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // greet on first open, and re-greet if the language changes
  useEffect(() => {
    if (!open) return;
    setMsgs((m) => (m.length ? m : [{ id: "greet", from: "bot", text: TRIAGE_GREETING[lang] }]));
  }, [open, lang]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking]);

  // hidden where it would get in the way: the wizard, the dashboard, and the
  // embed mock (whose whole point is showing the host site uncluttered)
  if (["/admin", "/book", "/embed"].some((p) => pathname.startsWith(p))) return null;

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput("");
    setMsgs((m) => [...m, { id: `u${Date.now()}`, from: "user", text: trimmed }]);
    setThinking(true);
    // a beat of "thinking" — the engine itself is instant
    setTimeout(() => {
      const result = triage(trimmed);
      setThinking(false);
      setMsgs((m) => [
        ...m,
        {
          id: `b${Date.now()}`,
          from: "bot",
          text: result ? result.rule.reply[lang] : FALLBACK_REPLY[lang],
          result,
        },
      ]);
    }, 550);
  }

  function startBooking(result: TriageResult, overrideServiceId?: string) {
    const serviceId = overrideServiceId ?? result.serviceId;
    // only the primary recommendation carries the emergency fast-path
    const emergency = !overrideServiceId && result.urgency === "emergency";
    setOpen(false);
    router.push(`/book?service=${serviceId}${emergency ? "&emergency=1" : ""}&via=triage`);
  }

  return (
    <>
      {/* launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ bottom: "calc(3.5rem + var(--tour-offset, 0rem))" }}
        className={cn(
          "fixed right-3 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-transform hover:scale-[1.03]",
          open && "scale-0 opacity-0",
        )}
      >
        <MessageCircle className="size-4" />
        {lang === "es" ? "¿Qué le duele?" : "What's bothering you?"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            style={{ bottom: "calc(0.75rem + var(--tour-offset, 0rem))" }}
            className="fixed inset-x-3 z-40 flex max-h-[75vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lift sm:inset-x-auto sm:right-4 sm:w-[380px]"
          >
            {/* header */}
            <div className="flex items-center gap-2 border-b border-border bg-primary/[0.05] px-4 py-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="size-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {lang === "es" ? "Asistente de Gleam" : "Gleam Assistant"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {lang === "es" ? "Le guía a la visita correcta" : "Points you to the right visit"}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            {/* messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {msgs.map((m) => (
                <div key={m.id}>
                  <div className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                        m.from === "user"
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "rounded-bl-sm bg-secondary",
                      )}
                    >
                      {m.text}
                    </div>
                  </div>
                  {m.result && (
                    <Recommendation
                      result={m.result}
                      onBook={(svcId) => startBooking(m.result!, svcId)}
                    />
                  )}
                </div>
              ))}

              {thinking && (
                <div className="flex gap-1 px-2">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.25, 1, 0.25] }}
                      transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16 }}
                      className="size-1.5 rounded-full bg-muted-foreground"
                    />
                  ))}
                </div>
              )}

              {msgs.length <= 1 && !thinking && (
                <div className="space-y-1.5 pt-1">
                  {TRIAGE_EXAMPLES[lang].map((ex) => (
                    <button
                      key={ex}
                      onClick={() => send(ex)}
                      className="block w-full rounded-xl border border-dashed border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      “{ex}”
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* composer */}
            <div className="border-t border-border p-3">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send(input)}
                  placeholder={lang === "es" ? "Describa su situación…" : "Describe what's going on…"}
                  className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button size="icon" className="size-10 shrink-0 rounded-xl" onClick={() => send(input)}>
                  <Send className="size-4" />
                </Button>
              </div>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                {TRIAGE_DISCLAIMER[lang]}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Recommendation({
  result,
  onBook,
}: {
  result: TriageResult;
  onBook: (serviceId?: string) => void;
}) {
  const { lang, service: sv } = useI18n();
  const service = getService(result.serviceId)!;
  const meta = URGENCY_META[result.urgency];
  const copy = sv(service.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="mt-2 overflow-hidden rounded-xl border border-border bg-background"
    >
      {result.rule.redFlag && (
        <p className="flex items-start gap-1.5 border-b border-destructive/20 bg-destructive/[0.07] px-3 py-2 text-[11px] font-medium text-destructive">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {result.rule.redFlag[lang]}
        </p>
      )}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", meta.className)}>
            {meta.label[lang]}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {service.durationMin} {lang === "es" ? "min" : "min"}
          </span>
        </div>
        <p className="mt-1.5 text-sm font-semibold">{copy.name}</p>

        {result.deadlineDays != null && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3" />
            {lang === "es"
              ? `Tiene ~${result.deadlineDays} días — buscaremos citas dentro de ese plazo.`
              : `You've got ~${result.deadlineDays} days — we'll look for slots inside that window.`}
          </p>
        )}

        <Button
          onClick={() => onBook()}
          size="sm"
          className="mt-3 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {lang === "es" ? "Reservar esta visita" : "Book this visit"}
          <ArrowRight className="size-3.5" />
        </Button>

        {result.urgency === "emergency" && (
          <a
            href={`tel:${LOCATIONS[0].phone.replace(/\D/g, "")}`}
            className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Phone className="size-3.5" />
            {lang === "es" ? "O llame ahora" : "Or call now"} · {LOCATIONS[0].phone}
          </a>
        )}

        {result.alternates.length > 0 && (
          <div className="mt-2.5 border-t border-border pt-2">
            <p className="text-[11px] text-muted-foreground">
              {lang === "es" ? "También podría interesarle:" : "You might also want:"}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {result.alternates.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onBook(a.serviceId)}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium transition-colors hover:border-primary/50 hover:bg-secondary"
                >
                  {a.label[lang]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
