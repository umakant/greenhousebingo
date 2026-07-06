"use client";

import * as React from "react";
import { BarChart3, Ban, Check, LayoutGrid, List, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/admin-t";


type DashboardRow = {
  id: string;
  code?: string | null;
  name: string;
  description?: string | null;
  scope?: string | null; // e.g. "project", "hrm"
  is_active: boolean;
};

export default function DashboardsAdmin() {
  const [items, setItems] = React.useState<DashboardRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  async function load(opts?: { search?: string }) {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("all", "1");
      const term = (opts?.search ?? search).trim();
      if (term) qs.set("search", term);
      const res = await fetch(`/api/dashboards?${qs.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Failed to load dashboards.");
      setItems(Array.isArray(json.items) ? (json.items as DashboardRow[]) : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load dashboards.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  const filtered = React.useMemo(() => {
    if (!search.trim()) {
      return [...items].sort((a, b) => a.name.localeCompare(b.name));
    }
    const q = search.trim().toLowerCase();
    return [...items]
      .filter((d) => {
        return (
          d.name.toLowerCase().includes(q) ||
          (d.code ?? "").toLowerCase().includes(q) ||
          (d.description ?? "").toLowerCase().includes(q) ||
          (d.scope ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, search]);

  async function toggle(row: DashboardRow) {
    setTogglingId(row.id);
    try {
      const res = await fetch(`/api/dashboards/${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: !row.is_active }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Update failed.");
      toast.success(!row.is_active ? t("Dashboard enabled.") : t("Dashboard disabled."));
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Update failed.");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card className="shadow-sm">
        <CardContent className="p-4 border-b bg-gray-50/50">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("Search dashboards...")}
                className="pl-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearch(searchInput.trim());
                    void load({ search: searchInput.trim() });
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                onClick={() => {
                  setSearch(searchInput.trim());
                  void load({ search: searchInput.trim() });
                }}
                className="w-full md:w-auto"
              >
                {t("Search")}
              </Button>
              <div className="hidden md:flex items-center gap-1">
                <span className="text-xs text-muted-foreground">{t("View")}</span>
                <Button
                  type="button"
                  size="icon"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("grid")}
                  aria-label={t("Grid view")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("list")}
                  aria-label={t("List view")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>

        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <BarChart3 className="h-4 w-4" />
            <span>{t("Dashboards")}</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-muted-foreground">{t("Loading...")}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {search ? t("No dashboards match your search.") : t("No dashboards have been defined yet.")}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((d) => {
                const active = d.is_active;
                return (
                  <div key={d.id} className="rounded-lg border bg-background overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                            <BarChart3 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            {d.code ? (
                              <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                {d.code}
                              </div>
                            ) : null}
                            <div className="mt-0.5 text-sm font-semibold leading-tight line-clamp-2">
                              {d.name}
                            </div>
                            {d.scope ? (
                              <div className="mt-0.5 text-[11px] text-muted-foreground uppercase tracking-wide">
                                {d.scope}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <Badge
                          className={
                            active
                              ? "bg-emerald-500 hover:bg-emerald-500 text-white"
                              : "bg-muted text-foreground"
                          }
                        >
                          {active ? t("Active") : t("Inactive")}
                        </Badge>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground min-h-[2.25rem] line-clamp-2">
                        {d.description || t("No description")}
                      </div>
                    </div>
                    <div className="px-4 pb-4 flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={`h-8 w-8 shrink-0 ${
                          active
                            ? "border-destructive/40 text-destructive hover:bg-destructive/10"
                            : "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                        }`}
                        onClick={() => void toggle(d)}
                        disabled={togglingId === d.id}
                        title={active ? t("Disable") : t("Enable")}
                        aria-label={active ? t("Disable") : t("Enable")}
                      >
                        {active ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("Code")}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("Name")}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("Scope")}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("Description")}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("Status")}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => {
                    const active = d.is_active;
                    return (
                      <tr key={d.id} className="border-b hover:bg-muted/20">
                        <td className="px-3 py-2 text-xs font-mono">{d.code ?? "-"}</td>
                        <td className="px-3 py-2 text-sm font-medium">{d.name}</td>
                        <td className="px-3 py-2 text-xs uppercase text-muted-foreground">
                          {d.scope ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs">
                          <div className="line-clamp-2">
                            {d.description || t("No description")}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <Badge
                            className={
                              active
                                ? "bg-emerald-500 hover:bg-emerald-500 text-white"
                                : "bg-muted text-foreground"
                            }
                          >
                            {active ? t("Active") : t("Inactive")}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className={`h-8 w-8 shrink-0 ${
                              active
                                ? "border-destructive/40 text-destructive hover:bg-destructive/10"
                                : "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                            }`}
                            onClick={() => void toggle(d)}
                            disabled={togglingId === d.id}
                            title={active ? t("Disable") : t("Enable")}
                            aria-label={active ? t("Disable") : t("Enable")}
                          >
                            {active ? <Ban className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

