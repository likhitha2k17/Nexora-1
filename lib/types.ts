export type Priority = "Critical" | "High" | "Medium" | "Low";
export type ReviewStatus = "Needs review" | "Marked for review" | "Authorized" | "Dismissed" | "Official";
export type CaseStatus = "New" | "Investigating" | "Ready for review" | "Resolved" | "Dismissed";
export type Platform = "X" | "Instagram" | "Facebook" | "Telegram" | "TikTok" | "Reddit" | "LinkedIn";
export type FindingCategory =
  | "Support impersonation"
  | "Giveaway / scam"
  | "Brand impersonation"
  | "Suspicious app"
  | "Fan account"
  | "Authorized reseller"
  | "Official account"
  | "Official app"
  | "Insufficient evidence";

export interface Brand {
  id: string;
  name: string;
  industry: string;
  initials: string;
  website: string;
  approvedDomains: string[];
  socialHandles: { platform: Platform; handle: string }[];
  officialApps: { name: string; packageId: string; publisher: string; store: string }[];
  publishers: string[];
  partners: string[];
  aliases: string[];
  keywords: string[];
}

export interface Evidence {
  id: string;
  findingId: string;
  type: "Excerpt" | "Metadata" | "Screenshot note" | "Domain record" | "Store listing";
  title: string;
  content: string;
  source: string;
  capturedAt: string;
}

export interface WarningSign {
  id: string;
  label: string;
  detail: string;
  evidenceIds: string[];
}

export interface SocialSignals {
  nameSimilarity: number; // 0..1
  logoSimilarity: number; // 0..1
  domainMismatch: boolean;
  supportClaim: boolean;
  suspiciousRequest: boolean;
  unrecognized: boolean;
}

export interface SocialProfile {
  id: string;
  kind: "profile";
  provenance?: "sample" | "scrappa";
  brandId: string;
  platform: Platform;
  displayName: string;
  username: string;
  bio: string;
  url: string;
  followers: number;
  accountCreated: string;
  detectedAt: string;
  lastChecked: string;
  category: FindingCategory;
  signals: SocialSignals;
  warnings: WarningSign[];
  evidence: Evidence[];
  missingInfo: string[];
  status: ReviewStatus;
  statusReason?: string;
  domainId?: string;
}

export interface AppSignals {
  nameSimilarity: number;
  iconSimilarity: number;
  publisherMismatch: boolean;
  domainMismatch: boolean;
  suspiciousWording: boolean;
}

export interface AppListing {
  id: string;
  kind: "app";
  provenance?: "sample" | "scrappa";
  brandId: string;
  name: string;
  store: string;
  publisher: string;
  packageId: string;
  description: string;
  website: string;
  privacyDomain: string;
  detectedAt: string;
  lastChecked: string;
  category: FindingCategory;
  signals: AppSignals;
  warnings: WarningSign[];
  evidence: Evidence[];
  missingInfo: string[];
  permissions?: string[];
  status: ReviewStatus;
  statusReason?: string;
  domainId?: string;
}

export type Finding = SocialProfile | AppListing;

export interface SuspiciousDomain {
  id: string;
  brandId: string;
  domain: string;
  firstSeen: string;
  note: string;
}

export interface CaseActivity {
  at: string;
  by: string;
  text: string;
}

export interface Case {
  id: string;
  title: string;
  brandId: string;
  priority: Priority;
  assignee: string;
  status: CaseStatus;
  findingIds: string[];
  summary: string;
  notes: string;
  activity: CaseActivity[];
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  link?: string;
}

export interface Settings {
  workspaceName: string;
  defaultBrandId: string;
  theme: "light" | "dark";
  reviewerName: string;
  reviewerRole: string;
  notifyHighPriority: boolean;
  notifyCaseUpdates: boolean;
}

export interface AppState {
  brands: Brand[];
  profiles: SocialProfile[];
  apps: AppListing[];
  domains: SuspiciousDomain[];
  cases: Case[];
  notifications: Notification[];
  settings: Settings;
  selectedBrandId: string; // "all" or brand id
  dateRange: 7 | 30 | 90;
  customDateRange?: { start: string; end: string } | null;
  lastScan: string;
}
