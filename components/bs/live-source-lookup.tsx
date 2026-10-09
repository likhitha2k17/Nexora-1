import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice, Panel } from './page';
import { explainIntegration, queryIntegration, type IntegrationResult, type IntegrationService } from '@/lib/backend';

const SOURCES: { id: Exclude<IntegrationService, 'gemini'>; label: string; placeholder: string; note: string }[] = [
  { id: 'x-profile', label: 'X profile', placeholder: 'Nike or @Nike', note: 'Retrieves one submitted public profile.' },
  { id: 'x-user-search', label: 'X user search', placeholder: 'brand name', note: 'Searches public accounts matching the term.' },
  { id: 'x-post-search', label: 'X post search', placeholder: 'brand name or phrase', note: 'Searches public posts matching the term.' },
  { id: 'facebook-profile', label: 'Facebook profile', placeholder: 'zuck', note: 'Retrieves one submitted public profile handle.' },
  { id: 'youtube', label: 'YouTube search', placeholder: 'brand name', note: 'Searches public channels and videos.' },
  { id: 'tavily', label: 'Web search', placeholder: 'brand name scam app support', note: 'Searches the public web through Tavily.' },
];

export function LiveSourceLookup() {
  const [service, setService] = useState<(typeof SOURCES)[number]['id']>('x-profile');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<IntegrationResult | null>(null);
  const [submittedInput, setSubmittedInput] = useState('');
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const selected = SOURCES.find(s => s.id === service)!;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setResult(null); setExplanation('');
    try { setSubmittedInput(input); setResult(await queryIntegration(service, input)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Lookup failed.'); }
    finally { setBusy(false); }
  };
  const explain = async () => {
    if (!result || result.service === 'gemini') return;
    setBusy(true); setError('');
    try { const answer = await explainIntegration(result.service, submittedInput, result.data); setExplanation(answer.summary); }
    catch (e) { setError(e instanceof Error ? e.message : 'Gemini explanation failed.'); }
    finally { setBusy(false); }
  };
  return <Panel title="Live social and web lookup">
    <div className="mb-4"><Notice>These tools retrieve public data. A matching name or warning sign is evidence for human review, not proof that something is fake.</Notice></div>
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
      <div className="space-y-2"><Label htmlFor="lookup-source">Source</Label><select id="lookup-source" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={service} onChange={e => { setService(e.target.value as typeof service); setResult(null); setExplanation(''); }}>
        {SOURCES.map(source => <option key={source.id} value={source.id}>{source.label}</option>)}
      </select></div>
      <div className="space-y-2"><Label htmlFor="lookup-input">Handle or search term</Label><Input id="lookup-input" value={input} onChange={e => setInput(e.target.value)} placeholder={selected.placeholder} maxLength={500} required /></div>
      <Button className="self-end" disabled={busy || !input.trim()}>{busy ? 'Working…' : 'Run live lookup'}</Button>
    </form>
    <p className="mt-2 text-xs text-muted-foreground">{selected.note} This request may use provider quota or credits.</p>
    {error && <p role="alert" className="mt-4 rounded border border-destructive p-3 text-sm text-destructive">{error}</p>}
    {result && <div className="mt-5 space-y-3 border-t pt-4">
      <p className="font-medium">{result.provider}</p><p className="text-sm text-success">{result.summary}</p>
      <details className="rounded border p-3"><summary className="cursor-pointer text-sm font-medium">View retrieved evidence</summary><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(result.data, null, 2)}</pre></details>
      <Button type="button" variant="outline" onClick={() => void explain()} disabled={busy}>Explain evidence with Gemini</Button>
      {explanation && <div className="rounded border bg-muted/30 p-3"><p className="mb-1 text-xs font-medium">Gemini explanation</p><p className="whitespace-pre-wrap text-sm">{explanation}</p><p className="mt-2 text-xs text-muted-foreground">AI-generated review aid; verify against the source evidence.</p></div>}
    </div>}
  </Panel>;
}
