"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function SelectCard({
  selected,
  onClick,
  children,
  className,
  disabled,
  tone = "default",
}: {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  tone?: "default" | "accent";
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "group relative w-full rounded-2xl border bg-card p-4 text-left transition-all duration-200",
        "hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? tone === "accent"
            ? "border-accent ring-2 ring-accent/30"
            : "border-primary ring-2 ring-primary/25"
          : "border-border hover:border-primary/40",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {children}
      <span
        className={cn(
          "absolute right-3 top-3 flex size-5 items-center justify-center rounded-full transition-all",
          selected
            ? "scale-100 bg-primary text-primary-foreground opacity-100"
            : "scale-75 opacity-0",
          selected && tone === "accent" && "bg-accent text-accent-foreground",
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    </motion.button>
  );
}
