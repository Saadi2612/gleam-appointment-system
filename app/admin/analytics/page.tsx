"use client";

import { useEffect, useMemo, useState } from "react";
import { subDays } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Percent, UserX, DollarSign, Armchair } from "lucide-react";
import { getProvider } from "@/lib/domain";
import { formatMoney } from "@/lib/utils";
import { useAdmin } from "@/hooks/use-admin";
import { useStore, useStoreSnapshot } from "@/hooks/use-store";

const CHART = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export default function AnalyticsPage() {
  const { scope } = useAdmin();
  const store = useStore();
  useStoreSnapshot();

  // let the grid settle before charts mount, so ResponsiveContainer measures full width
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const data = useMemo(() => {
    const to = new Date();
    const from = subDays(to, 60);
    return store.analytics({ from, to, locationId: scope === "all" ? undefined : scope });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, store, useStoreSnapshot]);

  const sourceData = Object.entries(data.newPatientsBySource).map(([k, v]) => ({ name: k, value: v }));
  const channelData = [
    { name: "Online", value: data.channelSplit.online },
    { name: "Phone", value: data.channelSplit.phone },
    { name: "Walk-in / other", value: data.channelSplit.other },
  ];
  const providerData = Object.entries(data.productionByProvider)
    .map(([id, v]) => ({ name: `Dr. ${getProvider(id)?.lastName ?? id}`, value: Math.round(v) }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Last 60 days · {scope === "all" ? "both locations combined" : "single location"}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Percent className="size-4" />}
          label="Chair utilization"
          value={`${Math.round(data.utilization * 100)}%`}
          sub="booked vs. available chair-time"
        />
        <Kpi
          icon={<UserX className="size-4" />}
          label="No-show rate"
          value={`${(data.noShowRate * 100).toFixed(1)}%`}
          sub={`${data.totals.noShow} of ${data.totals.completed + data.totals.noShow} kept`}
          tone="accent"
        />
        <Kpi
          icon={<DollarSign className="size-4" />}
          label="Production"
          value={formatMoney(data.totals.production)}
          sub={`${data.totals.completed} completed visits`}
        />
        <Kpi
          icon={<Armchair className="size-4" />}
          label="Open chair time"
          value={`${Math.round(data.openChairHours)} h`}
          sub={`≈ ${formatMoney(data.openChairCost)} idle cost`}
          tone="accent"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
       {!ready ? (
        <div className="col-span-full h-56 animate-pulse rounded-2xl border border-border bg-card" />
       ) : (
        <>
        <Panel title="Weekly volume">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.weeks} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={28} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar isAnimationActive={false} dataKey="completed" name="Completed" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
              <Bar isAnimationActive={false} dataKey="noShow" name="No-show" fill="var(--chart-5)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Weekly production">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.weeks}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={44} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => formatMoney(Number(v))} />
              <Line isAnimationActive={false} type="monotone" dataKey="production" name="Production" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Production by provider">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={providerData} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `$${v / 1000}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={80} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => formatMoney(Number(v))} />
              <Bar isAnimationActive={false} dataKey="value" name="Production" radius={[0, 4, 4, 0]}>
                {providerData.map((_, i) => (
                  <Cell key={i} fill={CHART[i % CHART.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="New patients by source · booking channel">
          <div className="grid grid-cols-2 gap-2">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie isAnimationActive={false} data={sourceData} dataKey="value" nameKey="name" innerRadius={30} outerRadius={60} paddingAngle={2}>
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={CHART[i % CHART.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie isAnimationActive={false} data={channelData} dataKey="value" nameKey="name" innerRadius={30} outerRadius={60} paddingAngle={2}>
                  {channelData.map((_, i) => (
                    <Cell key={i} fill={CHART[i % CHART.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            {[...sourceData, ...channelData].map((d, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: CHART[i % CHART.length] }} />
                {d.name}: {d.value}
              </span>
            ))}
          </div>
        </Panel>
        </>
       )}
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
} as const;

function Kpi({
  icon,
  label,
  value,
  sub,
  tone = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "primary" | "accent";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className={tone === "accent" ? "text-accent" : "text-primary"}>{icon}</span>
        {label}
      </div>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {children}
    </div>
  );
}
