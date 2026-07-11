"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ChevronDown,
  Clock,
  Download,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import NoRecordsFound from "@/components/no-records-found";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppSettings } from "@/contexts/app-settings-context";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";
import type { EventVendorListRow, EventVendorsSummary } from "@/lib/event-platform/vendors/vendor-types";
import { EVENT_VENDOR_STATUSES } from "@/lib/event-platform/vendors/vendor-types";
import { joinVendorContactName } from "@/lib/event-platform/vendors/vendor-contact-name";
import { formatCurrency } from "@/lib/format-currency";
import { formatPhone, formatPhoneDisplay, normalizeMobileForStorage } from "@/lib/phone";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

function money(settings: ReturnType<typeof useAppSettings>["settings"], value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return formatCurrency(n, settings);
}

function vendorInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (s === "pending") return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  if (s === "suspended") return "bg-red-500/15 text-red-700 dark:text-red-400";
  if (s === "rejected") return "bg-red-500/15 text-red-700 dark:text-red-400";
  return "bg-muted text-muted-foreground";
}

function StatCard(props: {
  label: string;
  value: string;
  sub?: string;
  subClass?: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{props.label}</p>
          <p className="text-2xl font-bold tracking-tight">{props.value}</p>
          {props.sub ? (
            <p className={cn("text-xs", props.subClass ?? "text-muted-foreground")}>{props.sub}</p>
          ) : null}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", props.iconBg)}>
          {props.icon}
        </div>
      </div>
    </div>
  );
}

