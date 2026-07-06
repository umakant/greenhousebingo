"use client";

import * as React from "react";
import {
  Ban,
  CheckCircle2,
  DollarSign,
  Download,
  Eye,
  Filter,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
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
import { TableActionButton } from "@/components/ui/table-action-button";
import { VendorFormSheet, type VendorFormValues } from "@/components/marketplace/admin/vendor-form-sheet";
import { splitHolderName } from "@/lib/brand-ownership-holder-name";
import { formatPhone, formatPhoneDisplay } from "@/lib/phone";
import { getImagePath } from "@/utils/image-path";
import {
  EMPTY_LOGIN_ACCESS,
  presetPermissionsForRole,
  type VendorLoginAccessForm,
} from "@/lib/marketplace-vendor-portal-permissions-client";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { DASHBOARD_STAT_ICON_TINT } from "@/components/dashboard/dashboard-stat-styles";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";

const PAGE_SIZE = 10;

type VendorRow = {
  id: string;
  name: string;
  slug: string;
  contactEmail: string | null;
  phone: string | null;
  description: string | null;
  logoUrl: string | null;
  commissionRate: number | null;
  status: string;
  productCount: number;
  orderCount: number;
  revenue: number;
  createdAt: string;
};

type Summary = {
  vendorCount: number;
  activeVendors: number;
  productCount: number;
  orderCount: number;
  totalRevenue: number;
};

type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  lastPage: number;
  from: number;
  to: number;
};

