"use client";

import * as React from "react";
import { CalendarDays, Download, Loader2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, parseDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";

type HistoryRow = {
  id: string;
  brandId: string;
  brandName: string;
  brandLogo: string | null;
  holderId: string | null;
  holderName: string | null;
  holderEmail: string | null;
  action: string;
  oldCurrentOwnershipPercent: number | null;
  newCurrentOwnershipPercent: number | null;
  oldMinimumOwnershipPercent: number | null;
  newMinimumOwnershipPercent: number | null;
  changedByUserId: string | null;
  changedBy: string | null;
  notes: string | null;
  createdAt: string;
};

type BrandOption = { id: string; name: string };
type PartnerOption = { id: string; name: string };
type ChangedByOption = { id: string; name: string };

const PER_PAGE = 8;

type HistoryFilters = {
  brandFilter: string;
  partnerFilter: string;
  actionFilter: string;
  changedByFilter: string;
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  brandFilter: "all",
  partnerFilter: "all",
  actionFilter: "all",
  changedByFilter: "all",
  dateFrom: "",
  dateTo: "",
};

const ACTION_OPTIONS = [
  { value: "holder_added", label: "Holder Added" },
  { value: "ownership_updated", label: "Ownership Updated" },
  { value: "brand_created", label: "Brand Created" },
  { value: "holder_deactivated", label: "Holder Removed" },
] as const;

type ActionMeta = { label: string; sub: string; className: string };

function getActionMeta(row: HistoryRow): ActionMeta {
  if (row.action === "holder_added") {
    return {
      label: "Holder Added",
      sub: "New partner added",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    };
  }
  if (row.action === "brand_created") {
    return {
      label: "Brand Created",
      sub: "Brand created",
      className: "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-200",
    };
  }
  if (row.action === "holder_deactivated") {
    return {
      label: "Holder Removed",
      sub: "Partner removed",
      className: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200",
    };
  }
  if (row.action === "ownership_updated") {
    const currentChanged =
      row.oldCurrentOwnershipPercent !== row.newCurrentOwnershipPercent;
    const minimumChanged =
      row.oldMinimumOwnershipPercent !== row.newMinimumOwnershipPercent;
    if (!currentChanged && minimumChanged) {
      return {
        label: "Ownership Updated",
        sub: "Minimum ownership changed",
        className: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200",
      };
    }
    return {
      label: "Ownership Updated",
      sub: "Ownership percentage changed",
      className: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
    };
  }
  const label = row.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    label,
    sub: label,
    className: "border-border bg-muted text-foreground",
  };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function BrandAvatar({ name, logo }: { name: string; logo: string | null }) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt="" className="h-8 w-8 shrink-0 rounded-full border object-cover" />
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted text-[10px] font-semibold">
      {initials(name) || "B"}
    </div>
  );
}

function PersonAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted text-[10px] font-semibold">
      {initials(name) || "?"}
    </div>
  );
}

function DateTimeCell({ value }: { value: string }) {
  const ctx = useAppSettingsOptional();
  const settings = ctx?.settings ?? {};
  const date = parseDate(value);
  if (!date) return <span className="text-muted-foreground">—</span>;

  const dateStr = formatDate(value, settings);
  const hour12 = settings.timeFormat !== "24";
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12,
  });

  return (
    <div className="flex items-start gap-2 min-w-[120px]">
      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <div className="text-sm font-medium whitespace-nowrap">{dateStr}</div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">{timeStr}</div>
      </div>
    </div>
  );
}

function OwnershipChangeCell({
  oldValue,
  newValue,
}: {
  oldValue: number | null;
  newValue: number | null;
}) {
  if (oldValue == null && newValue == null) {
    return <span className="text-muted-foreground">—</span>;
  }

  const oldLabel = oldValue != null ? `${oldValue}%` : "—%";
  const newLabel = newValue != null ? `${newValue}%` : "—%";

  let delta: { text: string; className: string } | null = null;
  if (oldValue == null && newValue != null) {
    delta = { text: "(New)", className: "text-muted-foreground" };
  } else if (oldValue != null && newValue != null && oldValue !== newValue) {
    const diff = newValue - oldValue;
    delta = {
      text: diff > 0 ? `(+${diff}%)` : `(${diff}%)`,
      className: diff > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
    };
  }

  return (
    <div className="min-w-[100px]">
      <div className="text-sm tabular-nums">
        {oldLabel} → {newLabel}
      </div>
      {delta ? <div className={cn("text-xs tabular-nums", delta.className)}>{delta.text}</div> : null}
    </div>
  );
}

