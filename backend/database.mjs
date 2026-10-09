import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createDefaultState } from '../src/lib/sample-data.ts';
import { stateSchema } from './validation.mjs';

export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS scans (id TEXT PRIMARY KEY, brand_id TEXT NOT NULL, package_id TEXT NOT NULL, started_at TEXT NOT NULL, completed_at TEXT, status TEXT NOT NULL, error TEXT, finding TEXT);
    CREATE INDEX IF NOT EXISTS scans_recent ON scans(started_at DESC);
    CREATE TABLE IF NOT EXISTS source_checks (id TEXT PRIMARY KEY, service TEXT NOT NULL, input TEXT NOT NULL, checked_at TEXT NOT NULL, status TEXT NOT NULL, summary TEXT, error TEXT, response TEXT);
    CREATE INDEX IF NOT EXISTS source_checks_recent ON source_checks(checked_at DESC);`);
  if (!db.prepare('SELECT id FROM workspace WHERE id=1').get()) {
    const seed = createDefaultState();
    for (const finding of [...seed.apps, ...seed.profiles]) finding.provenance = 'sample';
    seed.lastScan = '';
    db.prepare('INSERT INTO workspace VALUES (1,0,?)').run(JSON.stringify(stateSchema.parse(seed)));
  }
  // An interrupted request must not remain shown as running after restart.
  db.prepare("UPDATE scans SET status='failed', error='Backend restarted before the scan completed.', completed_at=? WHERE status='running'").run(new Date().toISOString());
  return {
    read() { const row = db.prepare('SELECT * FROM workspace WHERE id=1').get(); return { revision: Number(row.revision), state: JSON.parse(row.data) }; },
    save(state, revision) {
      const clean = stateSchema.parse(state);
      const result = db.prepare('UPDATE workspace SET data=?, revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(clean), revision);
      if (!result.changes) { const e = new Error('The workspace changed in another window. Reload before making more changes.'); e.status = 409; throw e; }
      return revision + 1;
    },
    beginScan(id, brandId, packageId) { db.prepare("INSERT INTO scans (id,brand_id,package_id,started_at,status) VALUES (?,?,?,?,'running')").run(id, brandId, packageId, new Date().toISOString()); },
    failScan(id, message) { db.prepare("UPDATE scans SET status='failed', error=?, completed_at=? WHERE id=?").run(message, new Date().toISOString(), id); },
    completeScan(id, finding) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const { state, revision } = this.read();
        const previous = state.apps.find(a => a.id === finding.id);
        if (previous) { finding.detectedAt = previous.detectedAt; finding.status = previous.status; if (previous.statusReason) finding.statusReason = previous.statusReason; }
        state.apps = [finding, ...state.apps.filter(a => a.id !== finding.id)];
        state.lastScan = finding.lastChecked;
        state.selectedBrandId = finding.brandId;
        const nextRevision = this.save(state, revision);
        db.prepare("UPDATE scans SET status='completed', finding=?, completed_at=? WHERE id=?").run(JSON.stringify(finding), finding.lastChecked, id);
        db.exec('COMMIT');
        return { state, revision: nextRevision, finding };
      } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    scans() { return db.prepare('SELECT id, brand_id AS brandId, package_id AS packageId, started_at AS startedAt, completed_at AS completedAt, status, error FROM scans ORDER BY started_at DESC LIMIT 50').all(); },
    saveSourceCheck(id, service, input, result) {
      db.prepare('INSERT INTO source_checks (id,service,input,checked_at,status,summary,response) VALUES (?,?,?,?,?,?,?)')
        .run(id, service, input, result.checkedAt, 'completed', result.summary, JSON.stringify(result.data));
    },
    failSourceCheck(id, service, input, error) {
      db.prepare('INSERT INTO source_checks (id,service,input,checked_at,status,error) VALUES (?,?,?,?,?,?)')
        .run(id, service, input, new Date().toISOString(), 'failed', error);
    },
    sourceChecks() { return db.prepare('SELECT id,service,input,checked_at AS checkedAt,status,summary,error FROM source_checks ORDER BY checked_at DESC LIMIT 50').all(); },
    close() { db.close(); },
  };
}
