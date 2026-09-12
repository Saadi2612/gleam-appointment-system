"use client";

import Link from "next/link";
import { MapPin, Phone, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LOCATIONS, PROVIDERS } from "@/lib/domain";
import { mapsUrl } from "@/lib/utils";
import { MonogramAvatar } from "@/components/monogram-avatar";
import { useI18n } from "@/components/i18n-provider";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function LocationsPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-semibold sm:text-4xl">{t("nav.locations")}</h1>
      <p className="mt-2 text-muted-foreground">
        Two Jacksonville offices. Same team, same technology, no referrals needed.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {LOCATIONS.map((l) => {
          const docs = PROVIDERS.filter((p) => p.locationIds.includes(l.id));
          return (
            <div key={l.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="border-b border-border p-5">
                <h2 className="text-xl font-semibold">{l.name}</h2>
                <a
                  href={mapsUrl(l.address, l.city, l.state, l.zip)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  {l.address}, {l.city}, {l.state} {l.zip}
                </a>
                <a
                  href={`tel:${l.phone.replace(/\D/g, "")}`}
                  className="mt-1 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Phone className="size-4" />
                  {l.phone}
                </a>
              </div>

              <div className="p-5">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Clock className="size-3.5" /> Hours
                </p>
                <table className="w-full text-sm">
                  <tbody>
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                      const h = l.hours[d];
                      return (
                        <tr key={d} className="border-b border-border/60 last:border-0">
                          <td className="py-1.5 text-muted-foreground">{DAYS[d]}</td>
                          <td className="py-1.5 text-right font-medium tabular-nums">
                            {h ? `${fmt(h.open)} – ${fmt(h.close)}` : "Closed"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border p-5">
                {docs.map((p) => (
                  <span key={p.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MonogramAvatar initials={p.initials} size="sm" />
                    Dr. {p.lastName}
                  </span>
                ))}
              </div>

              <div className="border-t border-border p-4">
                <Button asChild className="w-full rounded-full">
                  <Link href={`/book?location=${l.id}`}>
                    {t("nav.book")} — {l.shortName} <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fmt(c: string) {
  const [h, m] = c.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ap}`;
}
