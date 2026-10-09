import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  AppWindow,
  Bell,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  FileBarChart,
  FolderKanban,
  LayoutDashboard,
  Menu,
  ScanSearch,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { findingLink } from "@/lib/links";

const NAV = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/brands", label: "Brand Registry", icon: Building2 },
  { to: "/social", label: "Social Monitoring", icon: Users },
  { to: "/apps", label: "App Monitoring", icon: AppWindow },
  { to: "/analyze", label: "Quick Analyze", icon: ScanSearch },
  { to: "/cases", label: "Cases & Evidence", icon: FolderKanban },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link to="/overview" className="flex items-center px-1" aria-label="NEXORA home">
      <img
        src="/nexora-logo.png"
        alt="NEXORA"
        className={collapsed ? "size-8 shrink-0 rounded bg-white object-contain" : "h-9 w-auto max-w-[180px] shrink-0 rounded bg-white object-contain"}
      />
    </Link>
  );
}

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV.map((n) => {
        const active = path === n.to || path.startsWith(n.to + "/");
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            title={collapsed ? n.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <n.icon className={cn("size-4 shrink-0", active && "text-sidebar-primary")} />
            {!collapsed && n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function GlobalSearch() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    const r: { label: string; sub: string; go: () => void }[] = [];
    state.profiles.forEach((p) => {
      if ((p.displayName + p.username).toLowerCase().includes(t))
        r.push({ label: p.displayName, sub: `@${p.username} · ${p.platform}`, go: () => navigate({ to: "/social/$id", params: { id: p.id } }) });
    });
    state.apps.forEach((a) => {
      if ((a.name + a.packageId + a.publisher).toLowerCase().includes(t))
        r.push({ label: a.name, sub: a.packageId, go: () => navigate({ to: "/apps/$id", params: { id: a.id } }) });
    });
    state.cases.forEach((c) => {
      if ((c.id + c.title).toLowerCase().includes(t))
        r.push({ label: c.title, sub: c.id, go: () => navigate({ to: "/cases/$caseId", params: { caseId: c.id } }) });
    });
    state.domains.forEach((d) => {
      const related = [...state.profiles, ...state.apps].find((f) => f.domainId === d.id);
      if (d.domain.includes(t) && related) r.push({ label: d.domain, sub: "Suspicious domain", go: () => navigate(findingLink(related)) });
    });
    return r.slice(0, 8);
  }, [q, state, navigate]);

  return (
    <div className="relative hidden w-full max-w-xs lg:block">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search profiles, apps, cases, domains"
        aria-label="Global search"
        className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-11 z-50 rounded-md border bg-popover p-1 shadow-lg">
          {results.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No matching records.</p>}
          {results.map((r, i) => (
            <button
              key={i}
              onMouseDown={(e) => { e.preventDefault(); r.go(); setOpen(false); setQ(""); }}
              className="flex w-full flex-col items-start rounded px-3 py-1.5 text-left hover:bg-accent"
            >
              <span className="text-sm">{r.label}</span>
              <span className="text-xs text-muted-foreground">{r.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const { state, setSelectedBrand, setDateRange, setCustomDateRange, markNotificationsRead } = useStore();
  const navigate = useNavigate();
  const router = useRouter();
  const [customDateOpen, setCustomDateOpen] = useState(false);
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [dateError, setDateError] = useState("");
  const unread = state.notifications.filter((n) => !n.read).length;
  const openCustomDatePicker = () => {
    setDraftStart(state.customDateRange?.start ?? "");
    setDraftEnd(state.customDateRange?.end ?? "");
    setDateError("");
    setCustomDateOpen(true);
  };
  const applyCustomDateRange = () => {
    if (!draftStart || !draftEnd) {
      setDateError("Choose both a start date and an end date.");
      return;
    }
    if (draftEnd < draftStart) {
      setDateError("End date must be on or after the start date.");
      return;
    }
    setCustomDateRange({ start: draftStart, end: draftEnd });
    setCustomDateOpen(false);
  };
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card/95 px-3 backdrop-blur md:px-5 print:hidden">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenu} aria-label="Open navigation">
        <Menu />
      </Button>
      <Select value={state.selectedBrandId} onValueChange={setSelectedBrand}>
        <SelectTrigger className="h-9 w-[150px] sm:w-[180px]" aria-label="Select brand">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All brands</SelectItem>
          {state.brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={state.customDateRange ? "custom" : String(state.dateRange)} onValueChange={(v) => {
        if (v === "custom") openCustomDatePicker();
        else setDateRange(Number(v) as 7 | 30 | 90);
      }}>
        <SelectTrigger className="hidden h-9 w-[230px] sm:flex" aria-label="Date range">
          <SelectValue>{state.customDateRange ? `${fmtDate(state.customDateRange.start)} – ${fmtDate(state.customDateRange.end)}` : undefined}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
          <SelectItem value="custom" onSelect={openCustomDatePicker}>Custom date</SelectItem>
        </SelectContent>
      </Select>
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-1.5">
        <DropdownMenu onOpenChange={(o) => { if (!o && unread) markNotificationsRead(); }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Notifications, ${unread} unread`} className="relative">
              <Bell />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-critical" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {state.notifications.map((n) => (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5" onSelect={() => n.link && router.history.push(n.link)}>
                <span className="flex items-center gap-2 text-sm font-medium">
                  {!n.read && <span className="size-1.5 rounded-full bg-primary" />}
                  {n.title}
                </span>
                <span className="text-xs text-muted-foreground">{n.body}</span>
                <span className="text-[11px] text-muted-foreground">{fmtDateTime(n.at)}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-1.5" aria-label="User menu">
              <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {state.settings.reviewerName.split(" ").map((x) => x[0]).join("").slice(0, 2)}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="text-sm">{state.settings.reviewerName}</div>
              <div className="text-xs font-normal text-muted-foreground">{state.settings.reviewerRole}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>Settings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Dialog open={customDateOpen} onOpenChange={setCustomDateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom date range</DialogTitle>
            <DialogDescription>Choose the dates to include in the Overview.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <label htmlFor="overview-start-date" className="grid gap-1.5 text-sm font-medium">
              Start date
              <Input id="overview-start-date" type="date" max={draftEnd || undefined} value={draftStart} onChange={(e) => {
                setDraftStart(e.target.value);
                if (draftEnd && e.target.value > draftEnd) setDateError("End date must be on or after the start date.");
                else setDateError("");
              }} />
            </label>
            <label htmlFor="overview-end-date" className="grid gap-1.5 text-sm font-medium">
              End date
              <Input id="overview-end-date" type="date" min={draftStart || undefined} value={draftEnd} onChange={(e) => {
                setDraftEnd(e.target.value);
                setDateError("");
              }} />
            </label>
          </div>
          {dateError && <p role="alert" className="text-sm text-destructive">{dateError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomDateOpen(false)}>Cancel</Button>
            <Button onClick={applyCustomDateRange} disabled={!draftStart || !draftEnd || draftEnd < draftStart}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const { state, persistence, persistenceError, retrySave } = useStore();
  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex print:hidden",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className={cn("flex h-14 items-center border-b border-sidebar-border px-3", collapsed && "justify-center")}>
          <Logo collapsed={collapsed} />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <NavList collapsed={collapsed} />
        </div>
        <div className="border-t border-sidebar-border p-2">
          {!collapsed && (
            <p className="mb-2 px-2 text-[11px] leading-snug text-sidebar-muted">
              {state.settings.workspaceName}
            </p>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" /> Collapse</>}
          </button>
        </div>
      </aside>
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-3 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="mb-4 mt-1"><Logo /></div>
          <NavList onNavigate={() => setMobile(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenu={() => setMobile(true)} />
        <div role="status" className="border-b px-4 py-2 text-xs text-muted-foreground">{persistence}{persistenceError && <span className="ml-3 text-destructive">{persistenceError} <button className="underline" onClick={() => { void retrySave().catch(() => {}); }}>Retry save</button></span>}</div>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
