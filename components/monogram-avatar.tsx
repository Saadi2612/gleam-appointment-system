import { cn } from "@/lib/utils";

const PALETTE: Record<string, string> = {
  SM: "bg-[oklch(0.44_0.058_205)] text-white",
  AG: "bg-[oklch(0.55_0.11_155)] text-white",
  AA: "bg-[oklch(0.6_0.13_300)] text-white",
  LW: "bg-[oklch(0.62_0.14_30)] text-white",
  KS: "bg-[oklch(0.5_0.1_255)] text-white",
};

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-11 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-xl",
} as const;

export function MonogramAvatar({
  initials,
  size = "md",
  className,
}: {
  initials: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide shadow-soft ring-2 ring-card",
        PALETTE[initials] ?? "bg-primary text-primary-foreground",
        SIZES[size],
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
