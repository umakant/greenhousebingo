"use client";

import * as React from "react";
import { Bot, Eye, LayoutGrid, List, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";

type ModuleRow = {
  id: string;
  code?: string | null;
  name: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string | null;
  features?: Array<{ id?: string; title: string; description?: string | null; sortOrder?: number }>;
};


function statusBadge(active: boolean) {
  return (
    <Badge
      className={
        active ? "bg-primary hover:bg-primary text-primary-foreground" : "bg-muted text-foreground"
      }
    >
      {active ? t("Active") : t("Inactive")}
    </Badge>
  );
}

export default function AutopilotModulesAdmin() {
  const [items, setItems] = React.useState<ModuleRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [searchInput, setSearchInput] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"" | "active" | "inactive">("");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

  const [selectedModule, setSelectedModule] = React.useState<ModuleRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/autopilot-modules?all=1", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; items?: ModuleRow[] };
      if (!res.ok) throw new Error(json?.message || "Failed to load modules.");
      const rows = Array.isArray(json?.items) ? json.items : [];
      setItems(rows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  const shown = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let filtered = term
      ? items.filter(
          (m) =>
            (m.name ?? "").toLowerCase().includes(term) ||
            (m.code ?? "").toLowerCase().includes(term) ||
            (m.description ?? "").toLowerCase().includes(term),
        )
      : items;
    if (statusFilter === "active") filtered = filtered.filter((m) => m.isActive);
    if (statusFilter === "inactive") filtered = filtered.filter((m) => !m.isActive);
    return [...filtered].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [items, searchTerm, statusFilter]);

  function doSearch() {
    setSearchTerm(searchInput.trim());
  }

  function openDetails(mod: ModuleRow) {
    setSelectedModule(mod);
    setIsDetailsOpen(true);
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card className="shadow-sm">
        <CardContent className="p-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative w-full md:max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setSearchTerm(e.target.value);
                }}
                placeholder={t("Search modules...")}
                className="pl-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") doSearch();
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <Button type="button" onClick={doSearch} className="w-full md:w-auto shrink-0">
                {t("Search")}
              </Button>
              <select
                className="h-10 min-w-[140px] rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "" | "active" | "inactive")}
                aria-label={t("Module status")}
              >
                <option value="">{t("All modules")}</option>
                <option value="active">{t("Active only")}</option>
                <option value="inactive">{t("Inactive only")}</option>
              </select>
              <div className="flex items-center gap-1">
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
            <Bot className="h-4 w-4" />
            <span>{t("Modules")}</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-muted-foreground">{t("Loading...")}</div>
          ) : shown.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <div className="mx-auto max-w-md space-y-2">
                <div className="font-medium">{t("No autopilot modules found")}</div>
                <div className="text-sm">
                  {searchTerm || statusFilter
                    ? t("No modules match your filters.")
                    : t(
                        "Automation packs and autopilot features will be listed here once they are registered for your platform.",
                      )}
                </div>
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {shown.map((m) => {
                const active = m.isActive;
                const featureCount = m.features?.length ?? 0;
                return (
                  <div key={m.id} className="rounded-lg border bg-background overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="h-6 w-6 text-primary" aria-hidden />
                        </div>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {m.code ? (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                              {m.code}
                            </Badge>
                          ) : null}
                          <Badge
                            className={
                              active
                                ? "bg-primary hover:bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }
                          >
                            {active ? t("Active") : t("Inactive")}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="font-medium leading-tight line-clamp-2 min-h-[2.5rem]">{m.name}</div>
                        <div
                          className="text-xs text-muted-foreground mt-1 line-clamp-1"
                          title={m.description ?? ""}
                        >
                          {m.description || t("No description")}
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          {featureCount} {featureCount === 1 ? t("feature") : t("features")}
                        </div>
                      </div>
                    </div>

                    <div className="px-4 pb-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => openDetails(m)}
                      >
                        <Eye className="h-4 w-4 shrink-0 opacity-80" />
                        {t("Details")}
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
                    <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      {t("Code")}
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      {t("Name")}
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      {t("Description")}
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      {t("Features")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      {t("Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((m) => {
                    const featureCount = m.features?.length ?? 0;
                    return (
                      <tr key={m.id} className="border-b hover:bg-muted/20">
                        <td className="px-3 py-2 font-mono text-xs">{m.code ?? "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                              <Bot className="h-4 w-4 text-primary" aria-hidden />
                            </div>
                            <div>
                              <div className="text-sm font-medium">{m.name}</div>
                              <div className="mt-0.5 text-[11px] text-muted-foreground">{statusBadge(m.isActive)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs">
                          <div className="line-clamp-2">{m.description || t("No description")}</div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {featureCount} {featureCount === 1 ? t("feature") : t("features")}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button type="button" size="sm" variant="outline" onClick={() => openDetails(m)}>
                            <Eye className="h-4 w-4 mr-1" />
                            {t("Details")}
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

      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 pr-8">
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md bg-primary/10",
                  "shrink-0",
                )}
              >
                <Bot className="h-5 w-5 text-primary" aria-hidden />
              </span>
              <span className="line-clamp-2">{selectedModule?.name}</span>
            </SheetTitle>
            <SheetDescription>
              {selectedModule?.code ? (
                <span className="font-mono text-xs">{selectedModule.code}</span>
              ) : (
                t("Autopilot module")
              )}
            </SheetDescription>
          </SheetHeader>
          {selectedModule ? (
            <div className="mt-6 space-y-4 text-sm">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Status")}</div>
                <div className="mt-1">{statusBadge(selectedModule.isActive)}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("Description")}
                </div>
                <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
                  {selectedModule.description?.trim() || t("No description")}
                </p>
              </div>
              {selectedModule.features && selectedModule.features.length > 0 ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("Features")}
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {selectedModule.features.map((f, i) => (
                      <li key={f.id ?? `${f.title}-${i}`}>
                        <span className="font-medium">{f.title}</span>
                        {f.description ? (
                          <span className="text-muted-foreground"> — {f.description}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-muted-foreground">{t("0 features")}</div>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
