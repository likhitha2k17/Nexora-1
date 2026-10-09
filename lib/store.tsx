import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createDefaultState } from "./sample-data";
import { priorityOf, scoreOf } from "./risk";
import type { AppListing, AppState, Brand, Case, CaseStatus, Finding, Priority, ReviewStatus, Settings, SocialProfile } from "./types";

import { loadWorkspace, saveWorkspace, checkGooglePlay, type ScanResponse } from "./backend";

interface StoreValue {
  state: AppState;
  hydrated: boolean;
  persistence: string;
  persistenceError: string;
  busy: boolean;
  retrySave: () => Promise<void>;
  scanGooglePlay: (brandId: string, packageId: string) => Promise<ScanResponse>;
  setSelectedBrand: (id: string) => void;
  setDateRange: (d: 7 | 30 | 90) => void;
  setCustomDateRange: (range: { start: string; end: string }) => void;
  upsertBrand: (b: Brand) => void;
  setFindingStatus: (id: string, status: ReviewStatus, reason?: string) => void;
  createCase: (input: { title: string; brandId: string; priority: Priority; assignee: string; findingIds: string[]; summary: string }) => string;
  updateCase: (id: string, patch: Partial<Pick<Case, "status" | "assignee" | "notes" | "priority" | "summary">>, activity?: string) => void;
  addFindingsToCase: (id: string, findingIds: string[]) => void;
  removeFindingFromCase: (id: string, findingId: string) => void;
  markNotificationsRead: () => void;
  updateSettings: (s: Partial<Settings>) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => createDefaultState());
  const [hydrated, setHydrated] = useState(false);
  const [persistence, setPersistence] = useState("Connecting to database…");
  const [persistenceError, setPersistenceError] = useState("");
  const [busy, setBusy] = useState(false);
  const current = useRef(state);
  current.current = state;
  const saved = useRef<AppState | null>(null);
  const revision = useRef(0);
  const ready = useRef(false);
  const saving = useRef<Promise<void> | null>(null);
  const scanLock = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadWorkspace().then(result => {
      if (cancelled) return;
      saved.current = result.state;
      current.current = result.state;
      revision.current = result.revision;
      ready.current = true;
      setState(result.state);
      setHydrated(true);
      setPersistence("Saved to database");
    }).catch(e => { if (!cancelled) { setPersistence("Backend unavailable"); setPersistenceError(e.message); } });
    return () => { cancelled = true; };
  }, []);

  const flush = useCallback((): Promise<void> => {
    if (saving.current) return saving.current;
    if (!ready.current) return Promise.reject(new Error("The database is not connected yet."));
    const work = async () => {
      try {
        while (saved.current !== current.current) {
          setPersistence("Saving…");
          const snapshot = current.current;
          const result = await saveWorkspace(snapshot, revision.current);
          revision.current = result.revision;
          saved.current = snapshot;
        }
        setPersistenceError("");
        setPersistence("Saved to database");
      } catch (e) {
        setPersistence("Changes not saved");
        setPersistenceError(e instanceof Error ? e.message : "Save failed.");
        throw e;
      }
    };
    saving.current = work().finally(() => { saving.current = null; });
    return saving.current;
  }, []);

  useEffect(() => {
    if (!hydrated || saved.current === state || scanLock.current) return;
    setPersistence("Unsaved changes");
    const timer = setTimeout(() => { void flush().catch(() => {}); }, 250);
    return () => clearTimeout(timer);
  }, [state, hydrated, flush]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (busy || (ready.current && saved.current !== current.current)) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const scanGooglePlay = useCallback(async (brandId: string, packageId: string) => {
    if (scanLock.current) throw new Error("A check is already running.");
    scanLock.current = true;
    setBusy(true);
    try {
      await flush();
      const result = await checkGooglePlay(brandId, packageId);
      saved.current = result.state;
      current.current = result.state;
      revision.current = result.revision;
      setState(result.state);
      setPersistence("Saved to database");
      return result;
    } finally { scanLock.current = false; setBusy(false); }
  }, [flush]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.settings.theme === "dark");
  }, [state.settings.theme]);

  const reviewer = state.settings.reviewerName;

  const setSelectedBrand = useCallback((id: string) => setState((s) => ({ ...s, selectedBrandId: id })), []);
  const setDateRange = useCallback((d: 7 | 30 | 90) => setState((s) => ({ ...s, dateRange: d, customDateRange: null })), []);
  const setCustomDateRange = useCallback((range: { start: string; end: string }) => setState((s) => ({ ...s, customDateRange: range })), []);

  const upsertBrand = useCallback((b: Brand) => {
    setState((s) => {
      const exists = s.brands.some((x) => x.id === b.id);
      return { ...s, brands: exists ? s.brands.map((x) => (x.id === b.id ? b : x)) : [...s.brands, b] };
    });
  }, []);

  const setFindingStatus = useCallback((id: string, status: ReviewStatus, reason?: string) => {
    setState((s) => {
      const upd = <T extends SocialProfile | AppListing>(arr: T[]) =>
        arr.map((f) => (f.id === id ? { ...f, status, statusReason: reason } : f));
      return { ...s, profiles: upd(s.profiles), apps: upd(s.apps) };
    });
  }, []);

  const createCase: StoreValue["createCase"] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      const max = Math.max(1000, ...state.cases.map((c) => Number(c.id.split("-")[1]) || 0));
      const newId = `CASE-${max + 1}`;
      const c: Case = {
        id: newId,
        ...input,
        status: "New",
        notes: "",
        activity: [{ at: now, by: reviewer, text: `Case created with ${input.findingIds.length} finding(s)` }],
        createdAt: now,
        updatedAt: now,
      };
      setState((s) => ({ ...s, cases: [c, ...s.cases.filter((x) => x.id !== newId)] }));
      return newId;
    },
    [reviewer, state.cases],
  );

  const touchCase = (c: Case, text: string): Case => {
    const now = new Date().toISOString();
    return { ...c, updatedAt: now, activity: [...c.activity, { at: now, by: reviewer, text }] };
  };

  const updateCase: StoreValue["updateCase"] = useCallback(
    (id, patch, activity) => {
      setState((s) => ({
        ...s,
        cases: s.cases.map((c) => (c.id === id ? touchCase({ ...c, ...patch }, activity ?? "Case updated") : c)),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reviewer],
  );

  const addFindingsToCase = useCallback(
    (id: string, ids: string[]) => {
      setState((s) => ({
        ...s,
        cases: s.cases.map((c) => {
          if (c.id !== id) return c;
          const added = ids.filter((x) => !c.findingIds.includes(x));
          if (!added.length) return c;
          return touchCase({ ...c, findingIds: [...c.findingIds, ...added] }, `Added ${added.length} finding(s)`);
        }),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reviewer],
  );

  const removeFindingFromCase = useCallback(
    (id: string, fid: string) => {
      setState((s) => ({
        ...s,
        cases: s.cases.map((c) =>
          c.id === id ? touchCase({ ...c, findingIds: c.findingIds.filter((x) => x !== fid) }, `Removed finding ${fid}`) : c,
        ),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reviewer],
  );

  const markNotificationsRead = useCallback(
    () => setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
    [],
  );
  const updateSettings = useCallback((p: Partial<Settings>) => setState((s) => ({ ...s, settings: { ...s.settings, ...p } })), []);
  const value = useMemo<StoreValue>(
    () => ({
      state,
      hydrated, persistence, persistenceError, busy, retrySave: flush, scanGooglePlay,
      setSelectedBrand,
      setDateRange,
      setCustomDateRange,
      upsertBrand,
      setFindingStatus,
      createCase,
      updateCase,
      addFindingsToCase,
      removeFindingFromCase,
      markNotificationsRead,
      updateSettings,
    }),
    [state, hydrated, persistence, persistenceError, busy, flush, scanGooglePlay, setSelectedBrand, setDateRange, setCustomDateRange, upsertBrand, setFindingStatus, createCase, updateCase, addFindingsToCase, removeFindingFromCase, markNotificationsRead, updateSettings],
  );

  return <StoreContext.Provider value={value}>
    {!hydrated ? <div className="grid min-h-screen place-items-center bg-background p-8 text-foreground"><div className="max-w-lg space-y-4"><h1 className="text-xl font-semibold">{persistence}</h1><p>{persistenceError || "Loading your workspace."}</p>{persistenceError && <button className="rounded border px-4 py-2" onClick={() => window.location.reload()}>Retry connection</button>}</div></div> : <div inert={busy}>{children}</div>}
    {busy && <div role="status" className="fixed inset-0 z-[100] grid place-items-center bg-background/80"><div className="rounded-lg border bg-card p-6 shadow-lg">Checking the app and saving evidence… Please keep this window open.</div></div>}
  </StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

/* ---------- selectors ---------- */

export function allFindings(s: AppState): Finding[] {
  return [...s.profiles, ...s.apps];
}

export function getFinding(s: AppState, id: string): Finding | undefined {
  return allFindings(s).find((f) => f.id === id);
}

export function inRange(iso: string, days: number) {
  return Date.now() - new Date(iso).getTime() <= days * 86400000 && new Date(iso).getTime() <= Date.now();
}

export function inCustomRange(iso: string, range: { start: string; end: string }) {
  const timestamp = new Date(iso).getTime();
  const start = new Date(`${range.start}T00:00:00.000Z`).getTime();
  const end = new Date(`${range.end}T23:59:59.999Z`).getTime();
  return Number.isFinite(timestamp) && Number.isFinite(start) && Number.isFinite(end) && timestamp >= start && timestamp <= end;
}

export function useScopedFindings(opts: { useRange?: boolean } = {}) {
  const { state } = useStore();
  return useMemo(() => {
    return allFindings(state).filter(
      (f) =>
        (state.selectedBrandId === "all" || f.brandId === state.selectedBrandId) &&
        (!opts.useRange || (state.customDateRange ? inCustomRange(f.detectedAt, state.customDateRange) : inRange(f.detectedAt, state.dateRange))),
    );
  }, [state, opts.useRange]);
}

export function findingMeta(f: Finding) {
  const score = scoreOf(f);
  return { score, priority: priorityOf(score) };
}

export const CASE_STATUSES: CaseStatus[] = ["New", "Investigating", "Ready for review", "Resolved", "Dismissed"];
