export class RequestError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function packageIdFrom(input) {
  let value = input.trim();
  if (/^https?:/i.test(value)) {
    let url;
    try { url = new URL(value); } catch { throw new RequestError('Enter a valid Google Play URL.'); }
    if (url.protocol !== 'https:' || url.hostname !== 'play.google.com' || url.pathname !== '/store/apps/details') throw new RequestError('Use a Google Play app details URL or an Android package ID.');
    value = url.searchParams.get('id') || '';
  }
  if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(value) || value.length > 250) throw new RequestError('Enter a package ID such as com.example.app.');
  return value;
}

const str = (...values) => values.find(v => typeof v === 'string' && v.trim())?.trim().slice(0, 18000) || '';
export function normalizeListing(payload, packageId) {
  const root = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
  if (!root || typeof root !== 'object' || root.error || root.success === false) throw new RequestError('Scrappa returned no usable app listing.', 502);
  const app = root.app || {};
  const product = root.product_info || {};
  const about = root.about_this_app || {};
  const contact = root.developer_contact || root.developer_contacts || {};
  const returnedId = str(app.app_id, root.appId, root.app_id);
  if (returnedId && returnedId !== packageId) throw new RequestError('The provider returned a different app. No finding was saved.', 502);
  const name = str(app.title, product.title, root.title);
  if (!name) throw new RequestError('Scrappa response did not contain an app title. The response format may have changed.', 502);
  return {
    packageId, name,
    publisher: str(app.developer, product.authors?.[0]?.name, about.offered_by, root.developer?.name, root.developer),
    description: str(root.description, about.description, product.description, app.description),
    website: str(contact.website, contact.website?.link, contact.website?.url, root.developerWebsite),
    privacyUrl: str(contact.privacy_policy, contact.privacy_policy?.link, root.privacyPolicy),
    url: `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageId)}`,
  };
}

export async function fetchListing(packageId, key, fetcher = fetch) {
  if (!key || key.includes('your_actual') || key.includes('your_google')) throw new RequestError('Add your Scrappa key to .env, then restart the backend.', 503);
  const url = new URL('https://scrappa.co/api/google/play/details');
  url.search = new URLSearchParams({ product_id: packageId, store: 'apps' }).toString();
  let response;
  try { response = await fetcher(url, { headers: { Accept: 'application/json', 'X-API-KEY': key }, signal: AbortSignal.timeout(30000), redirect: 'error' }); }
  catch { throw new RequestError('Scrappa could not be reached within 30 seconds. Check your internet connection and retry.', 502); }
  if (!response.ok) {
    const messages = { 401: 'Scrappa rejected the key. Check your .env file.', 403: 'Scrappa denied access. Check your key and account permissions.', 404: 'The app listing was not found.', 429: 'Scrappa quota or rate limit reached. Wait before trying again.' };
    throw new RequestError(messages[response.status] || `Scrappa returned HTTP ${response.status}. Try again later.`, 502);
  }
  let payload;
  try { payload = await response.json(); } catch { throw new RequestError('Scrappa returned an unreadable response.', 502); }
  return normalizeListing(payload, packageId);
}
