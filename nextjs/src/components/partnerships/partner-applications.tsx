"use client";

import * as React from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Search,
  SlidersHorizontal,
  UserPlus,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
import { TableActionButton } from "@/components/ui/table-action-button";
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

type Application = {
  id: string;
  name: string;
  email: string | null;
  brandName: string | null;
  slug: string;
  status: string;
  notes: string | null;
  createdAt: string;
};

type Stats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

const PER_PAGE = 8;

type ApplicationFilters = {
  search: string;
  brandFilter: string;
  statusFilter: string;
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_APPLICATION_FILTERS: ApplicationFilters = {
  search: "",
  brandFilter: "all",
  statusFilter: "all",
  dateFrom: "",
  dateTo: "",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function ApplicantAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold">
      {initials(name) || "A"}
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

function statusLabel(status: string): string {
  if (status === "active") return "Approved";
  if (status === "pending") return "Pending";
  if (status === "rejected") return "Rejected";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusBadgeClass(status: string): string {
  if (status === "pending") {
    return " bg-amber-50 text-muted-foreground dark: dark:bg-amber-950 dark:text-muted-foreground";
  }
  if (status === "active") {
    return " bg-emerald-50 text-muted-foreground dark: dark:bg-emerald-950 dark:text-muted-foreground";
  }
  if (status === "rejected") {
    return " bg-rose-50 text-muted-foreground dark: dark:bg-rose-950 dark:text-muted-foreground";
  }
  return "";
}

function exportApplicationsCsv(rows: Application[]) {
  const headers = ["Applicant", "Email", "Brand", "Applied On", "Status", "Notes"];
  const data = rows.map((r) => [
    r.name,
    r.email ?? "",
    r.brandName ?? "",
    r.createdAt,
    statusLabel(r.status),
    r.notes ?? "",
  ]);
  const csv = [headers, ...data]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `partner-applications-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function pageNumbers(current: number, total: number): number[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, 5].filter((n) => n <= total);
  if (current >= total - 2) return Array.from({ length: 5 }, (_, i) => total - 4 + i).filter((n) => n >= 1);
  return [current - 2, current - 1, current, current + 1, current + 2];
}

export default function PartnerApplications() {
  const [rows, setRows] = React.useState<Application[]>([]);
  const [stats, setStats] = React.useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [brandOptions, setBrandOptions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actingId, setActingId] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<ApplicationFilters>(DEFAULT_APPLICATION_FILTERS);
  const [searchDraft, setSearchDraft] = React.useState("");
  const [page, setPage] = React.useState(1);

  const patchFilters = React.useCallback((patch: Partial<ApplicationFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const f = filters;
      const url = new URL("/api/partnerships/applications", window.location.origin);
      url.searchParams.set("status", f.statusFilter === "all" ? "all" : f.statusFilter);
      if (f.search.trim()) url.searchParams.set("search", f.search.trim());
      if (f.brandFilter !== "all") url.searchParams.set("brandName", f.brandFilter);
      if (f.dateFrom) url.searchParams.set("dateFrom", f.dateFrom);
      if (f.dateTo) url.searchParams.set("dateTo", f.dateTo);

      const res = await fetch(url.toString(), { credentials: "include" });
      const d = await res.json();
      if (d?.ok) {
        setRows(d.items as Application[]);
        if (d.stats) setStats(d.stats as Stats);
        if (Array.isArray(d.brands)) setBrandOptions(d.brands as string[]);
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((prev) => (prev.search === searchDraft ? prev : { ...prev, search: searchDraft }));
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const applyFilters = () => {
    patchFilters({ search: searchDraft });
  };

  const clearFilters = () => {
    setSearchDraft("");
    setFilters(DEFAULT_APPLICATION_FILTERS);
    setPage(1);
  };

  const act = async (id: string, action: "approve" | "reject") => {
    setActingId(id);
    try {
    const res = await fetch(`/api/partnerships/applications/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
        toast.success(action === "approve" ? "Application approved." : "Application rejected.");
      void load();
    } else {
        toast.error(d?.message ?? "Action failed.");
      }
    } finally {
      setActingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const from = rows.length === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
  const to = Math.min(currentPage * PER_PAGE, rows.length);

  const activeFilterCount =
    (filters.search.trim() ? 1 : 0) +
    (filters.brandFilter !== "all" ? 1 : 0) +
    (filters.statusFilter !== "all" ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0);

  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading applications…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Review and manage partner applications. Approve applications to add partners and assign
          ownership.
        </p>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() => {
            exportApplicationsCsv(rows);
            toast.success("Applications exported.");
          }}
          disabled={rows.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          label="Total Applications"
          value={stats.total}
          sub="All time"
          icon={<UserPlus className="h-8 w-8" />}
          


        />
        <DashboardStatCard
          label="Pending Review"
          value={stats.pending}
          sub="Awaiting your action"
          icon={<Clock className="h-8 w-8" />}
          


        />
        <DashboardStatCard
          label="Approved"
          value={stats.approved}
          sub="Partners added"
          icon={<CheckCircle2 className="h-8 w-8" />}
          


        />
        <DashboardStatCard
          label="Rejected"
          value={stats.rejected}
          sub="Applications rejected"
          icon={<XCircle className="h-8 w-8" />}
          


        />
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="relative min-w-0 flex-1 lg:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="Search by name, email or company…"
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
                {brandOptions.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.statusFilter}
              onValueChange={(v) => patchFilters({ statusFilter: v })}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status: All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex flex-wrap items-center gap-2">
              <DatePickerInput
                value={filters.dateFrom}
                onChange={(e) => patchFilters({ dateFrom: e.target.value })}
                className="h-9 w-[10.5rem]"
              />
              <span className="text-muted-foreground text-sm">–</span>
              <DatePickerInput
                value={filters.dateTo}
                onChange={(e) => patchFilters({ dateTo: e.target.value })}
                className="h-9 w-[10.5rem]"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="h-9" onClick={applyFilters}>
                Apply
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 gap-1.5"
                onClick={clearFilters}
                disabled={activeFilterCount === 0 && !searchDraft.trim()}
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
                <TableHead>Applicant</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Brand</TableHead>
                <TableHead>Applied On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message / Note</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
              {pageRows.length === 0 ? (
            <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No applications found.
              </TableCell>
            </TableRow>
          ) : (
                pageRows.map((r) => {
                  const isPending = r.status === "pending";
                  const subtitle =
                    r.brandName && r.brandName !== r.name ? r.brandName : r.slug.replace(/-/g, " ");
                  return (
              <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-start gap-3 min-w-[180px]">
                          <ApplicantAvatar name={r.name} />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{r.name}</div>
                            <div className="text-xs text-muted-foreground truncate capitalize">
                              {subtitle}
                            </div>
                          </div>
                  </div>
                </TableCell>
                      <TableCell className="text-sm">{r.email ?? "—"}</TableCell>
                      <TableCell className="text-sm">{r.brandName ?? "—"}</TableCell>
                      <TableCell>
                        <DateTimeCell value={r.createdAt} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("capitalize font-normal", statusBadgeClass(r.status))}
                        >
                          {statusLabel(r.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                        {r.notes?.trim() || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <TableActionButton
                          label={isPending ? "Approve" : "View"}
                          onPrimaryClick={
                            isPending
                              ? () => void act(r.id, "approve")
                              : () => {
                                  if (r.notes?.trim()) {
                                    toast.message(r.notes.trim());
                                  } else {
                                    toast.info("No notes for this application.");
                                  }
                                }
                          }
                          disabled={actingId === r.id}
                          className="ml-auto"
                          items={[
                            {
                              label: "Approve",
                              onSelect: () => void act(r.id, "approve"),
                              disabled: actingId === r.id || !isPending,
                            },
                            {
                              label: "Reject",
                              onSelect: () => void act(r.id, "reject"),
                              disabled: actingId === r.id || !isPending,
                              destructive: true,
                            },
                            {
                              label: r.notes?.trim() ? "View Note" : "No notes",
                              onSelect: () => {
                                if (r.notes?.trim()) toast.message(r.notes.trim());
                              },
                              disabled: !r.notes?.trim(),
                            },
                          ]}
                        />
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
            Showing {from} to {to} of {rows.length} applications
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
