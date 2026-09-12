"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  Clock,
  PhoneOff,
  CalendarCheck2,
  ArrowRight,
  RotateCcw,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/utils";

// ---------------------------------------------------------------------------
// ROI calculator. Pre-filled with plausible two-location numbers for Gleam so
// it's persuasive the moment it loads — every input is still draggable live.
// ---------------------------------------------------------------------------

const DEFAULTS = {
  monthlyAppointments: 940,
  noShowRatePct: 12,
  avgAppointmentValue: 218,
  frontDeskHourly: 22,
  callsPerBookingMin: 6,
  onlineAdoptionPct: 55,
  monthlyCost: 897, // two locations
};

/** How much of the no-show/cancellation gap a waitlist realistically recovers. */
const WAITLIST_FILL_RATE = 0.38;
/** Reminder sequences cut no-shows by roughly this much in published dental data. */
const REMINDER_NOSHOW_REDUCTION = 0.3;
/**
 * Not every saved appointment is new money — a share of those patients would
 * have rescheduled on their own. We only count the incremental part.
 */
const INCREMENTAL_FACTOR = 0.6;

export default function RoiPage() {
  const [v, setV] = useState(DEFAULTS);

  const r = useMemo(() => {
    const noShows = v.monthlyAppointments * (v.noShowRatePct / 100);

    // 1. reminders reduce no-shows outright
    const noShowsPrevented = noShows * REMINDER_NOSHOW_REDUCTION;
    const reminderRevenue = noShowsPrevented * v.avgAppointmentValue * INCREMENTAL_FACTOR;

    // 2. the waitlist backfills a share of what still falls off
    const remaining = noShows - noShowsPrevented;
    const filled = remaining * WAITLIST_FILL_RATE;
    const waitlistRevenue = filled * v.avgAppointmentValue * INCREMENTAL_FACTOR;

    // 3. online booking removes phone handling time
    const onlineBookings = v.monthlyAppointments * (v.onlineAdoptionPct / 100);
    const hoursSaved = (onlineBookings * v.callsPerBookingMin) / 60;
    const laborSavings = hoursSaved * v.frontDeskHourly;

    const monthlyGain = reminderRevenue + waitlistRevenue + laborSavings;
    const netMonthly = monthlyGain - v.monthlyCost;
    const roiMultiple = v.monthlyCost > 0 ? monthlyGain / v.monthlyCost : 0;
    const paybackDays = monthlyGain > 0 ? (v.monthlyCost / monthlyGain) * 30 : Infinity;

    return {
      noShows,
      noShowsPrevented,
      filled,
      reminderRevenue,
      waitlistRevenue,
      hoursSaved,
      laborSavings,
      monthlyGain,
      netMonthly,
      annualGain: netMonthly * 12,
      roiMultiple,
      paybackDays,
      chart: [
        { name: "Reminders", value: Math.round(reminderRevenue) },
        { name: "Waitlist fills", value: Math.round(waitlistRevenue) },
        { name: "Staff time", value: Math.round(laborSavings) },
      ],
    };
  }, [v]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <TrendingUp className="size-3.5 text-primary" />
            Two-location model · Atlantic Beach + Bartram Park
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">What this is worth to Gleam</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Every input is yours to change — these are our starting estimates for a practice your size.
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => setV(DEFAULTS)}>
          <RotateCcw className="size-3.5" /> Reset
        </Button>
      </div>

      {/* headline */}
      <div className="mt-8 grid gap-4 rounded-2xl border border-success/30 bg-success/[0.06] p-6 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-success">
            Net recovered per year
          </p>
          <p className="mt-1 text-4xl font-semibold tabular-nums text-success sm:text-5xl">
            {formatMoney(Math.max(0, r.annualGain))}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMoney(r.netMonthly)}/month net of the {formatMoney(v.monthlyCost)} platform fee
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
          <MiniStat label="Return on spend" value={`${r.roiMultiple.toFixed(1)}×`} />
          <MiniStat
            label="Payback period"
            value={
              r.paybackDays === Infinity
                ? "—"
                : (() => {
                    const d = Math.max(1, Math.round(r.paybackDays));
                    return `${d} ${d === 1 ? "day" : "days"}`;
                  })()
            }
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* inputs */}
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold">Your numbers</p>
          <Slider
            label="Appointments per month"
            value={v.monthlyAppointments}
            min={200}
            max={2000}
            step={20}
            onChange={(n) => setV({ ...v, monthlyAppointments: n })}
            display={(n) => n.toLocaleString()}
          />
          <Slider
            label="No-show + late-cancel rate"
            value={v.noShowRatePct}
            min={2}
            max={30}
            step={1}
            onChange={(n) => setV({ ...v, noShowRatePct: n })}
            display={(n) => `${n}%`}
          />
          <Slider
            label="Average appointment value"
            value={v.avgAppointmentValue}
            min={80}
            max={600}
            step={5}
            onChange={(n) => setV({ ...v, avgAppointmentValue: n })}
            display={(n) => formatMoney(n)}
          />
          <Slider
            label="Front-desk cost per hour"
            value={v.frontDeskHourly}
            min={14}
            max={45}
            step={1}
            onChange={(n) => setV({ ...v, frontDeskHourly: n })}
            display={(n) => `${formatMoney(n)}/hr`}
          />
          <Slider
            label="Minutes of phone time per booking"
            value={v.callsPerBookingMin}
            min={2}
            max={15}
            step={1}
            onChange={(n) => setV({ ...v, callsPerBookingMin: n })}
            display={(n) => `${n} min`}
          />
          <Slider
            label="Share of bookings that move online"
            value={v.onlineAdoptionPct}
            min={10}
            max={90}
            step={5}
            onChange={(n) => setV({ ...v, onlineAdoptionPct: n })}
            display={(n) => `${n}%`}
          />
          <Slider
            label="Platform cost per month"
            value={v.monthlyCost}
            min={0}
            max={1500}
            step={25}
            onChange={(n) => setV({ ...v, monthlyCost: n })}
            display={(n) => formatMoney(n)}
          />
        </div>

        {/* outputs */}
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card
              icon={<PhoneOff className="size-4" />}
              label="No-shows prevented"
              value={`${Math.round(r.noShowsPrevented)}/mo`}
              sub={`${formatMoney(r.reminderRevenue)} in kept production`}
            />
            <Card
              icon={<CalendarCheck2 className="size-4" />}
              label="Slots refilled from waitlist"
              value={`${Math.round(r.filled)}/mo`}
              sub={`${formatMoney(r.waitlistRevenue)} recovered`}
              accent
            />
            <Card
              icon={<Clock className="size-4" />}
              label="Front-desk hours freed"
              value={`${Math.round(r.hoursSaved)} h/mo`}
              sub={`${formatMoney(r.laborSavings)} of labor`}
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold">Where the monthly gain comes from</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={r.chart} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                  tickFormatter={(n) => `$${Math.round(Number(n) / 1000)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                  width={92}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(n: unknown) => formatMoney(Number(n))}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                  {r.chart.map((_, i) => (
                    <Cell key={i} fill={["var(--chart-1)", "var(--chart-5)", "var(--chart-3)"][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
            <p className="mb-1.5 font-semibold text-foreground">How we get there</p>
            <ul className="space-y-1">
              <li>
                • {Math.round(r.noShows)} appointments/month fall off at a {v.noShowRatePct}% no-show rate.
              </li>
              <li>
                • Automated reminder sequences prevent about {Math.round(REMINDER_NOSHOW_REDUCTION * 100)}% of
                those.
              </li>
              <li>
                • The smart waitlist refills roughly {Math.round(WAITLIST_FILL_RATE * 100)}% of what still
                cancels.
              </li>
              <li>
                • Only {Math.round(INCREMENTAL_FACTOR * 100)}% of those saved visits count as new money —
                the rest would have rescheduled anyway.
              </li>
              <li>
                • {v.onlineAdoptionPct}% of bookings moving online removes {v.callsPerBookingMin} minutes of
                phone handling each.
              </li>
              <li className="pt-1 italic">
                Conservative on purpose: no credit taken for new patients won from 24/7 booking, or for
                membership-plan revenue.
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/admin/recovery">
                See the recovery engine live <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/membership">
                <Users className="size-4" /> Add membership revenue
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  display: (n: number) => string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-sm font-semibold tabular-nums">{display(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-[var(--primary)]"
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card/70 p-3 text-center">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Card({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className={accent ? "text-accent" : "text-primary"}>{icon}</span>
        {label}
      </div>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}
