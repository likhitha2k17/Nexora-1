import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findingMeta, getFinding, useStore } from "@/lib/store";
import { findingTitle } from "@/lib/risk";
import { fmtDateTime } from "@/lib/format";
import type { Finding } from "@/lib/types";

export const Route = createFileRoute("/report/$caseId")({
  head: () => ({
    meta: [
      { title: "Evidence report — NEXORA" },
      { name: "description", content: "Print-friendly investigation evidence report." },
      { property: "og:title", content: "Evidence report — NEXORA" },
      { property: "og:description", content: "Print-friendly investigation evidence report." },
    ],
  }),
  component: Report,
});

function Report() {
  const { caseId } = Route.useParams();
  const { state } = useStore();
  const c = state.cases.find((x) => x.id === caseId);
  if (!c) return <div className="p-10 text-center"><p>Case not found.</p><Link to="/cases" className="text-primary underline">Back to cases</Link></div>;
  const brand = state.brands.find((b) => b.id === c.brandId);
  const findings = c.findingIds.map((id) => getFinding(state, id)).filter((f): f is Finding => !!f);
  const now = new Date().toISOString();

  return (
    <div className="min-h-screen bg-muted print:bg-card">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-2 print:hidden">
        <Button variant="ghost" size="sm" asChild><Link to="/cases/$caseId" params={{ caseId: c.id }}><ArrowLeft /> Back to case</Link></Button>
        <Button size="sm" onClick={() => window.print()}><Printer /> Print / Save as PDF</Button>
      </div>
      <article className="mx-auto my-8 max-w-[820px] bg-card p-10 shadow-sm print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b-2 border-foreground pb-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"><ShieldCheck className="size-4" /> NEXORA · Investigation evidence report</p>
            <h1 className="mt-2 text-2xl font-semibold">{c.title}</h1>
          </div>
        </header>

        <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
          {[["Case ID", c.id], ["Brand", brand?.name], ["Priority", c.priority], ["Status", c.status], ["Assigned reviewer", c.assignee], ["Report generated", fmtDateTime(now)]].map(([k, v]) => (
            <div key={k}><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
          ))}
        </dl>

        <section className="mt-6">
          <h2 className="border-b pb-1 text-sm font-semibold uppercase tracking-wider">Investigation summary</h2>
          <p className="mt-2 text-sm">{c.summary || "—"}</p>
        </section>

        <section className="mt-6">
          <h2 className="border-b pb-1 text-sm font-semibold uppercase tracking-wider">Findings ({findings.length})</h2>
          <table className="mt-2 w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground"><th className="py-1.5">Finding</th><th>Source</th><th>Risk score*</th><th>Priority</th><th>Status</th></tr></thead>
            <tbody className="divide-y border-t">
              {findings.map((f) => { const m = findingMeta(f); return (
                <tr key={f.id}><td className="py-1.5 pr-2">{findingTitle(f)}</td><td className="pr-2">{f.kind === "profile" ? f.platform : f.store}</td><td className="font-mono">{m.score}/100</td><td>{m.priority}</td><td>{f.status}</td></tr>
              ); })}
            </tbody>
          </table>
          <p className="mt-1 text-[11px] text-muted-foreground">*Rule-based review score — weighted indicators, not a probability.</p>
        </section>

        <section className="mt-6">
          <h2 className="border-b pb-1 text-sm font-semibold uppercase tracking-wider">Evidence</h2>
          {findings.map((f) => (
            <div key={f.id} className="mt-3 break-inside-avoid">
              <p className="text-sm font-semibold">{findingTitle(f)}</p>
              {f.warnings.length > 0 && <p className="text-xs text-muted-foreground">Warning signs: {f.warnings.map((w) => w.label).join("; ")}</p>}
              <ol className="mt-1.5 space-y-1.5">
                {f.evidence.map((e, i) => (
                  <li key={e.id} className="rounded border p-2 text-xs">
                    <p className="font-medium">E{i + 1}. {e.title} <span className="font-normal text-muted-foreground">({e.type})</span></p>
                    <p className="mt-0.5 font-mono">{e.content}</p>
                    <p className="mt-0.5 text-muted-foreground">Source: {e.source} · Captured: {fmtDateTime(e.capturedAt)}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>

        <section className="mt-6 break-inside-avoid">
          <h2 className="border-b pb-1 text-sm font-semibold uppercase tracking-wider">Reviewer notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm">{c.notes || "No notes recorded."}</p>
        </section>

        <footer className="mt-8 border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
          Disclaimer: Findings in this report are indicators for human review. They do not establish that any account, app or domain is fraudulent,
          nor do shared indicators prove common ownership. This report may include prepared fictional samples and retrieved listings. Check the source recorded with each item of evidence. It has not been submitted to any platform or authority.
        </footer>
      </article>
    </div>
  );
}
