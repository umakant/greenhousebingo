"use client";

import * as React from "react";
import {
  AlertTriangle,
  ClipboardList,
  Clock,
  Loader2,
  Search,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";

import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { FormattedDate } from "@/components/formatted-date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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

type RequestRow = {
  id: string;
  brandId: string;
  brandName: string;
  partnerName: string;
  email: string | null;
  requestedCurrentOwnership: number;
  requestedMinimumOwnership: number;
  status: string;
  conflictDetected: boolean;
  conflictMessage: string | null;
  createdAt: string;
};

type BrandOption = { id: string; name: string };

const PER_PAGE = 8;

type RequestFilters = {
  search: string;
  brandFilter: string;
  statusFilter: string;
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_REQUEST_FILTERS: RequestFilters = {
  search: "",
  brandFilter: "all",
  statusFilter: "all",
  dateFrom: "",
  dateTo: "",
};

function PartnerAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold">
      {initials || "P"}
    </div>
  );
}

function OwnershipBar({ value }: { value: number }) {
  return (
    <div className="flex min-w-[100px] items-center gap-2">
      <Progress value={Math.min(100, value)} className="h-2 flex-1" />
      <span className="w-10 text-right text-sm tabular-nums">{value}%</span>
    </div>
  );
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "conflict" || status === "rejected") return "destructive";
  if (status === "approved" || status === "resolved") return "default";
  if (status === "pending_brand_approval") return "outline";
  return "secondary";
}

function statusLabel(status: string): string {
  if (status === "pending") return "Awaiting signature";
  if (status === "pending_brand_approval") return "Awaiting brand approval";
  if (status === "conflict") return "Conflict";
  if (status === "approved") return "Approved";
  if (status === "resolved") return "Resolved";
  if (status === "rejected") return "Rejected";
  return status.replace(/_/g, " ");
}

export default function OwnershipRequestsAdmin() {
  const [rows, setRows] = React.useState<RequestRow[]>([]);
  const [brands, setBrands] = React.useState<BrandOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<RequestFilters>(DEFAULT_REQUEST_FILTERS);
  const [searchDraft, setSearchDraft] = React.useState("");
  const [page, setPage] = React.useState(1);

  const patchFilters = React.useCallback((patch: Partial<RequestFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const f = filters;
      const url = new URL("/api/ownership/requests", window.location.origin);
      if (f.search.trim()) url.searchParams.set("search", f.search.trim());
      if (f.brandFilter !== "all") url.searchParams.set("brandId", f.brandFilter);
      if (f.statusFilter !== "all") url.searchParams.set("status", f.statusFilter);
      if (f.dateFrom) url.searchParams.set("dateFrom", f.dateFrom);
      if (f.dateTo) url.searchParams.set("dateTo", f.dateTo);

      const [requestsRes, brandsRes] = await Promise.all([
        fetch(url.toString(), { credentials: "include" }),
        fetch("/api/ownership/brands", { credentials: "include" }),
      ]);
      const requestsData = await requestsRes.json();
      const brandsData = await brandsRes.json();
      if (requestsData?.ok) setRows(requestsData.items as RequestRow[]);
      if (brandsData?.ok) {
        setBrands(
          (brandsData.items as { id: string; name: string }[]).map((b) => ({
            id: b.id,
            name: b.name,
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
    setFilters(DEFAULT_REQUEST_FILTERS);
    setPage(1);
  };

  const stats = React.useMemo(() => {
    const pending = rows.filter(
      (r) => r.status === "pending" || r.status === "pending_brand_approval",
    ).length;
    const conflicts = rows.filter((r) => r.status === "conflict" || r.conflictDetected).length;
    const resolved = rows.filter(
      (r) => r.status === "approved" || r.status === "resolved" || r.status === "rejected",
    ).length;
    return {
      total: rows.length,
      pending,
      conflicts,
      resolved,
    };
  }, [rows]);

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

  if (loading && rows.length === 0 && brands.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading requests…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Review partner ownership requests, agreement progress, and conflicts. New partner requests
        appear here when a partnership agreement is sent.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          label="Total Requests"
          value={stats.total}
          sub="All recorded requests"
          icon={<ClipboardList className="h-8 w-8" />}
        />
        <DashboardStatCard
          label="Pending"
          value={stats.pending}
          sub="Awaiting review"
          icon={<Clock className="h-8 w-8" />}
        />
        <DashboardStatCard
          label="Conflicts"
          value={stats.conflicts}
          sub="Ownership limit exceeded"
          icon={<ShieldAlert className="h-8 w-8" />}
        />
        <DashboardStatCard
          label="Resolved"
          value={stats.resolved}
          sub="Approved or closed"
          icon={<ClipboardList className="h-8 w-8" />}
        />
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="Search by partner, brand or email…"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-end">
              <div className="space-y-1 xl:w-[160px]">
                <Label className="text-xs text-muted-foreground">Brand</Label>
                <Select
                  value={filters.brandFilter}
                  onValueChange={(v) => patchFilters({ brandFilter: v })}
                >
                  <SelectTrigger className="h-9">
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
              </div>
              <div className="space-y-1 xl:w-[140px]">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={filters.statusFilter}
                  onValueChange={(v) => patchFilters({ statusFilter: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Awaiting signature</SelectItem>
                    <SelectItem value="pending_brand_approval">Awaiting brand approval</SelectItem>
                    <SelectItem value="conflict">Conflict</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 xl:w-[11rem]">
                <Label className="text-xs text-muted-foreground">From</Label>
                <DatePickerInput
                  value={filters.dateFrom}
                  onChange={(e) => patchFilters({ dateFrom: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1 xl:w-[11rem]">
                <Label className="text-xs text-muted-foreground">To</Label>
                <DatePickerInput
                  value={filters.dateTo}
                  onChange={(e) => patchFilters({ dateTo: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-1">
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
                <TableHead>Partner</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Requested %</TableHead>
                <TableHead>Minimum %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Conflict</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No ownership requests found.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-start gap-3 min-w-[180px]">
                        <PartnerAvatar name={row.partnerName} />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{row.partnerName}</div>
                          {row.email ? (
                            <div className="text-xs text-muted-foreground truncate">{row.email}</div>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{row.brandName}</TableCell>
                    <TableCell>
                      <OwnershipBar value={row.requestedCurrentOwnership} />
                    </TableCell>
                    <TableCell>
                      <OwnershipBar value={row.requestedMinimumOwnership} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)}>
                        {statusLabel(row.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      {row.conflictDetected ? (
                        <span className="flex items-start gap-1 text-xs text-destructive">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          {row.conflictMessage ?? "Conflict detected"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      <FormattedDate value={row.createdAt} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {rows.length > 0 ? (
        <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {from} to {to} of {rows.length} requests
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="min-w-[2rem] text-center font-medium text-foreground">{currentPage}</span>
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
