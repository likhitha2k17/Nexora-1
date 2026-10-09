import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Panel, PageHeader } from "@/components/bs/page";
import { EntityAvatar, PriorityBadge, RiskScore, StatusBadge } from "@/components/bs/pills";
import { findingMeta, useScopedFindings, useStore } from "@/lib/store";
import { countBy, priorityBreakdown, PRIORITY_COLORS, timeSeries } from "@/lib/analytics";
import { findingTitle, isSuspicious } from "@/lib/risk";
import { fmtDate } from "@/lib/format";
import { findingLink } from "@/lib/links";

export const Route = createFileRoute("/_dash/overview")({
  head: () => ({
    meta: [
      { title: "Overview — NEXORA" },
      { name: "description", content: "Security situation for the selected brand: findings, priorities and open cases." },
      { property: "og:title", content: "Overview — NEXORA" },
      { property: "og:description", content: "Brand risk overview with sample findings, priorities and cases." },
    ],
  }),
  component: Overview,
});

function Stat({ label, value, tone }: { label: string; value: number; tone?: "critical" | "warn" }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-2 font-mono text-3xl font-semibold tabular ${tone === "critical" ? "text-critical" : tone === "warn" ? "text-high" : ""}`}>{value}</p>
    </div>
  );
}

const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 };

function Overview() {
  const { state } = useStore();
  const all = useScopedFindings();
  const ranged = useScopedFindings({ useRange: true });
  const brand = state.brands.find((b) => b.id === state.selectedBrandId);
  const rangeLabel = state.customDateRange
    ? `${fmtDate(state.customDateRange.start)} – ${fmtDate(state.customDateRange.end)}`
    : `Last ${state.dateRange} days`;

  const stats = useMemo(() => {
    const suspicious = all.filter(isSuspicious);
    return {
      profiles: all.filter((f) => f.kind === "profile").length,
      apps: all.filter((f) => f.kind === "app").length,
      review: suspicious.filter((f) => f.status === "Needs review" || f.status === "Marked for review").length,
      high: suspicious.filter((f) => ["Critical", "High"].includes(findingMeta(f).priority) && f.status !== "Dismissed" && f.status !== "Authorized").length,
      cases: state.cases.filter((c) => (state.selectedBrandId === "all" || c.brandId === state.selectedBrandId) && !["Resolved", "Dismissed"].includes(c.status)).length,
      domains: state.domains.filter((d) => state.selectedBrandId === "all" || d.brandId === state.selectedBrandId).length,
    };
  }, [all, state]);

  const top = useMemo(
    () =>
      all
        .filter((f) => isSuspicious(f) && f.status !== "Dismissed" && f.status !== "Authorized")
        .sort((a, b) => findingMeta(b).score - findingMeta(a).score)
        .slice(0, 5),
    [all],
  );
  const recent = useMemo(() => [...ranged].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt)).slice(0, 6), [ranged]);
  const series = useMemo(() => timeSeries(ranged, state.dateRange, state.customDateRange ?? undefined), [ranged, state.dateRange, state.customDateRange]);
  const byCat = useMemo(() => countBy(ranged.filter(isSuspicious), (f) => f.category), [ranged]);
  const byPri = useMemo(() => priorityBreakdown(ranged.filter(isSuspicious)), [ranged]);
  const startTarget = top.find((f) => f.id === "sp-1") ?? top[0];

  return (
    <>
      <PageHeader
        title={brand ? `${brand.name} overview` : "All brands overview"}
        crumbs={[{ label: "Overview" }]}
        description="Your brand findings, priorities and investigations."
        actions={
          startTarget ? (
            <Button size="lg" asChild>
              <Link {...findingLink(startTarget)}>
                <Search /> Start investigation <ArrowRight />
              </Link>
            </Button>
          ) : null
        }
      />

      <p className="mb-3 text-xs text-muted-foreground">This view includes {all.filter(f => f.provenance === "scrappa").length} retrieved listings and {all.filter(f => f.provenance !== "scrappa").length} prepared sample records.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Profiles analyzed" value={stats.profiles} />
        <Stat label="App listings analyzed" value={stats.apps} />
        <Stat label="Findings needing review" value={stats.review} tone="warn" />
        <Stat label="High-priority findings" value={stats.high} tone="critical" />
        <Stat label="Open cases" value={stats.cases} />
        <Stat label="Suspicious domains" value={stats.domains} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Highest-priority investigations" className="lg:col-span-2" bodyClass="p-0" action={<Link to="/social" className="text-xs text-primary hover:underline">View all</Link>}>
          {top.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No open suspicious findings for this brand.</p>
          ) : (
            <ul className="divide-y">
              {top.map((f) => {
                const m = findingMeta(f);
                return (
                  <li key={f.id}>
                    <Link {...findingLink(f)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60">
                      <EntityAvatar label={f.kind === "profile" ? f.displayName : f.name} tone="danger" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{findingTitle(f)}</p>
                        <p className="truncate text-xs text-muted-foreground">{f.kind === "profile" ? f.platform : f.store} · {f.category}</p>
                      </div>
                      <RiskScore score={m.score} />
                      <PriorityBadge priority={m.priority} className="hidden sm:inline-flex" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Priority breakdown" action={<span className="text-[11px] text-muted-foreground">{rangeLabel}</span>}>
          <div className="h-44">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byPri} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {byPri.map((p) => <Cell key={p.name} fill={PRIORITY_COLORS[p.name]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
            {byPri.map((p) => (
              <li key={p.name} className="flex items-center justify-between rounded bg-muted px-2 py-1">
                <PriorityBadge priority={p.name as "Critical"} />
                <span className="font-mono">{p.value}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Findings over time">
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={series}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="profiles" name="Social profiles" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="apps" name="App listings" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Suspicious findings by category">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={byCat} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="value" name="Findings" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Recent findings" className="lg:col-span-3" bodyClass="p-0">
          {recent.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No findings for {rangeLabel}. Widen the date range in the header.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((f) => (
                <li key={f.id}>
                  <Link {...findingLink(f)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/60">
                    <span className="w-28 shrink-0 text-xs text-muted-foreground">{fmtDate(f.detectedAt)}</span>
                    <span className="min-w-0 flex-1 truncate">{findingTitle(f)}</span>
                    <StatusBadge status={f.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
