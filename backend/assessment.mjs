import { createHash } from 'node:crypto';

const normalized = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const hostname = s => { try { return new URL(s.includes('://') ? s : `https://${s}`).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
export function assessListing(brand, listing) {
  const now = new Date().toISOString();
  const id = 'live-' + createHash('sha256').update(`${brand.id}:${listing.packageId}`).digest('hex').slice(0, 20);
  const evidenceId = `${id}-listing`;
  const official = brand.officialApps.some(a => a.packageId === listing.packageId);
  const names = [brand.name, ...brand.aliases].map(normalized).filter(Boolean);
  const name = normalized(listing.name);
  const similarity = names.some(n => n === name) ? 1 : names.some(n => name.includes(n)) ? 0.8 : 0;
  const publishers = [...brand.publishers, ...brand.officialApps.map(a => a.publisher)].map(normalized).filter(Boolean);
  const domains = [brand.website, ...brand.approvedDomains].map(hostname).filter(Boolean);
  const domain = hostname(listing.website);
  const publisherMismatch = !!listing.publisher && publishers.length > 0 && !publishers.includes(normalized(listing.publisher));
  const domainMismatch = !!domain && domains.length > 0 && !domains.some(d => domain === d || domain.endsWith(`.${d}`));
  // Requests for secrets are flagged only when a request verb is present.
  const suspiciousWording = /\b(send|share|provide|enter)\b.{0,45}\b(otp|one.time password|seed phrase|recovery phrase)\b/i.test(listing.description);
  const warnings = [];
  const warn = (key, label, detail) => warnings.push({ id: `${id}-${key}`, label, detail, evidenceIds: [evidenceId] });
  if (official) warn('registry', 'Package ID matches your registry', 'This matches a user-supplied official package ID; ownership has not been independently verified.');
  if (similarity > 0 && !official) warn('name', 'Brand name appears in app title', 'Text matches your brand or alias. A name match alone does not establish impersonation.');
  if (publisherMismatch) warn('publisher', 'Publisher differs from registry', `Listing publisher “${listing.publisher}” is absent from the supplied publisher list.`);
  if (domainMismatch) warn('domain', 'Website differs from approved domains', `The developer website uses ${domain}. Review whether this is an authorized partner.`);
  if (suspiciousWording) warn('wording', 'Possible request for sensitive information', 'The description contains wording about entering or sharing a secret. Review the surrounding context.');
  const missingInfo = ['App code, malware behavior, and icon similarity were not analyzed.', 'Registry details are supplied by the user; a low score is not a safety guarantee.'];
  if (!listing.publisher) missingInfo.push('Provider did not supply a publisher.');
  if (!publishers.length) missingInfo.push('No official publisher supplied for comparison.');
  if (!listing.website) missingInfo.push('Provider did not supply a developer website.');
  if (!domains.length) missingInfo.push('No approved domain supplied for comparison.');
  if (!listing.description) missingInfo.push('Provider did not supply a description.');
  return {
    id, kind: 'app', brandId: brand.id, provenance: 'scrappa', name: listing.name, store: 'Google Play', publisher: listing.publisher || 'Not provided', packageId: listing.packageId,
    description: listing.description || 'Not provided by source', website: listing.website, privacyDomain: hostname(listing.privacyUrl), detectedAt: now, lastChecked: now,
    category: official && !publisherMismatch && !domainMismatch && !suspiciousWording ? 'Official app' : similarity > 0 && (publisherMismatch || domainMismatch || suspiciousWording) ? 'Suspicious app' : 'Insufficient evidence',
    signals: { nameSimilarity: similarity, iconSimilarity: 0, publisherMismatch, domainMismatch, suspiciousWording },
    status: official && !publisherMismatch && !domainMismatch && !suspiciousWording ? 'Official' : 'Needs review', warnings, missingInfo,
    evidence: [{ id: evidenceId, findingId: id, type: 'Store listing', title: 'Google Play listing retrieved through Scrappa', content: JSON.stringify(listing).slice(0, 20000), source: listing.url, capturedAt: now }],
  };
}
