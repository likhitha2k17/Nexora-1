/**
 * Service layer. Every function here is a local stand-in for a future backend call.
 * Swap implementations for real API requests without changing the UI.
 */
import { SAMPLE_APPS, SAMPLE_PROFILES } from "./sample-data";
import { appScore, priorityOf, profileScore } from "./risk";
import type { AppListing, Finding, SocialProfile } from "./types";
import { scoreOf } from "./risk";

export type AnalysisResult =
  | { kind: "prepared"; finding: SocialProfile | AppListing; score: number; priority: ReturnType<typeof priorityOf> }
  | { kind: "unavailable" };

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Simulated analysis: returns a prepared result only for known sample samples. Never fetches submitted URLs. */
export async function runSampleAnalysis(
  type: "profile" | "app",
  key: string,
): Promise<AnalysisResult> {
  await delay(1100);
  const k = key.trim().toLowerCase().replace(/^@/, "");
  if (type === "profile") {
    const p = SAMPLE_PROFILES.find((x) => x.username.toLowerCase() === k);
    if (p) return { kind: "prepared", finding: p, score: profileScore(p), priority: priorityOf(profileScore(p)) };
  } else {
    const a = SAMPLE_APPS.find((x) => x.packageId.toLowerCase() === k);
    if (a) return { kind: "prepared", finding: a, score: appScore(a), priority: priorityOf(appScore(a)) };
  }
  return { kind: "unavailable" };
}

export function findingsToCsv(findings: Finding[], brandName: (id: string) => string) {
  const head = ["id", "type", "name", "platform_or_store", "brand", "category", "risk_score", "priority", "status", "detected_at"];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = findings.map((f) => {
    const s = scoreOf(f);
    return [
      f.id,
      f.kind,
      f.kind === "profile" ? `${f.displayName} (@${f.username})` : f.name,
      f.kind === "profile" ? f.platform : f.store,
      brandName(f.brandId),
      f.category,
      s,
      priorityOf(s),
      f.status,
      f.detectedAt,
    ].map(esc);
  });
  return [head.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function downloadText(filename: string, text: string, mime = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
