import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { findingMeta, getFinding, useStore } from "@/lib/store";
import { findingTitle, PRIORITY_ORDER } from "@/lib/risk";
import type { Priority } from "@/lib/types";

export const REVIEWERS = ["Priya Raman", "Daniel Okafor", "Unassigned"];

export function CreateCaseDialog({
  open,
  onOpenChange,
  findingIds,
  defaultTitle,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  findingIds: string[];
  defaultTitle?: string;
  onCreated?: (id: string) => void;
}) {
  const { state, createCase } = useStore();
  const navigate = useNavigate();
  const findings = findingIds.map((id) => getFinding(state, id)).filter((f): f is NonNullable<typeof f> => !!f);
  const top: Priority =
    findings.map((f) => findingMeta(f).priority).sort((a, b) => PRIORITY_ORDER[b] - PRIORITY_ORDER[a])[0] ?? "Medium";
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>(top);
  const [assignee, setAssignee] = useState(state.settings.reviewerName);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle ?? (findings[0] ? `Investigation: ${findingTitle(findings[0])}` : ""));
      setPriority(top);
      setAssignee(state.settings.reviewerName);
      setSummary(
        findings.length
          ? `${findings.length} linked finding(s) requiring review. Indicators are based on the sample dataset.`
          : "",
      );
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const brandId = findings[0]?.brandId ?? (state.selectedBrandId === "all" ? state.brands[0]!.id : state.selectedBrandId);

  const submit = () => {
    if (!title.trim()) return setError("Case title is required.");
    const id = createCase({ title: title.trim(), brandId, priority, assignee, findingIds, summary });
    toast.success(`${id} created`, { description: `${findingIds.length} finding(s) linked.` });
    onOpenChange(false);
    onCreated?.(id);
    navigate({ to: "/cases/$caseId", params: { caseId: id } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create case</DialogTitle>
          <DialogDescription>Cases are stored in this browser only.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="case-title">Title</Label>
            <Input id="case-title" value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }} aria-invalid={!!error} />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Critical", "High", "Medium", "Low"] as Priority[]).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from(new Set([state.settings.reviewerName, ...REVIEWERS])).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="case-summary">Summary</Label>
            <Textarea id="case-summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Linked findings ({findings.length})</p>
            <ul className="max-h-40 space-y-1 overflow-auto rounded-md border p-2 text-sm">
              {findings.length === 0 && <li className="text-muted-foreground">No findings — you can add them later.</li>}
              {findings.map((f) => (
                <li key={f.id} className="flex justify-between gap-2">
                  <span className="truncate">{findingTitle(f)}</span>
                  <span className="font-mono text-xs text-muted-foreground">{findingMeta(f).score}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Create case</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddToCaseDialog({ open, onOpenChange, findingIds }: { open: boolean; onOpenChange: (o: boolean) => void; findingIds: string[] }) {
  const { state, addFindingsToCase } = useStore();
  const options = state.cases.filter((c) => c.status !== "Resolved" && c.status !== "Dismissed");
  const [caseId, setCaseId] = useState("");
  useEffect(() => { if (open) setCaseId(""); }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to existing case</DialogTitle>
          <DialogDescription>Only open cases are listed.</DialogDescription>
        </DialogHeader>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">There are no open cases. Create a new case instead.</p>
        ) : (
          <Select value={caseId} onValueChange={setCaseId}>
            <SelectTrigger aria-label="Select case"><SelectValue placeholder="Select a case" /></SelectTrigger>
            <SelectContent>
              {options.map((c) => <SelectItem key={c.id} value={c.id}>{c.id} — {c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!caseId}
            onClick={() => {
              addFindingsToCase(caseId, findingIds);
              toast.success(`Added to ${caseId}`);
              onOpenChange(false);
            }}
          >
            Add to case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DismissDialog({ open, onOpenChange, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; onConfirm: (reason: string) => void }) {
  const reasons = ["Insufficient evidence", "Clearly labelled fan account", "Authorized by brand team", "Duplicate finding", "Other"];
  const [reason, setReason] = useState("");
  const [other, setOther] = useState("");
  useEffect(() => { if (open) { setReason(""); setOther(""); } }, [open]);
  const final = reason === "Other" ? other.trim() : reason;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dismiss finding</DialogTitle>
          <DialogDescription>A reason is required and is recorded with the finding.</DialogDescription>
        </DialogHeader>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger aria-label="Dismiss reason"><SelectValue placeholder="Select a reason" /></SelectTrigger>
          <SelectContent>{reasons.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
        {reason === "Other" && <Input placeholder="Describe the reason" value={other} onChange={(e) => setOther(e.target.value)} />}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!final} onClick={() => { onConfirm(final); onOpenChange(false); }}>Dismiss</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
