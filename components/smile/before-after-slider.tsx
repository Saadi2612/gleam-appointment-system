"use client";

import { useRef, useState } from "react";
import { MoveHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Before/after comparison. `before` is the patient's own photo (a local data
 * URL that never leaves the browser); `after` is an illustrative placeholder —
 * in production this is the lab's digital wax-up render.
 */
export function BeforeAfterSlider({
  before,
  after,
  beforeLabel = "Today",
  afterLabel = "Projected",
  className,
}: {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}) {
  const [pos, setPos] = useState(50);
  const wrap = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function setFromClientX(clientX: number) {
    const rect = wrap.current!.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  }

  return (
    <div
      ref={wrap}
      className={cn(
        "relative aspect-[4/3] w-full select-none overflow-hidden rounded-2xl border border-border bg-secondary",
        className,
      )}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        setFromClientX(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && setFromClientX(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerLeave={() => (dragging.current = false)}
    >
      {/* after (full width, underneath) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={afterLabel} className="absolute inset-0 size-full object-cover" draggable={false} />
      {/* before — same box as `after`, revealed by a clip so neither image scales */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={beforeLabel} className="size-full object-cover" draggable={false} />
      </div>

      {/* handle */}
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow" style={{ left: `${pos}%` }}>
        <span className="absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-primary shadow-lift">
          <MoveHorizontal className="size-4" />
        </span>
      </div>

      <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
        {afterLabel}
      </span>
    </div>
  );
}

/** Illustrative "after" render, drawn inline so the demo ships no binary assets. */
export const PLACEHOLDER_AFTER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#e9f1f2"/><stop offset="100%" stop-color="#cfe0e3"/>
</linearGradient>
<linearGradient id="tooth" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f2f7f8"/>
</linearGradient>
</defs>
<rect width="800" height="600" fill="url(#bg)"/>
<path d="M170 300 Q400 170 630 300 Q400 470 170 300 Z" fill="#8d3a3f"/>
<g fill="url(#tooth)">
<rect x="340" y="248" width="58" height="94" rx="13"/>
<rect x="402" y="248" width="58" height="94" rx="13"/>
<rect x="292" y="256" width="44" height="80" rx="12"/>
<rect x="464" y="256" width="44" height="80" rx="12"/>
<rect x="252" y="266" width="36" height="66" rx="11"/>
<rect x="512" y="266" width="36" height="66" rx="11"/>
<rect x="216" y="278" width="32" height="52" rx="10"/>
<rect x="552" y="278" width="32" height="52" rx="10"/>
</g>
<g fill="#ffffff" opacity="0.75">
<rect x="348" y="256" width="16" height="40" rx="8"/>
<rect x="410" y="256" width="16" height="40" rx="8"/>
</g>
<text x="400" y="536" font-family="Inter,system-ui,sans-serif" font-size="26" font-weight="600" fill="#3c565b" text-anchor="middle">Illustrative preview — your dentist designs the real one</text>
</svg>`);