export function EventPlatformVendorsAdmin() {
  const { settings } = useAppSettings();
  const [items, setItems] = React.useState<EventVendorListRow[] | null>(null);
  const [summary, setSummary] = React.useState<EventVendorsSummary | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [planFilter, setPlanFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(PAGE_SIZE);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    vendorName: "",
    companyName: "",
    contactFirstName: "",
    contactLastName: "",
    email: "",
    phone: "",
    website: "",
    status: "pending",
    defaultCommissionRate: "",
  });

  const reload = React.useCallback(async () => {
    const res = await fetch("/api/event-platform/vendors", { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      items?: EventVendorListRow[];
      summary?: EventVendorsSummary;
      message?: string;
    } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not load vendors.");
      setItems([]);
      setSummary(null);
      return;
    }
    setItems(data.items ?? []);
    setSummary(data.summary ?? null);
    setSelected(new Set());
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  React.useEffect(() => {
    setPage(1);
  }, [search, statusFilter, planFilter, pageSize]);

  const filtered = React.useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items.filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (planFilter === "default" && v.commissionPlan !== "default") return false;
      if (planFilter === "custom" && v.commissionPlan !== "custom") return false;
      if (!q) return true;
      return (
        v.vendorName.toLowerCase().includes(q) ||
        (v.companyName ?? "").toLowerCase().includes(q) ||
        (v.email ?? "").toLowerCase().includes(q) ||
        (v.phone ?? "").toLowerCase().includes(q) ||
        (v.contactName ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter, planFilter]);

  const lastPage = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, filtered.length);

  const allPageSelected = pageItems.length > 0 && pageItems.every((v) => selected.has(v.id));

  function toggleAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const v of pageItems) {
        if (checked) next.add(v.id);
        else next.delete(v.id);
      }
      return next;
    });
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setPlanFilter("all");
    setPage(1);
  }

  function exportVendors(rows: EventVendorListRow[]) {
    const header = [
      "Vendor",
      "Company",
      "Contact",
      "Email",
      "Phone",
      "Status",
      "Commission %",
      "Plan",
      "Total Sales",
      "Commission Earned",
      "Pending Payout",
      "Joined",
    ];
    const lines = rows.map((v) =>
      [
        v.vendorName,
        v.companyName ?? "",
        v.contactName ?? "",
        v.email ?? "",
        v.phone ?? "",
        v.status,
        v.commissionRate,
        v.commissionPlan,
        v.totalSales,
        v.commissionEarned,
        v.pendingPayout,
        v.createdAt,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "event-platform-vendors.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function setVendorStatus(id: string, status: string) {
    const res = await fetch(`/api/event-platform/vendors/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Update failed.");
      return;
    }
    toast.success(`Vendor marked as ${status}.`);
    await reload();
  }

  async function bulkSetStatus(status: string) {
    const ids = [...selected];
    if (!ids.length) return;
    await Promise.all(ids.map((id) => setVendorStatus(id, status)));
    setSelected(new Set());
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vendorName.trim()) {
      toast.error("Vendor name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/event-platform/vendors", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          vendorName: form.vendorName.trim(),
          companyName: form.companyName.trim() || null,
          contactName: joinVendorContactName(form.contactFirstName, form.contactLastName),
          email: form.email.trim() || null,
          phone: normalizeMobileForStorage(form.phone),
          website: form.website.trim() || null,
          status: form.status,
          defaultCommissionRate: form.defaultCommissionRate.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Create failed.");
      toast.success("Vendor created.");
      setSheetOpen(false);
      setForm({
        vendorName: "",
        companyName: "",
        contactFirstName: "",
        contactLastName: "",
        email: "",
        phone: "",
        website: "",
        status: "pending",
        defaultCommissionRate: "",
      });
      await reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  if (items === null) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading vendors…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Vendors</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage all vendors and organizers on the platform, their commission rates, and status.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportVendors(filtered)}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={selected.size === 0}>
                Bulk Actions
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportVendors(filtered.filter((v) => selected.has(v.id)))}>
                Export selected
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void bulkSetStatus("active")}>Mark active</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void bulkSetStatus("suspended")}>Suspend</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total Vendors"
            value={String(summary.totalVendors)}
            sub={
              summary.newVendorsThisMonth > 0
                ? `↑ ${summary.newVendorsThisMonth} new this month`
                : `${summary.newVendorsThisMonth} new this month`
            }
            subClass="text-emerald-600 dark:text-emerald-400"
            icon={<Store className="h-5 w-5 text-violet-600" />}
            iconBg="bg-violet-500/10"
          />
          <StatCard
            label="Active Vendors"
            value={String(summary.activeVendors)}
            sub={`${summary.activePercent}% of total vendors`}
            icon={<Users className="h-5 w-5 text-emerald-600" />}
            iconBg="bg-emerald-500/10"
          />
          <StatCard
            label="Pending Vendors"
            value={String(summary.pendingVendors)}
            sub="Awaiting approval"
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            iconBg="bg-amber-500/10"
          />
          <StatCard
            label="Total Commission Earned"
            value={money(settings, summary.totalCommissionEarned)}
            sub={
              summary.commissionTrendPercent >= 0
                ? `↑ ${summary.commissionTrendPercent}% vs last month`
                : `${summary.commissionTrendPercent}% vs last month`
            }
            subClass={
              summary.commissionTrendPercent >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }
            icon={<TrendingUp className="h-5 w-5 text-indigo-600" />}
            iconBg="bg-indigo-500/10"
          />
          <StatCard
            label="Pending Payouts"
            value={money(settings, summary.pendingPayoutAmount)}
            sub={`${summary.pendingPayoutVendorCount} vendor${summary.pendingPayoutVendorCount === 1 ? "" : "s"}`}
            icon={<Wallet className="h-5 w-5 text-rose-600" />}
            iconBg="bg-rose-500/10"
          />
        </div>
      ) : null}

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vendor name, company, email or phone…"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-[160px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {EVENT_VENDOR_STATUSES.filter((s) => s !== "archived").map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="All Commission Plans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Commission Plans</SelectItem>
              <SelectItem value="default">Default Plan</SelectItem>
              <SelectItem value="custom">Custom Plan</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="shrink-0">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <button
            type="button"
            className="shrink-0 text-sm text-primary hover:underline"
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <NoRecordsFound
          icon={Store}
          title="No vendors found"
          description="Add your first event vendor/organizer."
          hasFilters={!!search || statusFilter !== "all" || planFilter !== "all"}
          onClearFilters={resetFilters}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allPageSelected}
                      onCheckedChange={(v) => toggleAll(v === true)}
                      aria-label="Select all on page"
                    />
                  </TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                  <TableHead className="text-right">Commission Earned</TableHead>
                  <TableHead className="text-right">Pending Payout</TableHead>
                  <TableHead>Joined On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(v.id)}
                        onCheckedChange={(checked) => toggleOne(v.id, checked === true)}
                        aria-label={`Select ${v.vendorName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                          {vendorInitials(v.vendorName)}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={EVENT_PLATFORM_PATHS.vendorDetail(v.id)}
                            className="font-medium hover:text-primary hover:underline"
                          >
                            {v.vendorName}
                          </Link>
                          {v.website ? (
                            <p className="truncate text-xs text-muted-foreground">{v.website}</p>
                          ) : v.companyName ? (
                            <p className="truncate text-xs text-muted-foreground">{v.companyName}</p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{v.contactName ?? "—"}</p>
                      {v.email ? <p className="text-xs text-muted-foreground">{v.email}</p> : null}
                      {v.phone ? (
                        <p className="text-xs text-muted-foreground">{formatPhoneDisplay(v.phone)}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                          statusClass(v.status),
                        )}
                      >
                        {v.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{v.commissionRate}%</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {v.commissionPlan === "custom" ? "Custom Plan" : "Default Plan"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {money(settings, v.totalSales)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {money(settings, v.commissionEarned)}
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="text-sm font-medium">{money(settings, v.pendingPayout)}</p>
                      {v.pendingPayoutStatus !== "none" ? (
                        <span
                          className={cn(
                            "text-xs capitalize",
                            v.pendingPayoutStatus === "hold"
                              ? "text-red-600 dark:text-red-400"
                              : "text-amber-600 dark:text-amber-400",
                          )}
                        >
                          {v.pendingPayoutStatus}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(v.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={EVENT_PLATFORM_PATHS.vendorDetail(v.id)}>View</Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={EVENT_PLATFORM_PATHS.vendorDetail(v.id)}>View details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void setVendorStatus(v.id, "active")}>
                              Mark active
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void setVendorStatus(v.id, "suspended")}>
                              Suspend
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => void setVendorStatus(v.id, "rejected")}
                            >
                              Reject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {from} to {to} of {filtered.length} vendors
            </p>
            <Pagination
              page={page}
              lastPage={lastPage}
              total={filtered.length}
              from={from}
              to={to}
              entityLabel="vendors"
              showSummary={false}
              onPageChange={setPage}
            />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground whitespace-nowrap">Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add vendor</SheetTitle>
          </SheetHeader>
          <form onSubmit={(e) => void submitCreate(e)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="vn">Vendor name *</Label>
              <Input
                id="vn"
                value={form.vendorName}
                onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cn">Company name</Label>
              <Input
                id="cn"
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-first">First name</Label>
                <Input
                  id="contact-first"
                  value={form.contactFirstName}
                  onChange={(e) => setForm((f) => ({ ...f, contactFirstName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-last">Last name</Label>
                <Input
                  id="contact-last"
                  value={form.contactLastName}
                  onChange={(e) => setForm((f) => ({ ...f, contactLastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))}
                placeholder="(000) 000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_VENDOR_STATUSES.filter((s) => s !== "archived").map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rate">Default commission %</Label>
              <Input
                id="rate"
                inputMode="decimal"
                value={form.defaultCommissionRate}
                onChange={(e) => setForm((f) => ({ ...f, defaultCommissionRate: e.target.value }))}
                placeholder="10"
              />
            </div>
            <SheetFooter className="pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Create vendor"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
