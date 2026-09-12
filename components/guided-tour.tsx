"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X, Route, Quote, MousePointerClick, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOUR, TOUR_SECTIONS } from "@/lib/tour";

interface TourCtx {
  active: boolean;
  index: number;
  start: (at?: number) => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  goto: (i: number) => void;
}

const Ctx = createContext<TourCtx | null>(null);
const LS_KEY = "gleam.tour";

export function GuidedTourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [showList, setShowList] = useState(false);

  // survive the navigations the tour itself performs
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(LS_KEY);
      if (raw) {
        const { active: a, index: i } = JSON.parse(raw);
        setActive(!!a);
        setIndex(i ?? 0);
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    window.sessionStorage.setItem(LS_KEY, JSON.stringify({ active, index }));
  }, [active, index]);

  // lift the floating widgets (demo badge, ⌘K button, triage bubble) clear of
  // the tour bar, and keep page content scrollable past it
  useEffect(() => {
    document.documentElement.style.setProperty("--tour-offset", active ? "9.5rem" : "0rem");
    document.body.style.paddingBottom = active ? "9.5rem" : "";
    return () => {
      document.documentElement.style.setProperty("--tour-offset", "0rem");
      document.body.style.paddingBottom = "";
    };
  }, [active]);

  const goto = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(TOUR.length - 1, i));
      setIndex(clamped);
      router.push(TOUR[clamped].href);
    },
    [router],
  );

  const start = useCallback(
    (at = 0) => {
      setActive(true);
      goto(at);
    },
    [goto],
  );
  const stop = useCallback(() => {
    setActive(false);
    setShowList(false);
  }, []);
  const next = useCallback(() => goto(index + 1), [goto, index]);
  const prev = useCallback(() => goto(index - 1), [goto, index]);

  // keyboard: ← → to move, Esc to exit
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && ["INPUT", "TEXTAREA"].includes(el.tagName)) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, next, prev, stop]);

  const value = useMemo<TourCtx>(
    () => ({ active, index, start, stop, next, prev, goto }),
    [active, index, start, stop, next, prev, goto],
  );

  const step = TOUR[index];

  return (
    <Ctx.Provider value={value}>
      {children}

      <AnimatePresence>
        {active && step && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 shadow-lift backdrop-blur"
          >
            {/* progress rail */}
            <div className="flex gap-0.5 px-3 pt-2">
              {TOUR.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goto(i)}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    i < index ? "bg-primary" : i === index ? "bg-accent" : "bg-border",
                  )}
                  aria-label={s.title}
                />
              ))}
            </div>

            <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Route className="size-3.5 text-primary" />
                  {TOUR_SECTIONS[step.section]} · step {index + 1} of {TOUR.length}
                </p>
                <p className="mt-0.5 text-sm font-semibold">{step.title}</p>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                  <Quote className="mt-0.5 size-3 shrink-0 text-accent" />
                  <span className="italic">“{step.say}”</span>
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <MousePointerClick className="size-3" />
                  {step.doThis}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => setShowList((s) => !s)}
                  className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground"
                  title="All steps"
                >
                  <ListChecks className="size-4" />
                </button>
                <button
                  onClick={prev}
                  disabled={index === 0}
                  className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {index === TOUR.length - 1 ? (
                  <button
                    onClick={stop}
                    className="rounded-full bg-success px-4 py-2 text-sm font-semibold text-success-foreground"
                  >
                    Finish
                  </button>
                ) : (
                  <button
                    onClick={next}
                    className="inline-flex items-center gap-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
                  >
                    Next <ChevronRight className="size-4" />
                  </button>
                )}
                <button
                  onClick={stop}
                  className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* step index */}
            <AnimatePresence>
              {showList && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-border"
                >
                  <div className="mx-auto grid max-w-4xl gap-1 p-3 sm:grid-cols-2">
                    {TOUR.map((s, i) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          goto(i);
                          setShowList(false);
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                          i === index ? "bg-secondary font-semibold" : "hover:bg-secondary/60",
                        )}
                      >
                        <span className="w-5 shrink-0 tabular-nums text-muted-foreground">{i + 1}.</span>
                        <span className="truncate">{s.title}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

export function useTour(): TourCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTour outside GuidedTourProvider");
  return c;
}
