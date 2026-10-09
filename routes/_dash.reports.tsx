import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel } from "@/components/bs/page";
import { StatusBadge } from "@/components/bs/pills";
import { allFindings, inRange, useStore } from "@/lib/store";
import { downloadText, findingsToCsv } from "@/lib/services";
import { findingLink } from "@/lib/links";
import { fmtDateTime } from "@/lib/format";
import type { Finding } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_dash/reports")({
  head: () => ({
    meta: [
      { title: "Reports — NEXORA" },
      { name: "description", content: "Findings by source, category and review status, with CSV export." },
      { property: "og:title", content: "Reports — NEXORA" },
      { property: "og:description", content: "Sample reporting with CSV export." },
    ],
  }),
  component: Reports,
});

function monitorStatus(finding: Finding): "Monitoring" | "Needs review" | "Resolved" {
  if (finding.status === "Dismissed") return "Resolved";
  if (finding.status === "Needs review" || finding.status === "Marked for review") return "Needs review";
  return "Monitoring";
}

function Reports() {
  const { state } = useStore();
  const [brand, setBrand] = useState(state.selectedBrandId);
  const [days, setDays] = useState("90");
  const [source, setSource] = useState("all");
  const findings = useMemo(
    () => allFindings(state).filter((f) =>
      (brand === "all" || f.brandId === brand) && inRange(f.detectedAt, Number(days)) &&
      (source === "all" || (source === "social" ? f.kind === "profile" : f.kind === "app"))),
    [state, brand, days, source],
  );
  const monitorRows = useMemo(() => [...findings].sort((a, b) => b.lastChecked.localeCompare(a.lastChecked)), [findings]);
  const bn = (id: string) => state.brands.find((b) => b.id === id)?.name ?? id;

  return (
    <>
      <PageHeader title="Reports" crumbs={[{ label: "Reports" }]} description="All values come from the same sample dataset."
        actions={<>
          <Button variant="outline" onClick={() => { downloadText("nexora-findings.csv", findingsToCsv(findings, bn)); toast.success(`Exported ${findings.length} findings`); }}><Download /> Export CSV</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer /> Print summary</Button>
        </>} />
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Select value={brand} onValueChange={setBrand}><SelectTrigger className="w-[170px]" aria-label="Brand"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All brands</SelectItem>{state.brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select>
        <Select value={days} onValueChange={setDays}><SelectTrigger className="w-[150px]" aria-label="Date range"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem></SelectContent></Select>
        <Select value={source} onValueChange={setSource}><SelectTrigger className="w-[160px]" aria-label="Source"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All sources</SelectItem><SelectItem value="social">Social platforms</SelectItem><SelectItem value="apps">App stores</SelectItem></SelectContent></Select>
        <span className="self-center text-xs text-muted-foreground">{findings.length} findings in scope</span>
      </div>
      <Panel title="Monitor">
        <p className="mb-4 text-sm text-muted-foreground">Track important brand activity and findings.</p>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Type/source</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Last checked</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {monitorRows.map((finding) => (
                <tr key={finding.id} className="hover:bg-muted/50">
                  <td className="px-3 py-2.5"><Link {...findingLink(finding)} className="font-medium hover:underline">{finding.kind === "profile" ? finding.displayName : finding.name}</Link></td>
                  <td className="px-3 py-2.5 text-muted-foreground">{finding.kind === "profile" ? finding.platform : finding.store}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={monitorStatus(finding)} /></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">{fmtDateTime(finding.lastChecked)}</td>
                </tr>
              ))}
              {monitorRows.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">No findings in this report scope.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