function exportHistoryCsv(rows: HistoryRow[]) {
  const headers = [
    "Date",
    "Brand",
    "Partner",
    "Action",
    "Old Current %",
    "New Current %",
    "Old Minimum %",
    "New Minimum %",
    "Changed By",
    "Notes",
  ];
  const data = rows.map((r) => [
    r.createdAt,
    r.brandName,
    r.holderName ?? "",
    r.action,
    r.oldCurrentOwnershipPercent ?? "",
    r.newCurrentOwnershipPercent ?? "",
    r.oldMinimumOwnershipPercent ?? "",
    r.newMinimumOwnershipPercent ?? "",
    r.changedBy ?? "",
    r.notes ?? "",
  ]);
  const csv = [headers, ...data]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ownership-history-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function pageNumbers(current: number, total: number): number[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, 5].filter((n) => n <= total);
  if (current >= total - 2) return Array.from({ length: 5 }, (_, i) => total - 4 + i).filter((n) => n >= 1);
  return [current - 2, current - 1, current, current + 1, current + 2];
}

export default function OwnershipHistoryAdmin() {
  const [rows, setRows] = React.useState<HistoryRow[]>([]);
  const [brands, setBrands] = React.useState<BrandOption[]>([]);
  const [partners, setPartners] = React.useState<PartnerOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<HistoryFilters>(DEFAULT_HISTORY_FILTERS);
  const [changedByOptions, setChangedByOptions] = React.useState<ChangedByOption[]>([]);
  const [page, setPage] = React.useState(1);

  const patchFilters = React.useCallback((patch: Partial<HistoryFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const f = filters;
      const url = new URL("/api/ownership/history", window.location.origin);
      if (f.brandFilter !== "all") url.searchParams.set("brandId", f.brandFilter);
      if (f.partnerFilter !== "all") url.searchParams.set("holderId", f.partnerFilter);
      if (f.actionFilter !== "all") url.searchParams.set("action", f.actionFilter);
      if (f.changedByFilter !== "all") url.searchParams.set("changedByUserId", f.changedByFilter);
      if (f.dateFrom) url.searchParams.set("dateFrom", f.dateFrom);
      if (f.dateTo) url.searchParams.set("dateTo", f.dateTo);

      const [historyRes, brandsRes, partnersRes] = await Promise.all([
        fetch(url.toString(), { credentials: "include" }),
        fetch("/api/ownership/brands", { credentials: "include" }),
        fetch("/api/ownership/partners", { credentials: "include" }),
      ]);
      const historyData = await historyRes.json();
      const brandsData = await brandsRes.json();
      const partnersData = await partnersRes.json();
      if (historyData?.ok) {
        const items = historyData.items as HistoryRow[];
        setRows(items);
        setChangedByOptions((prev) => {
          const map = new Map(prev.map((o) => [o.id, o.name]));
          for (const row of items) {
            if (row.changedByUserId && row.changedBy) {
              map.set(row.changedByUserId, row.changedBy);
            }
          }
          return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
        });
      }
      if (brandsData?.ok) {
        setBrands(
          (brandsData.items as { id: string; name: string }[]).map((b) => ({
            id: b.id,
            name: b.name,
          })),
        );
      }
      if (partnersData?.ok) {
        setPartners(
          (partnersData.items as { id: string; name: string }[]).map((p) => ({
            id: p.id,
            name: p.name,
          })),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = () => {
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_HISTORY_FILTERS);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const from = rows.length === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
  const to = Math.min(currentPage * PER_PAGE, rows.length);

  const activeFilterCount =
    (filters.brandFilter !== "all" ? 1 : 0) +
    (filters.partnerFilter !== "all" ? 1 : 0) +
    (filters.actionFilter !== "all" ? 1 : 0) +
    (filters.changedByFilter !== "all" ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0);

  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading history…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">
          View all ownership changes and activities across your brands and partners.
        </p>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() => {
            exportHistoryCsv(rows);
            toast.success("History exported.");
          }}
          disabled={rows.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <DatePickerInput
                value={filters.dateFrom}
                onChange={(e) => patchFilters({ dateFrom: e.target.value })}
                className="h-9 w-[10.5rem]"
                placeholder="From date"
              />
              <span className="text-muted-foreground text-sm">–</span>
              <DatePickerInput
                value={filters.dateTo}
                onChange={(e) => patchFilters({ dateTo: e.target.value })}
                className="h-9 w-[10.5rem]"
                placeholder="To date"
              />
            </div>
            <Select
              value={filters.brandFilter}
              onValueChange={(v) => patchFilters({ brandFilter: v })}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.partnerFilter}
              onValueChange={(v) => patchFilters({ partnerFilter: v })}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="All Partners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Partners</SelectItem>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.actionFilter}
              onValueChange={(v) => patchFilters({ actionFilter: v })}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {ACTION_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.changedByFilter}
              onValueChange={(v) => patchFilters({ changedByFilter: v })}
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Changed By: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Changed By: All</SelectItem>
                {changedByOptions.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="secondary" className="h-9" onClick={applyFilters}>
                Apply
              </Button>
              <Button
                variant="outline"
                className="h-9 gap-1.5"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 ? (
                  <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1.5 text-[10px]">
                    {activeFilterCount}
                  </Badge>
                ) : null}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Partner / Holder</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Current Ownership</TableHead>
                <TableHead>Minimum Ownership</TableHead>
                <TableHead>Changed By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No ownership history found.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => {
                  const actionMeta = getActionMeta(row);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <DateTimeCell value={row.createdAt} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <BrandAvatar name={row.brandName} logo={row.brandLogo} />
                          <span className="text-sm font-medium truncate">{row.brandName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.holderName ? (
                          <div className="flex items-start gap-2 min-w-[160px]">
                            <PersonAvatar name={row.holderName} />
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{row.holderName}</div>
                              {row.holderEmail ? (
                                <div className="text-xs text-muted-foreground truncate">
                                  {row.holderEmail}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div
                          className={cn(
                            "inline-flex flex-col rounded-md border px-2.5 py-1.5 min-w-[140px]",
                            actionMeta.className,
                          )}
                        >
                          <span className="text-xs font-semibold leading-tight">{actionMeta.label}</span>
                          <span className="text-[10px] opacity-80 leading-tight mt-0.5">{actionMeta.sub}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <OwnershipChangeCell
                          oldValue={row.oldCurrentOwnershipPercent}
                          newValue={row.newCurrentOwnershipPercent}
                        />
                      </TableCell>
                      <TableCell>
                        <OwnershipChangeCell
                          oldValue={row.oldMinimumOwnershipPercent}
                          newValue={row.newMinimumOwnershipPercent}
                        />
                      </TableCell>
                      <TableCell>
                        {row.changedBy ? (
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <PersonAvatar name={row.changedBy} />
                            <span className="text-sm truncate">{row.changedBy}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                        {row.notes ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {rows.length > 0 ? (
        <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {from} to {to} of {rows.length} history records
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            {pageNumbers(currentPage, totalPages).map((n) => (
              <Button
                key={n}
                variant={n === currentPage ? "default" : "outline"}
                size="sm"
                className="min-w-9"
                onClick={() => setPage(n)}
              >
                {n}
              </Button>
            ))}
            {totalPages > 5 && currentPage < totalPages - 2 ? (
              <>
                <span className="px-1">…</span>
                <Button variant="outline" size="sm" className="min-w-9" onClick={() => setPage(totalPages)}>
                  {totalPages}
                </Button>
              </>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
