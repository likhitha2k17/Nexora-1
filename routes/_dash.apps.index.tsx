import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader, Notice } from "@/components/bs/page";
import { CategoryBadge, EntityAvatar, PriorityBadge, RiskScore, StatusBadge } from "@/components/bs/pills";
import { FindingTable, type Column, type FilterDef } from "@/components/bs/finding-table";
import { findingMeta, useStore } from "@/lib/store";
import { isSuspicious } from "@/lib/risk";
import { fmtDate } from "@/lib/format";
import type { AppListing } from "@/lib/types";

export const Route = createFileRoute("/_dash/apps/")({
  head: () => ({
    meta: [
      { title: "App Monitoring — NEXORA" },
      { name: "description", content: "Review app listings that may imitate your brand's official apps." },
      { property: "og:title", content: "App Monitoring — NEXORA" },
      { property: "og:description", content: "Suspicious app listings compared to official apps." },
    ],
  }),
  component: AppsPage,
});

function AppsPage() {
  const { state } = useStore();
  const rows = useMemo(
    () => state.apps.filter((a) => state.selectedBrandId === "all" || a.brandId === state.selectedBrandId),
    [state.apps, state.selectedBrandId],
  );
  const brandName = (id: string) => state.brands.find((b) => b.id === id)?.name ?? id;

  const columns: Column<AppListing>[] = [
    {
      key: "name",
      label: "App",
      sort: (a) => a.name,
      render: (a) => (
        <span className="flex items-center gap-3">
          <EntityAvatar label={a.name} tone={isSuspicious(a) ? "danger" : "safe"} size={32} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{a.name}</span>
            <span className="block truncate font-mono text-xs text-muted-foreground">{a.packageId}</span>
          </span>
        </span>
      ),
    },
    { key: "store", label: "Store / source", sort: (a) => a.store, render: (a) => <span className="text-xs">{a.store}</span>, className: "hidden md:table-cell" },
    { key: "publisher", label: "Publisher", sort: (a) => a.publisher, render: (a) => a.publisher, className: "hidden lg:table-cell" },
    { key: "brand", label: "Claimed brand", sort: (a) => brandName(a.brandId), render: (a) => brandName(a.brandId), className: "hidden xl:table-cell" },
    { key: "category", label: "Category", render: (a) => <CategoryBadge category={a.category} />, className: "hidden md:table-cell" },
    { key: "score", label: "Risk", render: (a) => <RiskScore score={findingMeta(a).score} /> },
    { key: "priority", label: "Priority", sort: (a) => findingMeta(a).score, render: (a) => <PriorityBadge priority={findingMeta(a).priority} /> },
    { key: "checked", label: "Last checked", sort: (a) => a.lastChecked, render: (a) => <span className="text-xs">{fmtDate(a.lastChecked)}</span>, className: "hidden lg:table-cell" },
    { key: "status", label: "Review status", sort: (a) => a.status, render: (a) => <StatusBadge status={a.status} /> },
  ];

  const filters: FilterDef<AppListing>[] = [
    { key: "store", label: "Stores", options: Array.from(new Set(state.apps.map((a) => a.store))), get: (a) => a.store },
    { key: "priority", label: "Priorities", options: ["Critical", "High", "Medium", "Low"], get: (a) => findingMeta(a).priority },
    { key: "status", label: "Statuses", options: ["Needs review", "Marked for review", "Authorized", "Dismissed", "Official"], get: (a) => a.status },
  ];

  return (
    <>
      <PageHeader
        title="App Monitoring"
        crumbs={[{ label: "App Monitoring" }]}
        description={<>Store listings compared against registered official apps. </>}
      />
      <div className="mb-4"><Notice tone="warn">App-listing analysis does not establish whether an app contains malware.</Notice></div>
      <FindingTable rows={rows} columns={columns} filters={filters} searchText={(a) => `${a.name} ${a.packageId} ${a.publisher}`} />
    </>
  );
}
