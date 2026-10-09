import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Notice, EmptyState } from "@/components/bs/page";
import { PriorityBadge, StatusBadge } from "@/components/bs/pills";
import { BrandFormDialog } from "@/components/bs/brand-form";
import { allFindings, findingMeta, useStore } from "@/lib/store";
import { findingTitle } from "@/lib/risk";
import { findingLink } from "@/lib/links";

export const Route = createFileRoute("/_dash/brands/$brandId")({
  head: () => ({
    meta: [
      { title: "Brand details — NEXORA" },
      { name: "description", content: "Official assets, keywords, authorized accounts and related findings for a brand." },
      { property: "og:title", content: "Brand details — NEXORA" },
      { property: "og:description", content: "Brand registry detail." },
    ],
  }),
  component: BrandDetail,
});

const Chips = ({ items }: { items: string[] }) =>
  items.length ? <ul className="flex flex-wrap gap-1.5">{items.map((i) => <li key={i} className="rounded border bg-muted/50 px-2 py-0.5 font-mono text-xs">{i}</li>)}</ul> : <p className="text-sm text-muted-foreground">None recorded.</p>;

function BrandDetail() {
  const { brandId } = Route.useParams();
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const b = state.brands.find((x) => x.id === brandId);
  if (!b) return <EmptyState title="Brand not found" action={<Button asChild><Link to="/brands">Back</Link></Button>} />;
  const findings = allFindings(state).filter((f) => f.brandId === b.id).sort((x, y) => findingMeta(y).score - findingMeta(x).score);
  return (
    <>
      <PageHeader title={b.name} crumbs={[{ label: "Brand Registry", to: "/brands" }, { label: b.name }]} description={`${b.industry} · ${b.website || "no website"}`}
        actions={<Button variant="outline" onClick={() => setOpen(true)}><Pencil /> Edit brand</Button>} />
      <div className="mb-4"><Notice>User-supplied brand information has not been independently verified.</Notice></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Official assets">
          <div className="space-y-3">
            <div><p className="mb-1 text-xs text-muted-foreground">Approved domains</p><Chips items={b.approvedDomains} /></div>
            <div><p className="mb-1 text-xs text-muted-foreground">Official apps</p><Chips items={b.officialApps.map((a) => `${a.name} · ${a.packageId}`)} /></div>
            <div><p className="mb-1 text-xs text-muted-foreground">Publishers</p><Chips items={b.publishers} /></div>
            <div><p className="mb-1 text-xs text-muted-foreground">Aliases</p><Chips items={b.aliases} /></div>
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel title="Authorized accounts">
            <div className="space-y-3">
              <div><p className="mb-1 text-xs text-muted-foreground">Official handles</p><Chips items={b.socialHandles.map((h) => `${h.platform} @${h.handle}`)} /></div>
              <div><p className="mb-1 text-xs text-muted-foreground">Partners / resellers</p><Chips items={b.partners} /></div>
            </div>
          </Panel>
          <Panel title="Monitoring keywords"><Chips items={b.keywords} /></Panel>
        </div>
        <Panel title={`Related findings (${findings.length})`} className="lg:col-span-2" bodyClass="p-0">
          {findings.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No findings for this brand in the sample dataset.</p> : (
            <ul className="divide-y">
              {findings.map((f) => (
                <li key={f.id}><Link {...findingLink(f)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50">
                  <span className="min-w-0 flex-1 truncate">{findingTitle(f)}</span>
                  <PriorityBadge priority={findingMeta(f).priority} />
                  <StatusBadge status={f.status} />
                </Link></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <BrandFormDialog open={open} onOpenChange={setOpen} brand={b} />
    </>
  );
}
