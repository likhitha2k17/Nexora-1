import { priorityOf, scoreOf } from "./risk";
import type { Finding } from "./types";

export function timeSeries(findings: Finding[], days: number, customRange?: { start: string; end: string }) {
  const end = customRange ? new Date(`${customRange.end}T23:59:59.999Z`).getTime() : Date.now();
  const start = customRange ? new Date(`${customRange.start}T00:00:00.000Z`).getTime() : end - days * 86400000;
  const rangeDays = customRange ? Math.max(1, Math.ceil((end - start + 1) / 86400000)) : days;
  const bucketDays = rangeDays <= 7 ? 1 : 7;
  const buckets = Math.ceil(rangeDays / bucketDays);
  const out: { label: string; profiles: number; apps: number }[] = [];
  for (let i = buckets - 1; i >= 0; i--) {
    const to = end - i * bucketDays * 86400000;
    const from = customRange ? Math.max(start, to - bucketDays * 86400000) : to - bucketDays * 86400000;
    const inB = findings.filter((f) => {
      const t = new Date(f.detectedAt).getTime();
      return (customRange ? t >= from : t > from) && t <= to;
    });
    out.push({
      label: new Date(to).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }),
      profiles: inB.filter((f) => f.kind === "profile").length,
      apps: inB.filter((f) => f.kind === "app").length,
    });
  }
  return out;
}

export function countBy<T>(items: T[], key: (t: T) => string) {
  const m = new Map<string, number>();
  items.forEach((i) => m.set(key(i), (m.get(key(i)) ?? 0) + 1));
  return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function priorityBreakdown(findings: Finding[]) {
  const order = ["Critical", "High", "Medium", "Low"] as const;
  return order.map((p) => ({ name: p, value: findings.filter((f) => priorityOf(scoreOf(f)) === p).length }));
}

export const PRIORITY_COLORS: Record<string, string> = {
  Critical: "var(--critical)",
  High: "var(--high)",
  Medium: "var(--medium)",
  Low: "var(--low)",
};
