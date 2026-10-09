import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel, Notice } from './page';
import { RiskScore } from './pills';
import { useStore } from '@/lib/store';
import { backendHealth, type BackendHealth, type ScanResponse } from '@/lib/backend';

export function LiveAppCheck() {
  const { state, hydrated, scanGooglePlay, busy } = useStore();
  const [brandId, setBrandId] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  useEffect(() => { backendHealth().then(setHealth).catch(() => {}); }, []);
  useEffect(() => { if (!brandId && hydrated) setBrandId(state.selectedBrandId === 'all' ? state.brands[0]?.id || '' : state.selectedBrandId); }, [brandId, hydrated, state]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setResult(null);
    try { setResult(await scanGooglePlay(brandId, input)); }
    catch (e) { setError(e instanceof Error ? e.message : 'App check failed.'); }
  };
  return <Panel title="Check a Google Play app">
    <p className="mb-4 text-sm text-muted-foreground">Retrieve an actual listing through Scrappa, compare it with your brand registry, and save the evidence.</p>
    {health?.scrappa === 'missing' && <div className="mb-4"><Notice tone="warn">Add SCRAPPA_API_KEY to your private .env file and restart the project to enable retrieval.</Notice></div>}
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
      <div className="space-y-2"><Label htmlFor="live-brand">Compare against brand</Label><select id="live-brand" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={brandId} onChange={e => setBrandId(e.target.value)} required>
        <option value="" disabled>Select brand</option>{state.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select></div>
      <div className="space-y-2"><Label htmlFor="live-package">Google Play URL or package ID</Label><Input id="live-package" value={input} onChange={e => setInput(e.target.value)} placeholder="com.example.app or a Google Play link" required maxLength={2048} /></div>
      <Button className="self-end" disabled={!hydrated || busy || !brandId || !input.trim()}>{busy ? 'Checking…' : 'Check and save'}</Button>
    </form>
    <p className="mt-3 text-xs text-muted-foreground">Checks one submitted app; does not search the whole store. Uses your Scrappa quota. Assessment uses rules, not AI or malware scanning.</p>
    {error && <p role="alert" className="mt-4 rounded border border-destructive p-3 text-sm text-destructive">{error}</p>}
    {result && <div className="mt-5 space-y-3 border-t pt-4">
      <p className="font-semibold">{result.finding.name} · {result.finding.publisher}</p>
      <p className="text-sm text-success">Listing retrieved and saved to the database.</p>
      <div className="flex items-center gap-3"><RiskScore score={result.score} /><span className="text-xs text-muted-foreground">Rule-based review priority; not a probability of fraud.</span></div>
      <p className="text-sm">{result.finding.category}</p>
      <ul className="space-y-2 text-sm">{result.finding.warnings.map(w => <li key={w.id}><strong>{w.label}:</strong> {w.detail}</li>)}</ul>
      <Button asChild><Link to="/apps/$id" params={{ id: result.finding.id }}>Open saved investigation</Link></Button>
    </div>}
  </Panel>;
}
