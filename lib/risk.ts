import type { AppListing, Finding, Priority, SocialProfile } from "./types";

/** Rule-based triage score. A weighted sum of observed indicators, not a fraud probability. */
export function profileScore(p: SocialProfile): number {
  if (p.category === "Official account") return 2;
  const s = p.signals;
  const v =
    s.nameSimilarity * 25 +
    s.logoSimilarity * 20 +
    (s.domainMismatch ? 20 : 0) +
    (s.supportClaim ? 15 : 0) +
    (s.suspiciousRequest ? 15 : 0) +
    (s.unrecognized ? 5 : 0);
  return Math.min(100, Math.round(v));
}

export function appScore(a: AppListing): number {
  if (a.category === "Official app" && a.provenance !== "scrappa") return 2;
  if (a.category === "Official app" && a.provenance === "scrappa") return Math.min(100, (a.signals.publisherMismatch ? 20 : 0) + (a.signals.domainMismatch ? 15 : 0) + (a.signals.suspiciousWording ? 15 : 0));
  const s = a.signals;
  const v =
    s.nameSimilarity * 25 +
    s.iconSimilarity * 25 +
    (s.publisherMismatch ? 20 : 0) +
    (s.domainMismatch ? 15 : 0) +
    (s.suspiciousWording ? 15 : 0);
  return Math.min(100, Math.round(v));
}

export function scoreOf(f: Finding): number {
  return f.kind === "profile" ? profileScore(f) : appScore(f);
}

export function priorityOf(score: number): Priority {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

export const PRIORITY_ORDER: Record<Priority, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export function findingTitle(f: Finding): string {
  return f.kind === "profile" ? `${f.displayName} (@${f.username})` : f.name;
}

export function isSuspicious(f: Finding): boolean {
  return !["Official account", "Official app", "Authorized reseller", "Fan account"].includes(f.category);
}
