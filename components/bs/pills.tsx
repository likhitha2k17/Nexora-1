import { cn } from "@/lib/utils";
import type { CaseStatus, FindingCategory, Priority, ReviewStatus } from "@/lib/types";
import { priorityOf } from "@/lib/risk";

const PRIORITY_CLS: Record<Priority, string> = {
  Critical: "bg-critical/10 text-critical border-critical/30",
  High: "bg-high/10 text-high border-high/30",
  Medium: "bg-medium/15 text-sample-foreground border-medium/40",
  Low: "bg-low/10 text-low border-low/30",
};

const DOT: Record<Priority, string> = {
  Critical: "bg-critical",
  High: "bg-high",
  Medium: "bg-medium",
  Low: "bg-low",
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", PRIORITY_CLS[priority], className)}>
      <span className={cn("size-1.5 rounded-full", DOT[priority])} aria-hidden />
      {priority}
    </span>
  );
}

export function RiskScore({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const p = priorityOf(score);
  if (size === "lg") {
    return (
      <div className="flex items-end gap-3">
        <div className="font-mono text-4xl font-semibold tabular leading-none">
          {score}
          <span className="text-lg text-muted-foreground"> / 100</span>
        </div>
        <PriorityBadge priority={p} />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2" title="Sample heuristic score">
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", DOT[p])} style={{ width: `${score}%` }} />
      </div>
      <span className="font-mono text-sm font-medium tabular">{score}</span>
    </div>
  );
}

const STATUS_CLS: Record<string, string> = {
  "Needs review": "bg-warning/15 text-sample-foreground",
  "Marked for review": "bg-primary/10 text-primary",
  Authorized: "bg-success/10 text-success",
  Official: "bg-success/10 text-success",
  Dismissed: "bg-muted text-muted-foreground",
  New: "bg-primary/10 text-primary",
  Investigating: "bg-high/10 text-high",
  "Ready for review": "bg-warning/15 text-sample-foreground",
  Resolved: "bg-success/10 text-success",
  Monitoring: "bg-primary/10 text-primary",
};

export function StatusBadge({ status }: { status: ReviewStatus | CaseStatus | "Monitoring" }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", STATUS_CLS[status])}>
      {status}
    </span>
  );
}

export function CategoryBadge({ category }: { category: FindingCategory }) {
  const safe = ["Official account", "Official app", "Authorized reseller"].includes(category);
  const fan = category === "Fan account";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs whitespace-nowrap",
        safe ? "border-success/30 text-success" : fan ? "border-primary/30 text-primary" : "border-border text-foreground",
      )}
    >
      {category}
    </span>
  );
}

export function EntityAvatar({ label, tone = "neutral", size = 36 }: { label: string; tone?: "neutral" | "danger" | "safe" | "brand"; size?: number }) {
  const initials = label
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const cls = {
    neutral: "bg-secondary text-secondary-foreground",
    danger: "bg-critical/10 text-critical",
    safe: "bg-success/10 text-success",
    brand: "bg-primary text-primary-foreground",
  }[tone];
  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-md font-semibold", cls)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
}