function StatCard({
  icon,
  label,
  value,
  sub,
  tint = DASHBOARD_STAT_ICON_TINT,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tint)}>{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          {sub ? <p className="truncate text-xs text-muted-foreground">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function VendorAvatar({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const logoSrc = logoUrl ? getImagePath(logoUrl) : "";
  if (logoSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoSrc} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {initials(name)}
    </span>
  );
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200";
    case "suspended":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
    case "inactive":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatJoinedDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function VendorsAdmin({ canManage }: { canManage: boolean }) {
  const { settings } = useAppSettings();
  const [rows, setRows] = React.useState<VendorRow[]>([]);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [pagination, setPagination] = React.useState<PaginationMeta>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    lastPage: 1,
    from: 0,
    to: 0,
  });
  const [loading, setLoading] = React.useState(true);

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [productsFilter, setProductsFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("name_asc");
  const [page, setPage] = React.useState(1);

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<VendorFormValues | null>(null);

  const money = (n: number) => formatCurrency(Number(n) || 0, settings);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/marketplace/admin/vendors", window.location.origin);
      if (search.trim()) url.searchParams.set("search", search.trim());
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      if (productsFilter !== "all") url.searchParams.set("products", productsFilter);
      url.searchParams.set("sort", sortBy);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(PAGE_SIZE));

      const res = await fetch(url.toString(), { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setRows((data.items ?? []) as VendorRow[]);
        setSummary((data.summary ?? null) as Summary);
        if (data.pagination) setPagination(data.pagination as PaginationMeta);
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, productsFilter, sortBy, page]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [search, statusFilter, productsFilter, sortBy]);

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setSheetOpen(true);
  };

  const toFormValues = (row: VendorRow, loginAccess?: VendorLoginAccessForm): VendorFormValues => {
    const parts = splitHolderName(row.name);
    return {
      id: row.id,
      firstName: parts.firstName,
      lastName: parts.lastName,
      name: row.name,
      contactEmail: row.contactEmail ?? "",
      phone: formatPhone(row.phone ?? ""),
      description: row.description ?? "",
      logoUrl: row.logoUrl ?? "",
      commissionRate: row.commissionRate == null ? "" : String(row.commissionRate),
      status: row.status,
      loginAccess: loginAccess ?? {
        ...EMPTY_LOGIN_ACCESS,
        loginEmail: row.contactEmail ?? "",
        permissions: { ...EMPTY_LOGIN_ACCESS.permissions },
      },
    };
  };

  const openEdit = async (row: VendorRow) => {
    setMode("edit");
    setEditing(toFormValues(row));
    setSheetOpen(true);
    try {
      const res = await fetch(`/api/marketplace/admin/vendors/${row.id}`, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && data.loginAccess) {
        const la = data.loginAccess as {
          enabled?: boolean;
          loginEmail?: string | null;
          vendorRole?: string;
          permissions?: Record<string, boolean>;
        };
        const role =
          la.vendorRole === "vendor_manager" || la.vendorRole === "vendor_staff"
            ? la.vendorRole
            : "vendor_admin";
        setEditing(
          toFormValues(row, {
            enabled: Boolean(la.enabled),
            loginEmail: la.loginEmail ?? row.contactEmail ?? "",
            temporaryPassword: "",
            sendInviteEmail: false,
            vendorRole: role,
            permissions: la.permissions ?? presetPermissionsForRole(role),
          }),
        );
      }
    } catch {
      /* keep row-only form */
    }
  };

  const toggleStatus = async (row: VendorRow) => {
    const next = row.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/marketplace/admin/vendors/${row.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      toast.success(`Vendor ${next === "active" ? "activated" : "deactivated"}`);
      void load();
    } else {
      toast.error(data?.message ?? "Update failed");
    }
  };

  const remove = async (row: VendorRow) => {
    if (!window.confirm(`Delete vendor "${row.name}"? This also removes its products.`)) return;
    const res = await fetch(`/api/marketplace/admin/vendors/${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      toast.success("Vendor deleted");
      void load();
    } else {
      toast.error(data?.message ?? "Delete failed");
    }
  };

  const exportCsv = async () => {
    const url = new URL("/api/marketplace/admin/vendors", window.location.origin);
    if (search.trim()) url.searchParams.set("search", search.trim());
    if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
    if (productsFilter !== "all") url.searchParams.set("products", productsFilter);
    url.searchParams.set("sort", sortBy);
    url.searchParams.set("page", "1");
    url.searchParams.set("pageSize", "500");

    const res = await fetch(url.toString(), { credentials: "include" });
    const data = await res.json().catch(() => null);
    const exportRows = (data?.items ?? []) as VendorRow[];

    const header = ["Name", "Email", "Phone", "Products", "Orders", "Revenue", "Status", "Joined On"];
    const lines = exportRows.map((r) =>
      [
        r.name,
        r.contactEmail ?? "",
        r.phone ?? "",
        String(r.productCount),
        String(r.orderCount),
        String(r.revenue),
        r.status,
        formatJoinedDate(r.createdAt),
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "vendors.csv";
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const activePct =
    summary && summary.vendorCount > 0
      ? Math.round((summary.activeVendors / summary.vendorCount) * 100)
      : 0;

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (productsFilter !== "all" ? 1 : 0) + (search.trim() ? 1 : 0);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setProductsFilter("all");
    setSortBy("name_asc");
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-muted-foreground">{t("Manage all vendors in your marketplace.")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => void exportCsv()}>
            <Upload className="h-3.5 w-3.5" />
            {t("Export")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            disabled={!canManage}
            onClick={() => toast.info("Vendor import is coming soon.")}
          >
            <Download className="h-3.5 w-3.5" />
            {t("Import")}
          </Button>
          {canManage ? (
            <Button type="button" size="sm" className="h-8 gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              {t("Add Vendor")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          icon={<Store className="h-5 w-5 text-muted-foreground" />}
          label={t("Total Vendors")}
          value={String(summary?.vendorCount ?? 0)}
          sub={t("All time")}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-muted-foreground" />}
          label={t("Active Vendors")}
          value={String(summary?.activeVendors ?? 0)}
          sub={`${activePct}% ${t("of total")}`}
        />
        <StatCard
          icon={<Package className="h-5 w-5 text-muted-foreground" />}
          label={t("Total Products")}
          value={String(summary?.productCount ?? 0)}
          sub={t("Across all vendors")}
        />
        <StatCard
          icon={<ShoppingCart className="h-5 w-5 text-muted-foreground" />}
          label={t("Total Orders")}
          value={String(summary?.orderCount ?? 0)}
          sub={t("All time")}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
          label={t("Total Revenue")}
          value={money(summary?.totalRevenue ?? 0)}
          sub={t("All time")}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search vendors by name, email or phone...")}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder={t("Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Status")}</SelectItem>
                <SelectItem value="active">{t("Active")}</SelectItem>
                <SelectItem value="inactive">{t("Inactive")}</SelectItem>
                <SelectItem value="suspended">{t("Suspended")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={productsFilter} onValueChange={setProductsFilter}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder={t("Products")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Products")}</SelectItem>
                <SelectItem value="with">{t("With Products")}</SelectItem>
                <SelectItem value="without">{t("No Products")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder={t("Sort By")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">{t("Name (A-Z)")}</SelectItem>
                <SelectItem value="name_desc">{t("Name (Z-A)")}</SelectItem>
                <SelectItem value="products_desc">{t("Products (High-Low)")}</SelectItem>
                <SelectItem value="orders_desc">{t("Orders (High-Low)")}</SelectItem>
                <SelectItem value="revenue_desc">{t("Revenue (High-Low)")}</SelectItem>
                <SelectItem value="joined_desc">{t("Joined (Newest)")}</SelectItem>
                <SelectItem value="joined_asc">{t("Joined (Oldest)")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={clearFilters}
              disabled={activeFilterCount === 0}
            >
              <Filter className="h-3.5 w-3.5" />
              {t("Filters")}
              {activeFilterCount > 0 ? (
                <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">{t("Vendor")}</TableHead>
                <TableHead>{t("Contact")}</TableHead>
                <TableHead className="text-right">{t("Products")}</TableHead>
                <TableHead className="text-right">{t("Orders")}</TableHead>
                <TableHead className="text-right">{t("Revenue")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead>{t("Joined On")}</TableHead>
                <TableHead className="pr-6 text-right">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    {t("No vendors found.")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <VendorAvatar name={row.name} logoUrl={row.logoUrl} />
                        <span className="font-medium">{row.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{row.contactEmail ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{formatPhoneDisplay(row.phone, "—")}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.productCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.orderCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(row.revenue)}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                          statusBadgeClass(row.status),
                        )}
                      >
                        {formatStatusLabel(row.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatJoinedDate(row.createdAt)}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <TableActionButton
                        label={t("View")}
                        primaryIcon={<Eye className="h-4 w-4" />}
                        onPrimaryClick={() => openEdit(row)}
                        className="ml-auto"
                        items={
                          canManage
                            ? [
                                { label: t("Edit"), onSelect: () => openEdit(row), icon: <Pencil className="h-4 w-4" /> },
                                row.status === "active"
                                  ? {
                                      label: t("Deactivate"),
                                      onSelect: () => void toggleStatus(row),
                                      icon: <Ban className="h-4 w-4" />,
                                      destructive: true,
                                    }
                                  : {
                                      label: t("Activate"),
                                      onSelect: () => void toggleStatus(row),
                                      icon: <CheckCircle2 className="h-4 w-4" />,
                                    },
                                {
                                  label: t("Delete"),
                                  onSelect: () => void remove(row),
                                  icon: <Trash2 className="h-4 w-4" />,
                                  destructive: true,
                                },
                              ]
                            : [{ label: t("Edit"), onSelect: () => openEdit(row), icon: <Pencil className="h-4 w-4" /> }]
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && pagination.total > 0 ? (
          <div className="border-t px-4 py-3">
            <Pagination
              page={pagination.page}
              lastPage={pagination.lastPage}
              total={pagination.total}
              from={pagination.from}
              to={pagination.to}
              onPageChange={setPage}
              entityLabel={t("vendors")}
            />
          </div>
        ) : null}
      </div>

      <VendorFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={mode}
        initial={editing}
        onSaved={() => void load()}
      />
    </div>
  );
}
