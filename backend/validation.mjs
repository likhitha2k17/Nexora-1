import { z } from 'zod';

const text = z.string().max(20000);
const id = z.string().min(1).max(200);
const texts = z.array(text).max(500);
const at = z.string().datetime();
const priority = z.enum(['Critical', 'High', 'Medium', 'Low']);
const review = z.enum(['Needs review', 'Marked for review', 'Authorized', 'Dismissed', 'Official']);
const category = z.enum(['Support impersonation', 'Giveaway / scam', 'Brand impersonation', 'Suspicious app', 'Fan account', 'Authorized reseller', 'Official account', 'Official app', 'Insufficient evidence']);
const evidence = z.object({ id, findingId: id, type: z.enum(['Excerpt', 'Metadata', 'Screenshot note', 'Domain record', 'Store listing']), title: text, content: text, source: text, capturedAt: at });
const warning = z.object({ id, label: text, detail: text, evidenceIds: texts });
const platform = z.enum(['X', 'Instagram', 'Facebook', 'Telegram', 'TikTok', 'Reddit', 'LinkedIn']);
const ratio = z.number().min(0).max(1);
const base = { id, brandId: id, detectedAt: at, lastChecked: at, category, warnings: z.array(warning).max(100), evidence: z.array(evidence).max(100), missingInfo: texts, status: review, statusReason: text.optional(), domainId: id.optional(), provenance: z.enum(['sample', 'scrappa']).optional() };
export const brandSchema = z.object({ id, name: z.string().trim().min(1).max(300), industry: text, initials: text, website: text, approvedDomains: texts, socialHandles: z.array(z.object({ platform, handle: text })).max(500), officialApps: z.array(z.object({ name: text, packageId: text, publisher: text, store: text })).max(500), publishers: texts, partners: texts, aliases: texts, keywords: texts });
const app = z.object({ ...base, kind: z.literal('app'), name: text, store: text, publisher: text, packageId: text, description: text, website: text, privacyDomain: text, permissions: texts.optional(), signals: z.object({ nameSimilarity: ratio, iconSimilarity: ratio, publisherMismatch: z.boolean(), domainMismatch: z.boolean(), suspiciousWording: z.boolean() }) });
const profile = z.object({ ...base, kind: z.literal('profile'), platform, displayName: text, username: text, bio: text, url: text, followers: z.number().nonnegative(), accountCreated: text, signals: z.object({ nameSimilarity: ratio, logoSimilarity: ratio, domainMismatch: z.boolean(), supportClaim: z.boolean(), suspiciousRequest: z.boolean(), unrecognized: z.boolean() }) });
const caseSchema = z.object({ id, title: text, brandId: id, priority, assignee: text, status: z.enum(['New', 'Investigating', 'Ready for review', 'Resolved', 'Dismissed']), findingIds: texts, summary: text, notes: text, activity: z.array(z.object({ at, by: text, text })).max(5000), createdAt: at, updatedAt: at });
export const stateSchema = z.object({
  brands: z.array(brandSchema).max(500), profiles: z.array(profile).max(5000), apps: z.array(app).max(5000), cases: z.array(caseSchema).max(5000),
  domains: z.array(z.object({ id, brandId: id, domain: text, firstSeen: z.union([at, z.string().date()]), note: text })).max(5000),
  notifications: z.array(z.object({ id, title: text, body: text, at, read: z.boolean(), link: text.optional() })).max(5000),
  settings: z.object({ workspaceName: text, defaultBrandId: text, theme: z.enum(['light', 'dark']), reviewerName: text, reviewerRole: text, notifyHighPriority: z.boolean(), notifyCaseUpdates: z.boolean() }),
  selectedBrandId: text, dateRange: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  customDateRange: z.object({ start: z.string().date(), end: z.string().date() }).nullable().optional(), lastScan: text,
}).superRefine((s, ctx) => {
  if (s.customDateRange && s.customDateRange.end < s.customDateRange.start) {
    ctx.addIssue({ code: 'custom', path: ['customDateRange', 'end'], message: 'The end date must not be earlier than the start date.' });
  }
  for (const rows of [s.brands, s.profiles, s.apps, s.cases, s.domains]) {
    if (new Set(rows.map(x => x.id)).size !== rows.length) ctx.addIssue({ code: 'custom', message: 'Duplicate record IDs' });
  }
  const brands = new Set(s.brands.map(x => x.id));
  if ([...s.apps, ...s.profiles, ...s.cases, ...s.domains].some(x => !brands.has(x.brandId))) ctx.addIssue({ code: 'custom', message: 'Unknown brand reference' });
});

export const saveSchema = z.object({ revision: z.number().int().nonnegative(), state: stateSchema });
export const scanSchema = z.object({ brandId: id, packageId: z.string().trim().min(1).max(2048) }).strict();
export const integrationServiceSchema = z.enum(['x-profile', 'x-user-search', 'x-post-search', 'facebook-profile', 'youtube', 'tavily', 'gemini']);
export const integrationTestSchema = z.object({ service: integrationServiceSchema }).strict();
export const integrationQuerySchema = z.object({ service: integrationServiceSchema, input: z.string().trim().min(1).max(500) }).strict();
export const explainSchema = z.object({
  service: integrationServiceSchema.exclude(['gemini']),
  input: z.string().trim().min(1).max(500),
  evidence: z.unknown(),
}).strict().superRefine((value, ctx) => {
  const serialized = JSON.stringify(value.evidence);
  if (!serialized || value.evidence === null) ctx.addIssue({ code: 'custom', message: 'Evidence is required.' });
  else if (serialized.length > 100000) ctx.addIssue({ code: 'custom', message: 'Evidence is too large.' });
});
