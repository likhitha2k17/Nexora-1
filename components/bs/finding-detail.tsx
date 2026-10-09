import { useState, type ReactNode } from "react";
import { AlertTriangle, ChevronDown, FileText, HelpCircle } from "lucide-react";
import { Panel, Notice } from "./page";
import { CategoryBadge, EntityAvatar, PriorityBadge, RiskScore, StatusBadge } from "./pills";
import { FindingActions } from "./finding-actions";
import { findingMeta, getFinding, useStore } from "@/lib/store";
import { isSuspicious } from "@/lib/risk";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Evidence, Finding } from "@/lib/types";

export function EvidenceItem({ e }: { e: Evidence }) {
  return (
    <div className="rounded-md border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{e.title}</p>
        <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground">{e.type}</span>
      </div>
      <p className="mt-1.5 font-mono text-xs leading-relaxed">{e.content}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Source: {e.source} · Captured {fmtDateTime(e.capturedAt)}
      </p>
    </div>
  );
}

function WarningRow({ label, detail, evidence }: { label: string; detail: string; evidence: Evidence[] }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-md border bg-card">
      <button
        className="flex w-full items-start gap-3 p-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-high" />
        <span className="flex-1">
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-muted-foreground">{detail}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs text-primary">
          {open ? "Hide" : "View"} evidence <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <div className="space-y-2 border-t p-3">
          {evidence.length ? evidence.map((e) => <EvidenceItem key={e.id} e={e} />) : <p className="text-xs text-muted-foreground">No evidence item attached.</p>}
        </div>
      )}
    </li>
  );
}

export function SignalBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-mono">{value.toFixed(2)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", value >= 0.8 ? "bg-critical" : value >= 0.6 ? "bg-high" : "bg-medium")} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

export function Flag({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between rounded border px-2.5 py-1.5 text-xs">
      <span>{label}</span>
      <span className={cn("font-medium", on ? "text-critical" : "text-muted-foreground")}>{on ? "Observed" : "Not observed"}</span>
    </div>
  );
}

export function FindingDetail({
  finding,
  comparison,
  signals,
  extra,
}: {
  finding: Finding;
  comparison: { label: string; official: ReactNode; suspicious: ReactNode; mismatch?: boolean }[];
  signals: ReactNode;
  extra?: ReactNode;
}) {
  const { state } = useStore();
  const m = findingMeta(finding);
  const brand = state.brands.find((b) => b.id === finding.brandId);
  const name = finding.kind === "profile" ? finding.displayName : finding.name;
  const susp = isSuspicious(finding);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-4">
        <Notice>{finding.provenance === "scrappa" ? "Source: Google Play listing via Scrappa. Rule-based assessment; no AI, icon comparison, or malware analysis." : "Source: prepared fictional sample record."}</Notice>
        {/* side-by-side */}
        <Panel title="Official brand vs. this finding" bodyClass="p-0">
          <div className="grid grid-cols-[110px_1fr_1fr] border-b bg-muted/40 text-xs font-medium sm:grid-cols-[150px_1fr_1fr]">
            <div className="p-3" />
            <div className="flex items-center gap-2 border-l p-3">
              <EntityAvatar label={brand?.name ?? "?"} tone="brand" size={28} />
              <span>Official — {brand?.name}</span>
            </div>
            <div className="flex items-center gap-2 border-l p-3">
              <EntityAvatar label={name} tone={susp ? "danger" : "safe"} size={28} />
              <span className="truncate">{name}</span>
            </div>
          </div>
          {comparison.map((r) => (
            <div key={r.label} className="grid grid-cols-[110px_1fr_1fr] border-b text-sm last:border-b-0 sm:grid-cols-[150px_1fr_1fr]">
              <div className="p-3 text-xs text-muted-foreground">{r.label}</div>
              <div className="break-words border-l p-3">{r.official}</div>
              <div className={cn("break-words border-l p-3", r.mismatch && "bg-critical/5 text-critical")}>{r.suspicious}</div>
            </div>
          ))}
        </Panel>

        {finding.warnings.length > 0 && (
          <section id="why" className="scroll-mt-20 rounded-lg border-2 border-high/40 bg-high/5 p-4">
            <h2 className="text-sm font-bold uppercase tracking-wider">Why this finding needs review</h2>
            <p className="mb-3 mt-1 text-xs text-muted-foreground">
              {finding.warnings.length} warning sign(s). These are indicators for a human reviewer — they do not establish that the account is fraudulent.
            </p>
            <ol className="space-y-2">
              {finding.warnings.map((wg) => (
                <WarningRow key={wg.id} label={wg.label} detail={wg.detail} evidence={finding.evidence.filter((e) => wg.evidenceIds.includes(e.id))} />
              ))}
            </ol>
          </section>
        )}

        <Panel title="Signal analysis">
          {signals}
        </Panel>

        {extra}

        <Panel title={`Evidence (${finding.evidence.length})`}>
          <div className="space-y-2">{finding.evidence.map((e) => <EvidenceItem key={e.id} e={e} />)}</div>
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><HelpCircle className="size-4" /> Missing information</span>}>
          {finding.missingInfo.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {finding.missingInfo.map((x) => <li key={x}>{x}</li>)}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No gaps recorded.</p>
          )}
        </Panel>
      </div>

      <aside className="space-y-4">
        <Panel>
          <p className="text-xs font-medium text-muted-foreground">Risk Score</p>
          <div className="mt-2"><RiskScore score={m.score} size="lg" /></div>
          <p className="mt-2 text-[11px] text-muted-foreground">Rule-based heuristic score — a weighted sum of indicators, not a probability or AI prediction.</p>
          <dl className="mt-4 space-y-2 border-t pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Priority</dt><dd><PriorityBadge priority={m.priority} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Review status</dt><dd><StatusBadge status={finding.status} /></dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Category</dt><dd><CategoryBadge category={finding.category} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Detected</dt><dd className="text-xs">{fmtDateTime(finding.detectedAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Last checked</dt><dd className="text-xs">{fmtDateTime(finding.lastChecked)}</dd></div>
          </dl>
        </Panel>
        <Panel title="Reviewer actions">
          <FindingActions finding={finding} />
        </Panel>
        <Notice>
          <FileText className="mr-1 inline size-3" />
          Language guide: “suspected”, “suspicious”, “needs review”. Brand-registry data is user-supplied and not independently verified.
        </Notice>
      </aside>
    </div>
  );
}

export function useFindingOrNull(id: string) {
  const { state } = useStore();
  return getFinding(state, id) ?? null;
}
