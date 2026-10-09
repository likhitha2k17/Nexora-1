import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Notice } from "@/components/bs/page";
import { EntityAvatar } from "@/components/bs/pills";
import { BrandFormDialog } from "@/components/bs/brand-form";
import { allFindings, useStore } from "@/lib/store";
import { isSuspicious } from "@/lib/risk";

export const Route = createFileRoute("/_dash/brands/")({
  head: () => ({
    meta: [
      { title: "Brand Registry — NEXORA" },
      { name: "description", content: "Registered brands with official domains, handles and apps." },
      { property: "og:title", content: "Brand Registry — NEXORA" },
      { property: "og:description", content: "Manage the brands NEXORA monitors." },
    ],
  }),
  component: Brands,
});

function Brands() {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const findings = allFindings(state);
  return (
    <>
      <PageHeader title="Brand Registry" crumbs={[{ label: "Brand Registry" }]} description="Official assets used to tell authorized accounts apart from suspicious ones."
        actions={<Button onClick={() => setOpen(true)}><Plus /> Add brand</Button>} />
      <div className="mb-4"><Notice>User-supplied brand information has not been independently verified.</Notice></div>
      <div className="grid gap-3 md:grid-cols-2">
        {state.brands.map((b) => {
          const n = findings.filter((f) => f.brandId === b.id && isSuspicious(f)).length;
          return (
            <Link key={b.id} to="/brands/$brandId" params={{ brandId: b.id }} className="flex gap-4 rounded-lg border bg-card p-4 hover:border-primary/40">
              <EntityAvatar label={b.name} tone="brand" size={44} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.industry}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div><p className="font-mono text-base">{b.approvedDomains.length}</p>domains</div>
                  <div><p className="font-mono text-base">{b.socialHandles.length}</p>handles</div>
                  <div><p className="font-mono text-base">{n}</p>findings</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <BrandFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
