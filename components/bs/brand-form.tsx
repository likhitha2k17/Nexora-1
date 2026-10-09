import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import type { Brand, Platform } from "@/lib/types";

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function BrandFormDialog({ open, onOpenChange, brand }: { open: boolean; onOpenChange: (o: boolean) => void; brand?: Brand }) {
  const { upsertBrand } = useStore();
  const [v, setV] = useState<Record<string, string>>({});
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!open) return;
    setErr({});
    setV(brand ? {
      name: brand.name, industry: brand.industry, website: brand.website,
      handles: brand.socialHandles.map((h) => `${h.platform}:${h.handle}`).join(", "),
      apps: brand.officialApps.map((a) => a.name).join(", "),
    } : {});
  }, [open, brand]);

  const F = ({ k, label, hint, req }: { k: string; label: string; hint?: string; req?: boolean }) => (
    <div className="space-y-1">
      <Label htmlFor={`bf-${k}`}>{label}{req && " *"}</Label>
      <Input id={`bf-${k}`} value={v[k] ?? ""} placeholder={hint} aria-invalid={!!err[k]} onChange={(e) => { setV((s) => ({ ...s, [k]: e.target.value })); setErr((s) => ({ ...s, [k]: "" })); }} />
      {err[k] && <p className="text-xs text-destructive">{err[k]}</p>}
    </div>
  );

  const save = () => {
    const e: Record<string, string> = {};
    if (!v["name"]?.trim()) e["name"] = "Brand name is required.";
    if (!v["industry"]?.trim()) e["industry"] = "Industry is required.";
    if (v["website"] && !/^https?:\/\/\S+\.\S+/.test(v["website"])) e["website"] = "Enter a full URL.";
    setErr(e);
    if (Object.keys(e).length) return;
    const name = v["name"]!.trim();
    const b: Brand = {
      id: brand?.id ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36),
      name, industry: v["industry"]!.trim(),
      initials: name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase(),
      website: v["website"]?.trim() ?? "",
      approvedDomains: brand?.approvedDomains ?? [],
      socialHandles: list(v["handles"] ?? "").map((h) => { const [p, hd] = h.includes(":") ? h.split(":") : ["X", h]; return { platform: p as Platform, handle: (hd ?? "").replace(/^@/, "") }; }),
      officialApps: list(v["apps"] ?? "").map((appName, i) => {
        const existing = brand?.officialApps.find((app) => app.name === appName) ?? brand?.officialApps[i];
        return existing ? { ...existing, name: appName } : { name: appName, packageId: "", publisher: "", store: "—" };
      }),
      publishers: brand?.publishers ?? [], partners: brand?.partners ?? [], aliases: brand?.aliases ?? [],
      keywords: brand?.keywords ?? [name.toLowerCase()],
    };
    upsertBrand(b);
    toast.success(brand ? "Brand updated" : "Brand added");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{brand ? "Edit brand" : "Add brand"}</DialogTitle>
          <DialogDescription>Separate multiple values with commas. Information you supply is not independently verified.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {F({ k: "name", label: "Brand name", req: true })}
          {F({ k: "industry", label: "Industry", req: true })}
          {F({ k: "website", label: "Official website", hint: "https://brand.example" })}
          {F({ k: "handles", label: "Official social handles", hint: "X:brand, Instagram:brand" })}
          {F({ k: "apps", label: "Official apps" })}
        </div>
        <p className="text-xs text-muted-foreground">Official logo upload requires file storage and is not available until the backend is connected; initials are used instead.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Save brand</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
