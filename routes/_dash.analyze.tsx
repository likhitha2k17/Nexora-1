import { LiveAppCheck } from "@/components/bs/live-app-check";
import { LiveSourceLookup } from "@/components/bs/live-source-lookup";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Info, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, EmptyState, Notice } from "@/components/bs/page";
import { RiskScore } from "@/components/bs/pills";
import { useStore } from "@/lib/store";
import { runSampleAnalysis, type AnalysisResult } from "@/lib/services";
import { findingLink } from "@/lib/links";

export const Route = createFileRoute("/_dash/analyze")({
  head: () => ({
    meta: [
      { title: "Quick Analyze — NEXORA" },
      { name: "description", content: "Review a profile or app listing against official brand details." },
      { property: "og:title", content: "Quick Analyze — NEXORA" },
      { property: "og:description", content: "Review profile and app evidence." },
    ],
  }),
  component: AnalyzePage,
});

type Field = { key: string; label: string; required?: boolean; multiline?: boolean; placeholder?: string };
const PROFILE_FIELDS: Field[] = [
  { key: "platform", label: "Platform", required: true, placeholder: "X" },
  { key: "username", label: "Username", required: true, placeholder: "@handle" },
  { key: "displayName", label: "Display name", required: true },
  { key: "bio", label: "Bio / message", multiline: true },
  { key: "website", label: "Website", placeholder: "https://…" },
];
const PROFILE_SAMPLE = { platform: "X", username: "lumorapay_helpdesk", displayName: "Lumora Pay Support", bio: "Official Lumora Pay Support 24/7 ✔ Account locked? DM us your registered email and the 6-digit code…", website: "https://lumora-support.example/restore" };

function AnalyzeForm() {
  const { state } = useStore();
  const fields = PROFILE_FIELDS;
  const [brand, setBrand] = useState(state.selectedBrandId === "all" ? "lumora" : state.selectedBrandId);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [img, setImg] = useState<{ url: string; name: string } | null>(null);
  const [imgErr, setImgErr] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const onFile = (f?: File) => {
    setImgErr("");
    if (!f) return;
    if (!f.type.startsWith("image/")) return setImgErr("Please choose an image file (PNG, JPG, WebP).");
    if (f.size > 5 * 1024 * 1024) return setImgErr("Image must be under 5 MB.");
    if (img) URL.revokeObjectURL(img.url);
    setImg({ url: URL.createObjectURL(f), name: f.name }); // preview only; never stored
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    fields.forEach((f) => { if (f.required && !vals[f.key]?.trim()) e[f.key] = `${f.label} is required.`; });
    fields.filter((f) => f.placeholder === "https://…").forEach((f) => {
      const v = vals[f.key]?.trim();
      if (v && !/^https?:\/\/\S+\.\S+/.test(v)) e[f.key] = "Enter a full URL starting with http:// or https://";
    });
    setErrors(e);
    if (Object.keys(e).length) return;
    setPhase("loading");
    try {
      const r = await runSampleAnalysis("profile", vals["username"]!);
      setResult(r);
      setPhase("done");
    } catch {
      setPhase("error");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Social profile details" action={
        <Button variant="ghost" size="sm" onClick={() => { setVals(PROFILE_SAMPLE); setBrand("lumora"); setErrors({}); }}>Load sample</Button>
      }>
        <form className="space-y-3" onSubmit={(ev) => { ev.preventDefault(); submit(); }} noValidate>
          <div className="space-y-1.5">
            <Label>Brand *</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger aria-label="Brand"><SelectValue /></SelectTrigger>
              <SelectContent>{state.brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {fields.map((f) => {
            const id = `profile-${f.key}`;
            const P = f.multiline ? Textarea : Input;
            return (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={id}>{f.label}{f.required && " *"}</Label>
                <P id={id} placeholder={f.placeholder} value={vals[f.key] ?? ""} aria-invalid={!!errors[f.key]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => { setVals((s) => ({ ...s, [f.key]: e.target.value })); setErrors((s) => ({ ...s, [f.key]: "" })); }} />
                {errors[f.key] && <p className="text-xs text-destructive">{errors[f.key]}</p>}
              </div>
            );
          })}
          <div className="space-y-1.5">
            <Label htmlFor="profile-img">Optional screenshot</Label>
            {img ? (
              <div className="flex items-center gap-3 rounded-md border p-2">
                <img src={img.url} alt="Uploaded preview" className="size-16 rounded object-cover" />
                <span className="flex-1 truncate text-xs">{img.name}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => { URL.revokeObjectURL(img.url); setImg(null); }}><X /> Remove</Button>
              </div>
            ) : (
              <label htmlFor="profile-img" className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground hover:bg-muted">
                <Upload className="size-4" /> Choose image
                <input id="profile-img" type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            )}
            {imgErr && <p className="text-xs text-destructive">{imgErr}</p>}
            <p className="text-[11px] text-muted-foreground">Images are previewed locally and never stored.</p>
          </div>
          <Button type="submit" className="w-full" disabled={phase === "loading"}>
            {phase === "loading" ? <><Loader2 className="animate-spin" /> Loading assessment…</> : "View sample assessment"}
          </Button>
        </form>
      </Panel>

      <Panel title="Result">
        {phase === "idle" && <EmptyState icon={<Info className="size-8" />} title="No analysis yet" body="Fill in the form or load a sample, then run the sample analysis." />}
        {phase === "loading" && <EmptyState icon={<Loader2 className="size-8 animate-spin" />} title="Loading saved assessment…" />}
        {phase === "error" && <EmptyState icon={<AlertCircle className="size-8 text-destructive" />} title="Analysis failed" body="Something went wrong. Try again." action={<Button size="sm" onClick={submit}>Retry</Button>} />}
        {phase === "done" && result?.kind === "unavailable" && (
          <div className="space-y-3">
            <EmptyState icon={<Info className="size-8" />} title="No prepared result for this input" body="Live analysis requires a backend integration. This workspace does not fetch submitted URLs or invent findings." />
            <Notice>Tip: use “Load sample” to see a prepared sample result.</Notice>
          </div>
        )}
        {phase === "done" && result?.kind === "prepared" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" /> Matched a prepared sample record</div>
            <p className="rounded bg-sample px-2 py-1 text-xs font-medium text-sample-foreground">Simulated result — not a live AI assessment</p>
            <RiskScore score={result.score} size="lg" />
            <p className="text-[11px] text-muted-foreground">Sample heuristic score</p>
            <ul className="space-y-1.5">
              {result.finding.warnings.map((w) => (
                <li key={w.id} className="rounded border p-2 text-sm"><span className="font-medium">{w.label}</span><span className="block text-xs text-muted-foreground">{w.detail}</span></li>
              ))}
            </ul>
            <Button asChild className="w-full"><Link {...findingLink(result.finding)}>Open full investigation</Link></Button>
          </div>
        )}
      </Panel>
    </div>
  );
}

function AnalyzePage() {
  return (
    <>
      <PageHeader title="Quick Analyze" crumbs={[{ label: "Quick Analyze" }]} description="Check Google Play listings or review prepared social-profile assessments." />
      <div className="mb-6"><LiveAppCheck /></div>
      <div className="mb-6"><LiveSourceLookup /></div>
      <h2 className="mb-3 text-sm font-semibold">Prepared sample assessments</h2>
      <AnalyzeForm />
    </>
  );
}
