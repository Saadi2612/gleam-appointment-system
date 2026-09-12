"use client";

import { LANGS } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useI18n } from "./i18n-provider";

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card p-0.5 text-xs font-medium",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={cn(
            "rounded-full px-2.5 py-1 transition-colors",
            lang === l.code
              ? "bg-primary text-primary-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={lang === l.code}
        >
          {l.flag}
        </button>
      ))}
    </div>
  );
}
