import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';
import { ZodError } from 'zod';
import { openDatabase } from './database.mjs';
import { saveSchema, scanSchema, integrationTestSchema, integrationQuerySchema, explainSchema } from './validation.mjs';
import { RequestError, packageIdFrom, fetchListing } from './scrappa.mjs';
import { assessListing } from './assessment.mjs';
import { appScore, priorityOf } from '../src/lib/risk.ts';
import { credentialStatus, credentialsFromEnv, providerSettingsFromEnv } from './config.mjs';
import { testProvider, runProvider, explainEvidence } from './providers.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
try { loadEnvFile(resolve(root, '.env')); } catch (e) { if (e.code !== 'ENOENT') throw e; }

export function makeServer({ database, key = '', credentials, settings = {}, fetcher = fetch } = {}) {
  const secrets = credentials ?? { googlePlay: key };
  const googlePlayKey = secrets.googlePlay || key;
  let scanning = false;
  const send = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); };
  return createServer(async (req, res) => {
    try {
      // Local single-user backend. Reject requests from external web origins.
      if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')) throw new RequestError('Local access only.', 403);
      if (req.headers.origin) {
        let origin; try { origin = new URL(req.headers.origin); } catch { throw new RequestError('Invalid origin.', 403); }
        if (!['http:', 'https:'].includes(origin.protocol) || !['localhost', '127.0.0.1'].includes(origin.hostname)) throw new RequestError('Local access only.', 403);
      }
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method === 'GET' && path === '/api/health') {
        const integrations = credentialStatus(secrets);
        return send(res, 200, {
          database: 'connected',
          scrappa: integrations.googlePlay || 'missing',
          monitoring: 'manual',
          ai: integrations.gemini === 'configured' ? 'key configured' : 'not connected',
          integrations,
        });
      }
      if (req.method === 'GET' && path === '/api/state') return send(res, 200, database.read());
      if (req.method === 'GET' && path === '/api/scans') return send(res, 200, { scans: database.scans() });
      if (req.method === 'GET' && path === '/api/source-checks') return send(res, 200, { checks: database.sourceChecks() });
      if (!['PUT', 'POST'].includes(req.method)) throw new RequestError('Not found.', 404);
      if (!req.headers['content-type']?.startsWith('application/json')) throw new RequestError('JSON content required.', 415);
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 8 * 1024 * 1024) throw new RequestError('Request too large.', 413); chunks.push(chunk); }
      let body; try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new RequestError('Invalid JSON.'); }
      if (req.method === 'PUT' && path === '/api/state') {
        if (scanning) throw new RequestError('An app check is running. Retry saving after it finishes.', 409);
        const { state, revision } = saveSchema.parse(body);
        return send(res, 200, { revision: database.save(state, revision) });
      }
      if (req.method === 'POST' && path === '/api/scan/google-play') {
        if (scanning) throw new RequestError('An app check is already running. Wait for it to finish.', 409);
        const input = scanSchema.parse(body);
        const packageId = packageIdFrom(input.packageId);
        const brand = database.read().state.brands.find(b => b.id === input.brandId);
        if (!brand) throw new RequestError('Save and select a valid brand first.');
        const scanId = randomUUID();
        scanning = true;
        try {
          database.beginScan(scanId, brand.id, packageId);
          const listing = await fetchListing(packageId, googlePlayKey, fetcher);
          const finding = assessListing(brand, listing);
          const result = database.completeScan(scanId, finding);
          return send(res, 200, { ...result, score: appScore(finding), priority: priorityOf(appScore(finding)) });
        } catch (e) {
          const message = e instanceof RequestError ? e.message : 'The scan could not be saved. Retry or restart the backend.';
          database.failScan(scanId, message);
          throw e;
        } finally { scanning = false; }
      }
      if (req.method === 'POST' && path === '/api/integrations/test') {
        const { service } = integrationTestSchema.parse(body);
        const id = randomUUID();
        try {
          const result = await testProvider(service, secrets, settings, fetcher);
          database.saveSourceCheck(id, service, '[connection test]', result);
          return send(res, 200, result);
        } catch (e) {
          const message = e instanceof RequestError ? e.message : 'Connection test failed.';
          database.failSourceCheck(id, service, '[connection test]', message);
          throw e;
        }
      }
      if (req.method === 'POST' && path === '/api/integrations/query') {
        const { service, input } = integrationQuerySchema.parse(body);
        const id = randomUUID();
        try {
          const result = await runProvider(service, input, secrets, settings, fetcher);
          database.saveSourceCheck(id, service, input, result);
          return send(res, 200, result);
        } catch (e) {
          const message = e instanceof RequestError ? e.message : 'Live lookup failed.';
          database.failSourceCheck(id, service, input, message);
          throw e;
        }
      }
      if (req.method === 'POST' && path === '/api/integrations/explain') {
        const { service, input, evidence } = explainSchema.parse(body);
        const id = randomUUID();
        try {
          const result = await explainEvidence(service, input, evidence, secrets, settings, fetcher);
          database.saveSourceCheck(id, 'gemini', `${service}: ${input}`, result);
          return send(res, 200, result);
        } catch (e) {
          database.failSourceCheck(id, 'gemini', input, e instanceof RequestError ? e.message : 'Explanation failed.');
          throw e;
        }
      }
      throw new RequestError('Not found.', 404);
    } catch (e) {
      send(res, e instanceof ZodError ? 400 : e.status || 500, { error: e instanceof ZodError ? 'Invalid workspace or request data.' : e.status ? e.message : 'Backend error. Check that the database folder is writable.' });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const database = openDatabase(resolve(root, 'data/brandshield.sqlite'));
  const server = makeServer({ database, credentials: credentialsFromEnv(), settings: providerSettingsFromEnv() });
  server.listen(3001, '127.0.0.1', () => console.log('Backend ready at http://127.0.0.1:3001. Database: data/brandshield.sqlite'));
  server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? 'Port 3001 is already in use. Close the old backend and retry.' : 'Could not start backend.'); database.close(); process.exit(1); });
  const stop = () => server.close(() => { database.close(); process.exit(0); });
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
