import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, Panel, EmptyState } from "@/components/bs/page";
import { PriorityBadge, RiskScore, StatusBadge } from "@/components/bs/pills";
import { EvidenceItem } from "@/components/bs/finding-detail";
import { REVIEWERS } from "@/components/bs/case-dialogs";
import { CASE_STATUSES, allFindings, findingMeta, getFinding, useStore } from "@/lib/store";
import { findingTitle, isSuspicious } from "@/lib/risk";
import { findingLink } from "@/lib/links";
import { fmtDateTime } from "@/lib/format";
import type { CaseStatus, Finding } from "@/lib/types";

export const Route = createFileRoute("/_dash/cases/$caseId")({
  head: () => ({
    meta: [
      { title: "Case detail — NEXORA" },
      { name: "description", content: "Linked findings, evidence, notes and activity for an investigation case." },
      { property: "og:title", content: "Case detail — NEXORA" },
      { property: "og:description", content: "Investigation case detail." },
    ],
  }),
  component: CaseDetail,
});

function FindingRow({ f, onRemove }: { f: Finding; onRemove: () => void }) {
  const m = findingMeta(f);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Link {...findingLink(f)} className="min-w-0 flex-1 hover:underline">
        <p className="truncate text-sm font-medium">{findingTitle(f)}</p>
        <p className="text-xs text-muted-foreground">{f.kind === "profile" ? f.platform : f.store} · {f.category}</p>
      </Link>
      <RiskScore score={m.score} />
      <PriorityBadge priority={m.priority} className="hidden sm:inline-flex" />
      <Button variant="ghost" size="icon" aria-label={`Remove ${findingTitle(f)}`} onClick={onRemove}><Trash2 /></Button>
    </li>
  );
}

function CaseDetail() {
  const { caseId } = Route.useParams();
  const { state, updateCase, addFindingsToCase, removeFindingFromCase } = useStore();
  const c = state.cases.find((x) => x.id === caseId);
  const [notes, setNotes] = useState(c?.notes ?? "");
  const [addOpen, setAddOpen] = useState(false);
  const [pick, setPick] = useState<string[]>([]);
  useEffect(() => { setNotes(c?.notes ?? ""); }, [c?.id, c?.notes]);

  if (!c) return <EmptyState title="Case not found" body="It may have been removed when sample data was reset." action={<Button asChild><Link to="/cases">Back to cases</Link></Button>} />;

  const findings = c.findingIds.map((id) => getFinding(state, id)).filter((f): f is Finding => !!f);
  const profiles = findings.filter((f) => f.kind === "profile");
  const apps = findings.filter((f) => f.kind === "app");
  const evidence = findings.flatMap((f) => f.evidence);
  const candidates = allFindings(state).filter((f) => f.brandId === c.brandId && isSuspicious(f) && !c.findingIds.includes(f.id));
  const brand = state.brands.find((b) => b.id === c.brandId);

  return (
    <>
      <PageHeader
        title={c.title}
        crumbs={[{ label: "Cases & Evidence", to: "/cases" }, { label: c.id }]}
        description={<>{c.id} · {brand?.name} · created {fmtDateTime(c.createdAt)}</>}
        actions={<Button asChild><Link to="/report/$caseId" params={{ caseId: c.id }}><FileText /> Generate evidence report</Link></Button>}
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <Panel title="Summary"><p className="text-sm">{c.summary || "No summary."}</p></Panel>
          <Panel title={`Linked findings (${findings.length})`} action={<Button size="sm" variant="outline" onClick={() => { setPick([]); setAddOpen(true); }}><Plus /> Add findings</Button>}>
            {findings.length === 0 ? <p className="text-sm text-muted-foreground">No findings linked yet.</p> : (
              <div className="space-y-4">
                {[["Linked profiles", profiles], ["Linked apps", apps]].map(([label, list]) => (list as Finding[]).length > 0 && (
                  <div key={label as string}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label as string}</p>
                    <ul className="divide-y">
                      {(list as Finding[]).map((f) => <FindingRow key={f.id} f={f} onRemove={() => { removeFindingFromCase(c.id, f.id); toast("Finding removed"); }} />)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <Panel title={`Evidence (${evidence.length})`}>
            <div className="space-y-2">{evidence.length ? evidence.map((e) => <EvidenceItem key={e.id} e={e} />) : <p className="text-sm text-muted-foreground">No evidence yet.</p>}</div>
          </Panel>
        </div>
        <aside className="space-y-4">
          <Panel title="Case properties">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Priority</span><PriorityBadge priority={c.priority} /></div>
              <div className="space-y-1.5">
                <span className="text-muted-foreground">Status</span>
                <Select value={c.status} onValueChange={(v) => { updateCase(c.id, { status: v as CaseStatus }, `Status changed to ${v}`); toast.success(`Status: ${v}`); }}>
                  <SelectTrigger aria-label="Case status"><SelectValue /></SelectTrigger>
                  <SelectContent>{CASE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <span className="text-muted-foreground">Assignee</span>
                <Select value={c.assignee} onValueChange={(v) => updateCase(c.id, { assignee: v }, `Assigned to ${v}`)}>
                  <SelectTrigger aria-label="Assignee"><SelectValue /></SelectTrigger>
                  <SelectContent>{Array.from(new Set([state.settings.reviewerName, ...REVIEWERS, c.assignee])).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Current</span><StatusBadge status={c.status} /></div>
            </div>
          </Panel>
          <Panel title="Reviewer notes">
            <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Reviewer notes" />
            <Button size="sm" className="mt-2 w-full" disabled={notes === c.notes} onClick={() => { updateCase(c.id, { notes }, "Reviewer notes updated"); toast.success("Notes saved"); }}>Save notes</Button>
          </Panel>
          <Panel title="Activity timeline">
            <ol className="relative space-y-3 border-l pl-4">
              {[...c.activity].reverse().map((a, i) => (
                <li key={i} className="text-sm">
                  <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full border-2 border-card bg-primary" />
                  <p>{a.text}</p>
                  <p className="text-[11px] text-muted-foreground">{a.by} · {fmtDateTime(a.at)}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </aside>
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add findings to {c.id}</DialogTitle></DialogHeader>
          {candidates.length === 0 ? <p className="text-sm text-muted-foreground">All suspicious findings for this brand are already linked.</p> : (
            <ul className="max-h-72 space-y-1 overflow-auto">
              {candidates.map((f) => (
                <li key={f.id}>
                  <label className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-muted">
                    <Checkbox checked={pick.includes(f.id)} onCheckedChange={(v) => setPick((p) => (v ? [...p, f.id] : p.filter((x) => x !== f.id)))} />
                    <span className="flex-1 truncate text-sm">{findingTitle(f)}</span>
                    <span className="font-mono text-xs">{findingMeta(f).score}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button disabled={!pick.length} onClick={() => { addFindingsToCase(c.id, pick); setAddOpen(false); toast.success(`${pick.length} finding(s) added`); }}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
