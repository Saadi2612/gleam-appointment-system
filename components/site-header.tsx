"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import { LOCATIONS } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GleamLogo } from "./gleam-logo";
import { LangToggle } from "./lang-toggle";
import { useI18n } from "./i18n-provider";

export function SiteHeader() {
  const { t } = useI18n();
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/embed")) return null;

  const nav = [
    { href: "/book", label: t("nav.book") },
    { href: "/membership", label: t("nav.membership") },
    { href: "/locations", label: t("nav.locations") },
    { href: "/coming-soon", label: t("nav.comingSoon") },
    { href: "/manage", label: t("nav.manage") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0">
          <GleamLogo />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                pathname.startsWith(n.href) && "bg-secondary text-foreground",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <a
            href={`tel:${LOCATIONS[0].phone.replace(/\D/g, "")}`}
            className="hidden items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:flex"
          >
            <Phone className="size-4" />
            {LOCATIONS[0].phone}
          </a>
          <LangToggle />
          <Button asChild size="sm" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/book">{t("home.cta")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
