import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, Notice } from "@/components/bs/page";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_dash/settings")({
  head: () => ({
    meta: [
      { title: "Settings — NEXORA" },
      { name: "description", content: "Workspace, reviewer profile and preferences." },
      { property: "og:title", content: "Settings — NEXORA" },
      { property: "og:description", content: "Workspace settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { state, updateSettings, setSelectedBrand } = useStore();
  const s = state.settings;
  const [ws, setWs] = useState(s.workspaceName);
  const [name, setName] = useState(s.reviewerName);
  const [role, setRole] = useState(s.reviewerRole);
  useEffect(() => { setWs(s.workspaceName); setName(s.reviewerName); setRole(s.reviewerRole); }, [s.workspaceName, s.reviewerName, s.reviewerRole]);
  const err = !ws.trim() || !name.trim();

  return (
    <>
      <PageHeader title="Settings" crumbs={[{ label: "Settings" }]} />
      <div className="mb-4 max-w-3xl"><Notice>These settings only affect this browser. Email notifications, sign-in and team invitations require a backend and are not available.</Notice></div>
      <div className="grid max-w-3xl gap-4">
        <Panel title="Workspace & reviewer">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ws">Workspace name</Label><Input id="ws" value={ws} onChange={(e) => setWs(e.target.value)} aria-invalid={!ws.trim()} />{!ws.trim() && <p className="text-xs text-destructive">Required.</p>}</div>
            <div className="space-y-1.5"><Label htmlFor="rn">Reviewer name</Label><Input id="rn" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!name.trim()} />{!name.trim() && <p className="text-xs text-destructive">Required.</p>}</div>
            <div className="space-y-1.5"><Label htmlFor="rr">Role</Label><Input id="rr" value={role} onChange={(e) => setRole(e.target.value)} /></div>
          </div>
          <Button className="mt-4" disabled={err} onClick={() => { updateSettings({ workspaceName: ws.trim(), reviewerName: name.trim(), reviewerRole: role.trim() }); toast.success("Settings saved"); }}>Save</Button>
        </Panel>
        <Panel title="Preferences">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label>Default brand</Label>
              <Select value={s.defaultBrandId} onValueChange={(v) => { updateSettings({ defaultBrandId: v }); setSelectedBrand(v); }}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>{state.brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between"><Label htmlFor="theme">Dark theme</Label><Switch id="theme" checked={s.theme === "dark"} onCheckedChange={(v) => updateSettings({ theme: v ? "dark" : "light" })} /></div>
            <div className="flex items-center justify-between"><Label htmlFor="n1">In-app alerts for high-priority findings</Label><Switch id="n1" checked={s.notifyHighPriority} onCheckedChange={(v) => updateSettings({ notifyHighPriority: v })} /></div>
            <div className="flex items-center justify-between"><Label htmlFor="n2">In-app alerts for case updates</Label><Switch id="n2" checked={s.notifyCaseUpdates} onCheckedChange={(v) => updateSettings({ notifyCaseUpdates: v })} /></div>
          </div>
        </Panel>
      </div>
    </>
  );
}
