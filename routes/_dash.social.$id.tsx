import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/bs/page";
import { FindingDetail, Flag, SignalBar } from "@/components/bs/finding-detail";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_dash/social/$id")({
  head: () => ({
    meta: [
      { title: "Profile investigation — NEXORA" },
      { name: "description", content: "Side-by-side comparison, warning signs and evidence for a suspicious social profile." },
      { property: "og:title", content: "Profile investigation — NEXORA" },
      { property: "og:description", content: "Investigate a suspicious social profile." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { id } = Route.useParams();
  const { state } = useStore();
  const p = state.profiles.find((x) => x.id === id);
  const brand = state.brands.find((b) => b.id === p?.brandId);

  useEffect(() => {
    if (window.location.hash === "#why") document.getElementById("why")?.scrollIntoView({ behavior: "smooth" });
  }, [id]);

  if (!p || !brand) {
    return <EmptyState title="Profile not found" body="It may have been removed when sample data was reset." action={<Button asChild><Link to="/social">Back to Social Monitoring</Link></Button>} />;
  }

  const official = brand.socialHandles.find((h) => h.platform === p.platform) ?? brand.socialHandles[0];
  const urlHost = p.url ? new URL(p.url).hostname : "";
  const domainOk = !urlHost || brand.approvedDomains.includes(urlHost);

  return (
    <>
      <PageHeader
        title={`${p.displayName}`}
        crumbs={[{ label: "Social Monitoring", to: "/social" }, { label: `@${p.username}` }]}
        description={`${p.platform} · @${p.username} · ${p.followers.toLocaleString()} followers · account created ${p.accountCreated}`}
      />
      <FindingDetail
        finding={p}
        comparison={[
          { label: "Display name", official: brand.name, suspicious: p.displayName },
          { label: "Handle", official: official ? `@${official.handle} (${official.platform})` : "—", suspicious: `@${p.username} (${p.platform})`, mismatch: p.signals.unrecognized },
          { label: "Bio", official: <span className="text-xs text-muted-foreground">Registered official presence</span>, suspicious: <span className="text-xs">{p.bio}</span> },
          { label: "Supplied URL", official: <span className="font-mono text-xs">{brand.approvedDomains.join(", ")}</span>, suspicious: <span className="font-mono text-xs">{p.url || "None supplied"}</span>, mismatch: !domainOk },
        ]}
        signals={
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <SignalBar label="Name similarity" value={p.signals.nameSimilarity} />
              <SignalBar label="Logo similarity" value={p.signals.logoSimilarity} />
            </div>
            <div className="space-y-1.5">
              <Flag label="Domain mismatch" on={p.signals.domainMismatch} />
              <Flag label="Support / verification claim" on={p.signals.supportClaim} />
              <Flag label="Suspicious request (codes, wallet, card)" on={p.signals.suspiciousRequest} />
              <Flag label="Not a registered handle" on={p.signals.unrecognized} />
            </div>
          </div>
        }
      />
    </>
  );
}
