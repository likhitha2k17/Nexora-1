import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ArrowUpDown, SearchX } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./page";
import { findingMeta, inRange, useStore } from "@/lib/store";
import { findingLink } from "@/lib/links";
import { cn } from "@/lib/utils";
import type { Finding } from "@/lib/types";

export interface Column<T extends Finding> {
  key: string;
  label: string;
  render: (f: T) => ReactNode;
  sort?: (f: T) => string | number;
  className?: string;
}

export interface FilterDef<T extends Finding> {
  key: string;
  label: string;
  options: string[];
  get: (f: T) => string;
}

export function FindingTable<T extends Finding>({
  rows,
  columns,
  filters,
  searchText,
  defaultSort = "score",
  showDateFilter = true,
}: {
  rows: T[];
  columns: Column<T>[];
  filters: FilterDef<T>[];
  searchText: (f: T) => string;
  defaultSort?: string;
  showDateFilter?: boolean;
}) {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [days, setDays] = useState("all");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: defaultSort, dir: -1 });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        (!t || searchText(r).toLowerCase().includes(t)) &&
        filters.every((f) => !vals[f.key] || vals[f.key] === "all" || f.get(r) === vals[f.key]) &&
        (!showDateFilter || days === "all" || inRange(r.detectedAt, Number(days))),
    );
    const col = columns.find((c) => c.key === sort.key);
    const getter = col?.sort ?? ((f: T) => findingMeta(f).score);
    return [...list].sort((a, b) => {
      const x = getter(a), y = getter(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [rows, q, vals, days, sort, columns, filters, searchText, showDateFilter]);

  const active = q || (showDateFilter && days !== "all") || Object.values(vals).some((v) => v && v !== "all");

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search findings" className="h-9 w-full sm:w-56" />
        {filters.map((f) => (
          <Select key={f.key} value={vals[f.key] ?? "all"} onValueChange={(v) => setVals((s) => ({ ...s, [f.key]: v }))}>
            <SelectTrigger className="h-9 w-[150px]" aria-label={f.label}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {f.label.toLowerCase()}</SelectItem>
              {f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
        {showDateFilter && (
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="h-9 w-[150px]" aria-label="Detection date"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any detection date</SelectItem>
              <SelectItem value="7">Detected ≤ 7 days</SelectItem>
              <SelectItem value="30">Detected ≤ 30 days</SelectItem>
              <SelectItem value="90">Detected ≤ 90 days</SelectItem>
            </SelectContent>
          </Select>
        )}
        {active && (
          <Button variant="ghost" size="sm" onClick={() => { setQ(""); setVals({}); setDays("all"); }}>Clear filters</Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} of {rows.length} · brand: {state.selectedBrandId === "all" ? "all" : state.brands.find((b) => b.id === state.selectedBrandId)?.name}</span>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={<SearchX className="size-8" />} title="No findings match" body="Adjust the filters or switch brand in the header." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                {columns.map((c) => (
                  <th key={c.key} className={cn("whitespace-nowrap px-3 py-2.5 font-medium", c.className)}>
                    {c.sort || c.key === "score" ? (
                      <button
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (s.dir === 1 ? -1 : 1) : -1 }))}
                        aria-label={`Sort by ${c.label}`}
                      >
                        {c.label}
                        {sort.key === c.key ? (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-50" />}
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => (
                <tr key={r.id} className="group relative hover:bg-muted/50">
                  {columns.map((c, i) => (
                    <td key={c.key} className={cn("px-3 py-2.5 align-middle", c.className)}>
                      {i === 0 ? (
                        <Link {...findingLink(r)} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
                          {c.render(r)}
                        </Link>
                      ) : (
                        c.render(r)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
