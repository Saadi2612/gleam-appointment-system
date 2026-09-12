import { cn } from "@/lib/utils";

/** Wordmark + tooth/sparkle mark. Pure SVG, inherits currentColor. */
export function GleamLogo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-primary", className)}>
      <svg viewBox="0 0 32 32" className="size-7" fill="none" aria-hidden>
        <path
          d="M16 4.5c-3.2 0-4.6 1.6-7.2 1.6-2.1 0-3.9-1-4.3.9-.6 2.6.2 6.5 1.1 10.2.7 2.8 1.6 6.4 3.1 8.2 1.4 1.7 2.6.6 3.2-1.7.5-2 .9-4.2 2.1-4.2s1.6 2.2 2.1 4.2c.6 2.3 1.8 3.4 3.2 1.7 1.5-1.8 2.4-5.4 3.1-8.2.9-3.7 1.7-7.6 1.1-10.2-.4-1.9-2.2-.9-4.3-.9-2.6 0-4-1.6-7.2-1.6Z"
          fill="currentColor"
        />
        <path d="M22.5 3.2l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9L20 5.8l1.9-.7.6-1.9Z" fill="var(--accent)" />
      </svg>
      {showWordmark && (
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Gleam<span className="text-primary"> Dental</span>
        </span>
      )}
    </span>
  );
}
