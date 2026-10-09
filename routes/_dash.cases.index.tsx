import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, EmptyState } from "@/components/bs/page";
import { PriorityBadge, StatusBadge } from "@/components/bs/pills";
import { CreateCaseDialog } from "@/components/bs/case-dialogs";
import { CASE_STATUSES, useStore } from "@/lib/store";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_dash/cases/")({
  head: () => ({
    meta: [
      { title: "Cases & Evidence — NEXORA" },
      { name: "description", content: "Track investigation cases, linked findings and evidence." },
      { property: "og:title", content: "Cases & Evidence — NEXORA" },
      { property: "og:description", content: "Investigation case management." },
    ],
  }),
  component: CasesPage,
});

function CasesPage() {
  const { state } = useStore();
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const rows = useMemo(
    () => state.cases
      .filter((c) => (state.selectedBrandId === "all" || c.brandId === state.selectedBrandId) && (status === "all" || c.status === status))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [state, status],
  );
  return (
    <>
      <PageHeader title="Cases & Evidence" crumbs={[{ label: "Cases & Evidence" }]} description="Cases group related findings and evidence for review."
        actions={<Button onClick={() => setOpen(true)}><FolderPlus /> Create case</Button>} />
      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b p-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[180px]" aria-label="Status"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All statuses</SelectItem>{CASE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} case(s)</span>
        </div>
        {rows.length === 0 ? <EmptyState title="No cases" body="Create a case from a finding or with the button above." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                {["Case ID", "Title", "Brand", "Priority", "Assigned", "Status", "Findings", "Updated"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2.5 font-medium">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y">
                {rows.map((c) => (
                  <tr key={c.id} className="relative hover:bg-muted/50">
                    <td className="px-3 py-2.5 font-mono text-xs"><Link to="/cases/$caseId" params={{ caseId: c.id }} className="after:absolute after:inset-0">{c.id}</Link></td>
                    <td className="px-3 py-2.5 font-medium">{c.title}</td>
                    <td className="px-3 py-2.5">{state.brands.find((b) => b.id === c.brandId)?.name}</td>
                    <td className="px-3 py-2.5"><PriorityBadge priority={c.priority} /></td>
                    <td className="whitespace-nowrap px-3 py-2.5">{c.assignee}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={c.status} /></td>
                    <td className="px-3 py-2.5 font-mono">{c.findingIds.length}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs">{fmtDate(c.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <CreateCaseDialog open={open} onOpenChange={setOpen} findingIds={[]} defaultTitle="" />
    </>
  );
}
