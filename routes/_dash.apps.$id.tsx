import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState, Notice, Panel } from "@/components/bs/page";
import { FindingDetail, Flag, SignalBar } from "@/components/bs/finding-detail";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_dash/apps/$id")({
  head: () => ({
    meta: [
      { title: "App listing review — NEXORA" },
      { name: "description", content: "Compare a suspicious app listing with the official app." },
      { property: "og:title", content: "App listing review — NEXORA" },
      { property: "og:description", content: "Official vs. suspicious app listing comparison and evidence." },
    ],
  }),
  component: AppDetail,
});

function AppDetail() {
  const { id } = Route.useParams();
  const { state } = useStore();
  const a = state.apps.find((x) => x.id === id);
  const brand = state.brands.find((b) => b.id === a?.brandId);
  if (!a || !brand) {
    return <EmptyState title="App listing not found" action={<Button asChild><Link to="/apps">Back to App Monitoring</Link></Button>} />;
  }
  const off = brand.officialApps.find(app => app.packageId === a.packageId) ?? brand.officialApps[0];
  return (
    <>
      <PageHeader title={a.name} crumbs={[{ label: "App Monitoring", to: "/apps" }, { label: a.name }]} description={`${a.store} · ${a.packageId}`} />
      <div className="mb-4"><Notice tone="warn">App-listing analysis does not establish whether an app contains malware.</Notice></div>
      <FindingDetail
        finding={a}
        comparison={[
          { label: "App name", official: off?.name ?? "—", suspicious: a.name },
          { label: "Publisher", official: brand.publishers.join(", "), suspicious: a.publisher, mismatch: a.signals.publisherMismatch },
          { label: "Package ID", official: <span className="font-mono text-xs">{off?.packageId}</span>, suspicious: <span className="font-mono text-xs">{a.packageId}</span>, mismatch: a.category !== "Official app" },
          { label: "Website", official: <span className="font-mono text-xs">{brand.website}</span>, suspicious: <span className="font-mono text-xs">{a.website || "Not listed"}</span>, mismatch: a.signals.domainMismatch },
          { label: "Privacy-policy domain", official: <span className="font-mono text-xs">{brand.approvedDomains[0]}</span>, suspicious: <span className="font-mono text-xs">{a.privacyDomain || "Not listed"}</span>, mismatch: a.signals.domainMismatch },
          { label: "Description", official: <span className="text-xs text-muted-foreground">Official listing</span>, suspicious: <span className="text-xs">{a.description}</span>, mismatch: a.signals.suspiciousWording },
        ]}
        signals={
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <SignalBar label="Name similarity" value={a.signals.nameSimilarity} />
              {a.provenance === "scrappa" ? <p className="text-xs text-muted-foreground">Icon similarity: not analyzed</p> : <SignalBar label="Icon similarity" value={a.signals.iconSimilarity} />}
            </div>
            <div className="space-y-1.5">
              <Flag label="Publisher mismatch" on={a.signals.publisherMismatch} />
              <Flag label="Website / privacy domain mismatch" on={a.signals.domainMismatch} />
              <Flag label="Suspicious description wording" on={a.signals.suspiciousWording} />
            </div>
          </div>
        }
        extra={
          a.permissions?.length ? (
            <Panel title="Declared permissions (from sample listing)">
              <ul className="flex flex-wrap gap-2">
                {a.permissions.map((p) => <li key={p} className="rounded border px-2 py-1 text-xs">{p}</li>)}
              </ul>
            </Panel>
          ) : null
        }
      />
    </>
  );
}
