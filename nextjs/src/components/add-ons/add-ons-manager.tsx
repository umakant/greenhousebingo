"use client";

import * as React from "react";
import { toast } from "sonner";
import { Ban, Boxes, Check, ChevronDown, Eye, LayoutGrid, List, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableActionButton } from "@/components/ui/table-action-button";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { getAddOnModuleIcon } from "@/lib/business-module-icon";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";


type AddOnItem = {
  module: string;
  alias: string;
  image: string;
  monthly_price: string;
  yearly_price: string;
  is_enable?: boolean;
  for_admin?: boolean;
  package_name?: string;
  version?: string;
};

/** Display add-on semver with a single leading `v` (API stores e.g. `1.0.0` without prefix). */
function formatAddonVersion(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "v1.0.0";
  return /^v\d/i.test(s) ? s : `v${s}`;
}

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

export default function AddOnsManager() {
  const router = useRouter();
  const appSettings = useAppSettingsOptional();
  const formatMoney = (value: number | string) =>
    formatCurrency(Number(value) || 0, appSettings?.settings ?? {});
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<AddOnItem[]>([]);
  const [search, setSearch] = React.useState("");
  const searchRef = React.useRef(search);
  searchRef.current = search;

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(12);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState<"" | "active" | "inactive">("");
  const [filterAudience, setFilterAudience] = React.useState<"" | "admin" | "company">("");
  const [sortField, setSortField] = React.useState<"" | "name" | "package" | "monthly" | "yearly" | "status">("");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const [details, setDetails] = React.useState<AddOnItem | null>(null);
  const [confirmDisable, setConfirmDisable] = React.useState<AddOnItem | null>(null);
  const [toggling, setToggling] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

  const fetchItems = React.useCallback(async (opts?: { search?: string }) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("all", "1");
      qs.set("for_admin", "all");
      const s = (opts?.search !== undefined ? opts.search : searchRef.current).trim();
      if (s) qs.set("search", s);
      const res = await fetch(`/api/add-ons?${qs.toString()}`, { cache: "no-store", credentials: "same-origin" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Failed to load add-ons.");
      setItems(Array.isArray(json?.items) ? (json.items as AddOnItem[]) : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load add-ons.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchItems({ search: "" });
  }, [fetchItems]);

  async function toggle(addOn: AddOnItem) {
    try {
      const next = !(addOn.is_enable ?? false);
      const res = await fetch(`/api/add-ons/${encodeURIComponent(addOn.module)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_enable: next }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Update failed.");
      toast.success(next ? t("Enabled.") : t("Disabled."));
      await fetchItems({ search: searchRef.current });
      const refreshRes = await fetch("/api/auth/refresh-permissions", {
        method: "POST",
        credentials: "include",
      });
      if (refreshRes.ok) router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Update failed.");
    }
  }

  const filteredItems = React.useMemo(() => {
    let list = [...items];
    if (filterStatus === "active") list = list.filter((a) => a.is_enable);
    else if (filterStatus === "inactive") list = list.filter((a) => !a.is_enable);
    if (filterAudience === "admin") list = list.filter((a) => a.for_admin);
    else if (filterAudience === "company") list = list.filter((a) => !a.for_admin);
    return list;
  }, [items, filterStatus, filterAudience]);

  const sortedItems = React.useMemo(() => {
    const list = [...filteredItems];
    const dir = sortDirection === "asc" ? 1 : -1;
    const cmpStr = (a: string, b: string) => dir * a.localeCompare(b, undefined, { sensitivity: "base" });
    list.sort((a, b) => {
      switch (sortField) {
        case "name":
          return cmpStr(a.alias || a.module, b.alias || b.module);
        case "package":
          return cmpStr(a.package_name || a.module || "", b.package_name || b.module || "");
        case "monthly":
          return dir * (Number(a.monthly_price) - Number(b.monthly_price));
        case "yearly":
          return dir * (Number(a.yearly_price) - Number(b.yearly_price));
        case "status":
          return dir * (Number(Boolean(a.is_enable)) - Number(Boolean(b.is_enable)));
        default: {
          const aKey = (a.alias || a.module).toLowerCase();
          const bKey = (b.alias || b.module).toLowerCase();
          return aKey.localeCompare(bKey);
        }
      }
    });
    return list;
  }, [filteredItems, sortField, sortDirection]);

  const total = sortedItems.length;
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  React.useEffect(() => {
    const tp = Math.max(1, Math.ceil(total / perPage));
    if (page > tp) setPage(tp);
  }, [total, perPage, page]);

  const pageSlice = React.useMemo(() => {
    const start = (page - 1) * perPage;
    return sortedItems.slice(start, start + perPage);
  }, [sortedItems, page, perPage]);

  function applySearch() {
    setPage(1);
    void fetchItems({ search: search.trim() });
  }

  function handleSort(field: typeof sortField) {
    if (!field) return;
    const nextDir = sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(nextDir);
    setPage(1);
  }

  const confirmDisableSubmit = React.useCallback(async () => {
    if (!confirmDisable) return;
    setToggling(true);
    try {
      await toggle(confirmDisable);
      setConfirmDisable(null);
    } finally {
      setToggling(false);
    }
  }, [confirmDisable]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button type="button" size="icon" className="h-9 w-9" onClick={() => router.push("/add-on/upload")}>
          <Plus className="h-4 w-4" />
          <span className="sr-only">{t("Upload Add-ons")}</span>
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative w-full md:max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search add-ons and modules...")}
                className="pl-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applySearch();
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <Button type="button" onClick={applySearch} className="w-full md:w-auto shrink-0">
                {t("Search")}
              </Button>
              <select
                className="h-10 min-w-[140px] rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as typeof filterStatus);
                  setPage(1);
                }}
                aria-label={t("Add-on status")}
              >
                <option value="">{t("All add-ons")}</option>
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

              <select
                className="h-10 min-w-[120px] rounded-md border border-input bg-background px-2 text-sm"
                value={String(perPage)}
                onChange={(e) => {
                  const next = Number(e.target.value || "12");
                  setPerPage(next);
                  setPage(1);
                }}
                aria-label={t("Per page")}
              >
                <option value="12">{t("12 per page")}</option>
                <option value="20">{t("20 per page")}</option>
                <option value="50">{t("50 per page")}</option>
              </select>

              <DropdownMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-10">
                    {t("Filters")}
                    <ChevronDown className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-3">
                  <div className="space-y-2">
                    <div>
                      <div className="mb-1 text-xs text-muted-foreground">{t("Status")}</div>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                      >
                        <option value="">{t("All add-ons")}</option>
                        <option value="active">{t("Active only")}</option>
                        <option value="inactive">{t("Inactive only")}</option>
                      </select>
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-muted-foreground">{t("Audience")}</div>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={filterAudience}
                        onChange={(e) => setFilterAudience(e.target.value as typeof filterAudience)}
                      >
                        <option value="">{t("All")}</option>
                        <option value="admin">{t("Admin only")}</option>
                        <option value="company">{t("Company")}</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFilterStatus("");
                          setFilterAudience("");
                          setFiltersOpen(false);
                          setPage(1);
                        }}
                      >
                        {t("Clear")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setFiltersOpen(false);
                          setPage(1);
                        }}
                      >
                        {t("Apply")}
                      </Button>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>

        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Boxes className="h-4 w-4" />
            <span>{t("Add-ons")}</span>
          </div>

        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {loading ? (
              <div className="col-span-full py-16 text-center text-muted-foreground">{t("Loading...")}</div>
            ) : (
              pageSlice.map((a) => {
                const active = Boolean(a.is_enable);
                const versionLabel = formatAddonVersion(a.version);
                const ModuleIcon = getAddOnModuleIcon(a.module, a.alias);
                const slugLabel = (a.module || "").trim() || "—";
                const subtitle = (a.package_name ?? "").trim() || t("No description");
                const audienceLabel = a.for_admin ? t("Admin") : t("Company");
                return (
                  <div key={a.module} className="rounded-lg border bg-background overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <ModuleIcon className="h-6 w-6 text-primary" aria-hidden />
                        </div>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-mono max-w-[120px] truncate" title={slugLabel}>
                            {slugLabel}
                          </Badge>
                          {statusBadge(active)}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="font-medium leading-tight line-clamp-2 min-h-[2.5rem]">{a.alias}</div>
                        <div
                          className="text-xs text-muted-foreground mt-1 line-clamp-1"
                          title={subtitle}
                        >
                          {subtitle}
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          {versionLabel} · {audienceLabel} · {formatMoney(a.monthly_price)}
                          /mo
                        </div>
                      </div>
                    </div>

                    <div className="px-4 pb-4">
                      <div
                        className={cn(
                          "flex w-full overflow-hidden rounded-md border border-input bg-background shadow-sm",
                          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
                        )}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 flex-1 gap-2 rounded-none border-0 shadow-none text-foreground hover:bg-muted/70"
                          onClick={() => setDetails(a)}
                          disabled={toggling}
                        >
                          <Eye className="h-4 w-4 shrink-0 opacity-80" />
                          {t("Details")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 rounded-none border-0 border-l border-input shadow-none hover:bg-muted/70"
                          onClick={() => (active ? setConfirmDisable(a) : void toggle(a))}
                          disabled={toggling}
                          aria-label={active ? t("Disable add-on") : t("Enable add-on")}
                          title={active ? t("Disable") : t("Enable")}
                        >
                          {active ? (
                            <Ban className="h-4 w-4 text-destructive" />
                          ) : (
                            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {!loading && sortedItems.length === 0 ? (
              <div className="col-span-full py-10 text-center text-sm text-muted-foreground">
                {filterStatus || filterAudience ? t("No add-ons match your filters.") : t("No add-ons found")}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b">
                  <th className="text-left font-medium text-xs uppercase tracking-wide text-muted-foreground px-4 py-2">
                    {t("Icon")}
                  </th>
                  <th
                    className="text-left font-medium text-xs uppercase tracking-wide text-muted-foreground px-4 py-2 cursor-pointer select-none"
                    onClick={() => handleSort("name")}
                  >
                    {t("Name")} <span className="opacity-60">⇅</span>
                  </th>
                  <th
                    className="text-left font-medium text-xs uppercase tracking-wide text-muted-foreground px-4 py-2 cursor-pointer select-none"
                    onClick={() => handleSort("package")}
                  >
                    {t("Package")} <span className="opacity-60">⇅</span>
                  </th>
                  <th
                    className="text-left font-medium text-xs uppercase tracking-wide text-muted-foreground px-4 py-2 cursor-pointer select-none"
                    onClick={() => handleSort("monthly")}
                  >
                    {t("Monthly")} <span className="opacity-60">⇅</span>
                  </th>
                  <th
                    className="text-left font-medium text-xs uppercase tracking-wide text-muted-foreground px-4 py-2 cursor-pointer select-none"
                    onClick={() => handleSort("yearly")}
                  >
                    {t("Yearly")} <span className="opacity-60">⇅</span>
                  </th>
                  <th
                    className="text-left font-medium text-xs uppercase tracking-wide text-muted-foreground px-4 py-2 cursor-pointer select-none"
                    onClick={() => handleSort("status")}
                  >
                    {t("Status")} <span className="opacity-60">⇅</span>
                  </th>
                  <th className="text-right font-medium text-xs uppercase tracking-wide text-muted-foreground px-4 py-2">
                    {t("Actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      {t("Loading...")}
                    </td>
                  </tr>
                ) : (
                  pageSlice.map((a) => {
                    const active = Boolean(a.is_enable);
                    const versionLabel = formatAddonVersion(a.version);
                    const RowIcon = getAddOnModuleIcon(a.module, a.alias);
                    return (
                      <tr key={a.module} className="border-b hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                            <RowIcon className="h-5 w-5 text-primary" aria-hidden />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="text-sm font-medium">{a.alias}</div>
                              <div className="mt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">{versionLabel}</div>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-xs px-4 py-3 text-xs text-muted-foreground">
                          <div className="truncate" title={a.package_name ?? a.module}>
                            {a.package_name ?? a.module}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">{formatMoney(a.monthly_price)}</td>
                        <td className="px-4 py-3 text-xs">{formatMoney(a.yearly_price)}</td>
                        <td className="px-4 py-3 text-xs">{statusBadge(active)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end">
                            <TableActionButton
                              label={t("Details")}
                              onPrimaryClick={() => setDetails(a)}
                              disabled={toggling}
                              items={
                                active
                                  ? [
                                      {
                                        label: t("Details"),
                                        onSelect: () => setDetails(a),
                                        icon: <Eye className="h-4 w-4" />,
                                      },
                                      {
                                        label: t("Disable"),
                                        onSelect: () => setConfirmDisable(a),
                                        icon: <Ban className="h-4 w-4" />,
                                        destructive: true,
                                      },
                                    ]
                                  : [
                                      {
                                        label: t("Details"),
                                        onSelect: () => setDetails(a),
                                        icon: <Eye className="h-4 w-4" />,
                                      },
                                      {
                                        label: t("Enable"),
                                        onSelect: () => void toggle(a),
                                        icon: <Check className="h-4 w-4" />,
                                      },
                                    ]
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
                {!loading && sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      {filterStatus || filterAudience ? t("No add-ons match your filters.") : t("No add-ons found")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}

          <div className="flex items-center justify-between border-t pt-4 mt-4 text-sm text-muted-foreground">
            <div>
              {t("Showing")} {from} {t("to")} {to} {t("of")} {total} {t("results")}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("Previous")}
              </Button>
              <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground inline-flex items-center justify-center text-xs font-medium">
                {page}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t("Next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!confirmDisable} onOpenChange={(v) => (!v ? setConfirmDisable(null) : null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Disable add-on?")}</DialogTitle>
            <DialogDescription>
              {confirmDisable
                ? `${t("Disabling")} "${confirmDisable.alias ?? confirmDisable.module}" ${t("will remove it from plan options. You can re-enable it anytime.")}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmDisable(null)}>
              {t("Cancel")}
            </Button>
            <Button variant="destructive" onClick={() => { if (confirmDisable) { toggle(confirmDisable); setConfirmDisable(null); } }} disabled={toggling}>
              {toggling ? t("Disabling...") : t("Disable")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!details} onOpenChange={(v) => (!v ? setDetails(null) : null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {details ? (
                <>
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    {React.createElement(getAddOnModuleIcon(details.module, details.alias), {
                      className: "h-4 w-4 text-primary",
                      "aria-hidden": true,
                    })}
                  </div>
                  <span>{details.alias}</span>
                </>
              ) : (
                ""
              )}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">{details?.module ?? ""}</DialogDescription>
          </DialogHeader>

          {details ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="text-muted-foreground">{t("Package")}</div>
                <div className="font-medium text-right break-all">{details.package_name ?? "-"}</div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="text-muted-foreground">{t("Monthly price")}</div>
                <div className="font-medium">{formatMoney(details.monthly_price)}</div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="text-muted-foreground">{t("Yearly price")}</div>
                <div className="font-medium">{formatMoney(details.yearly_price)}</div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="text-muted-foreground">{t("Status")}</div>
                <div className="font-medium">{details.is_enable ? t("Active") : t("Inactive")}</div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="text-muted-foreground">{t("Version")}</div>
                <div className="font-mono font-medium tabular-nums">{formatAddonVersion(details.version)}</div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

