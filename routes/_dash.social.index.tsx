import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/bs/page";
import { CategoryBadge, EntityAvatar, PriorityBadge, RiskScore, StatusBadge } from "@/components/bs/pills";
import { FindingTable, type Column, type FilterDef } from "@/components/bs/finding-table";
import { findingMeta, useStore } from "@/lib/store";
import { isSuspicious } from "@/lib/risk";
import { fmtDate } from "@/lib/format";
import type { SocialProfile } from "@/lib/types";

export const Route = createFileRoute("/_dash/social/")({
  head: () => ({
    meta: [
      { title: "Social Monitoring — NEXORA" },
      { name: "description", content: "Review suspicious social profiles claiming to represent your brand." },
      { property: "og:title", content: "Social Monitoring — NEXORA" },
      { property: "og:description", content: "Searchable, filterable list of social profile findings." },
    ],
  }),
  component: SocialPage,
});

function SocialPage() {
  const { state } = useStore();
  const rows = useMemo(
    () => state.profiles.filter((p) => state.selectedBrandId === "all" || p.brandId === state.selectedBrandId),
    [state.profiles, state.selectedBrandId],
  );
  const brandName = (id: string) => state.brands.find((b) => b.id === id)?.name ?? id;

  const columns: Column<SocialProfile>[] = [
    {
      key: "name",
      label: "Profile",
      sort: (p) => p.displayName,
      render: (p) => (
        <span className="flex items-center gap-3">
          <EntityAvatar label={p.displayName} tone={isSuspicious(p) ? "danger" : "safe"} size={32} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{p.displayName}</span>
            <span className="block truncate font-mono text-xs text-muted-foreground">@{p.username}</span>
          </span>
        </span>
      ),
    },
    { key: "platform", label: "Platform", sort: (p) => p.platform, render: (p) => p.platform },
    { key: "brand", label: "Claimed brand", sort: (p) => brandName(p.brandId), render: (p) => brandName(p.brandId), className: "hidden lg:table-cell" },
    { key: "category", label: "Category", render: (p) => <CategoryBadge category={p.category} />, className: "hidden md:table-cell" },
    { key: "score", label: "Risk", render: (p) => <RiskScore score={findingMeta(p).score} /> },
    { key: "priority", label: "Priority", sort: (p) => findingMeta(p).score, render: (p) => <PriorityBadge priority={findingMeta(p).priority} /> },
    { key: "signs", label: "Warning signs", sort: (p) => p.warnings.length, render: (p) => <span className="text-xs text-muted-foreground">{p.warnings.length ? `${p.warnings.length} · ${p.warnings[0]!.label}` : "—"}</span>, className: "hidden xl:table-cell" },
    { key: "checked", label: "Last checked", sort: (p) => p.lastChecked, render: (p) => <span className="text-xs">{fmtDate(p.lastChecked)}</span>, className: "hidden lg:table-cell" },
    { key: "status", label: "Review status", sort: (p) => p.status, render: (p) => <StatusBadge status={p.status} /> },
  ];

  const filters: FilterDef<SocialProfile>[] = [
    { key: "platform", label: "Platforms", options: Array.from(new Set(state.profiles.map((p) => p.platform))), get: (p) => p.platform },
  ];

  return (
    <>
      <PageHeader
        title="Social Monitoring"
        crumbs={[{ label: "Social Monitoring" }]}
        description={<>Profiles from the sample dataset that use brand names, logos or keywords. Risk is a sample heuristic score. </>}
      />
      <FindingTable rows={rows} columns={columns} filters={filters} searchText={(p) => `${p.displayName} ${p.username} ${p.bio}`} showDateFilter={false} />
    </>
  );
}
