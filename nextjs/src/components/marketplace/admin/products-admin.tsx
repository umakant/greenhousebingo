"use client";

import * as React from "react";
import {
  Download,
  Eye,
  Filter,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  ProductFormSheet,
  type ProductFormValues,
  type VendorOption,
} from "@/components/marketplace/admin/product-form-sheet";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import { getImagePath } from "@/utils/image-path";
import { t } from "@/lib/admin-t";

const DEFAULT_PAGE_SIZE = 10;

type ProductRow = {
  id: string;
  vendorId: string;
  vendorName: string | null;
  vendorLogoUrl: string | null;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  currency: string;
  imageUrl: string | null;
  category: string | null;
  stock: number | null;
  status: string;
};

type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  lastPage: number;
  from: number;
  to: number;
};

const CATEGORY_STYLES: Record<string, string> = {
  tableware: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  decor: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  supplies: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  beverages: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
  snacks: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200",
};

function categoryBadgeClass(category: string | null): string {
  if (!category) return "bg-muted text-muted-foreground";
  const key = category.toLowerCase().replace(/\s+/g, "_");
  return CATEGORY_STYLES[key] ?? "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ProductThumb({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  const imageSrc = imageUrl ? getImagePath(imageUrl) : "";
  if (imageSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageSrc} alt="" className="h-10 w-10 shrink-0 rounded-md border object-cover" />
    );
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-semibold text-muted-foreground">
      {initials(name)}
    </span>
  );
}

function VendorAvatar({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-[9px] font-semibold text-muted-foreground">
      {initials(name)}
    </span>
  );
}

function stockLabel(stock: number | null, threshold: number): { count: string; label: string; className: string } {
  if (stock == null) {
    return { count: "∞", label: t("In Stock"), className: "text-green-600 dark:text-green-400" };
  }
  if (stock === 0) {
    return { count: "0", label: t("Out of Stock"), className: "text-red-600 dark:text-red-400" };
  }
  if (stock <= threshold) {
    return { count: String(stock), label: t("Low Stock"), className: "text-orange-600 dark:text-orange-400" };
  }
  return { count: String(stock), label: t("In Stock"), className: "text-green-600 dark:text-green-400" };
}

function statusDotClass(status: string): string {
  if (status === "active") return "bg-green-500";
  if (status === "inactive") return "bg-muted-foreground";
  return "bg-orange-500";
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProductsAdmin({
  canManage,
  apiBase = "/api/marketplace/admin",
  vendorMode = false,
}: {
  canManage: boolean;
  apiBase?: string;
  vendorMode?: boolean;
}) {
  const { settings } = useAppSettings();
  const [rows, setRows] = React.useState<ProductRow[]>([]);
  const [vendors, setVendors] = React.useState<VendorOption[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [lowStockThreshold, setLowStockThreshold] = React.useState(150);
  const [pagination, setPagination] = React.useState<PaginationMeta>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    lastPage: 1,
    from: 0,
    to: 0,
  });
  const [loading, setLoading] = React.useState(true);

  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [vendorFilter, setVendorFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<ProductFormValues | null>(null);

  const money = (n: number) => formatCurrency(Number(n) || 0, settings);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`${apiBase}/products`, window.location.origin);
      if (search.trim()) url.searchParams.set("search", search.trim());
      if (categoryFilter !== "all") url.searchParams.set("category", categoryFilter);
      if (vendorFilter !== "all") url.searchParams.set("vendorId", vendorFilter);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(pageSize));

      const res = await fetch(url.toString(), { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setRows((data.items ?? []) as ProductRow[]);
        if (data.pagination) setPagination(data.pagination as PaginationMeta);
        if (data.filters?.categories) setCategories(data.filters.categories as string[]);
        if (data.filters?.vendors) {
          setVendors((data.filters.vendors as { id: string; name: string }[]).map((v) => ({ id: v.id, name: v.name })));
        }
        if (data.lowStockThreshold) setLowStockThreshold(data.lowStockThreshold as number);
        setSelected(new Set());
      }
    } finally {
      setLoading(false);
    }
  }, [apiBase, search, categoryFilter, vendorFilter, statusFilter, page, pageSize]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, vendorFilter, statusFilter, pageSize]);

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setSheetOpen(true);
  };

  const toFormValues = (row: ProductRow): ProductFormValues => ({
    id: row.id,
    vendorId: row.vendorId,
    name: row.name,
    sku: row.sku ?? "",
    description: row.description ?? "",
    price: String(row.price),
    currency: row.currency,
    imageUrl: row.imageUrl ?? "",
    category: row.category ?? "",
    stock: row.stock == null ? "" : String(row.stock),
    status: row.status,
  });

  const openEdit = (row: ProductRow) => {
    setMode("edit");
    setEditing(toFormValues(row));
    setSheetOpen(true);
  };

  const remove = async (row: ProductRow) => {
    if (!window.confirm(`Delete product "${row.name}"?`)) return;
    const res = await fetch(`${apiBase}/products/${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      toast.success("Product deleted");
      void load();
    } else {
      toast.error(data?.message ?? "Delete failed");
    }
  };

  const exportCsv = async () => {
    const url = new URL("/api/marketplace/admin/products", window.location.origin);
    if (search.trim()) url.searchParams.set("search", search.trim());
    if (categoryFilter !== "all") url.searchParams.set("category", categoryFilter);
    if (vendorFilter !== "all") url.searchParams.set("vendorId", vendorFilter);
    if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
    url.searchParams.set("page", "1");
    url.searchParams.set("pageSize", "500");

    const res = await fetch(url.toString(), { credentials: "include" });
    const data = await res.json().catch(() => null);
    const exportRows = (data?.items ?? []) as ProductRow[];

    const header = ["Name", "SKU", "Vendor", "Category", "Price", "Stock", "Status"];
    const lines = exportRows.map((r) =>
      [r.name, r.sku ?? "", r.vendorName ?? "", r.category ?? "", String(r.price), String(r.stock ?? ""), r.status]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "products.csv";
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const activeFilterCount =
    (categoryFilter !== "all" ? 1 : 0) +
    (!vendorMode && vendorFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setVendorFilter("all");
    setStatusFilter("all");
  };

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(rows.map((r) => r.id)));
    else setSelected(new Set());
  };

  const toggleRow = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-muted-foreground">{t("Manage all marketplace products.")}</p>
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
            onClick={() => toast.info("Product import is coming soon.")}
          >
            <Download className="h-3.5 w-3.5" />
            {t("Import")}
          </Button>
          {canManage ? (
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5"
              onClick={openCreate}
              disabled={!vendorMode && vendors.length === 0}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("Add Product")}
            </Button>
          ) : null}
        </div>
      </div>

      {canManage && !vendorMode && vendors.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("Add a vendor first before creating products.")}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search products by name, SKU or vendor...")}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder={t("Category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Categories")}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!vendorMode ? (
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder={t("Vendor")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All Vendors")}</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder={t("Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Statuses")}</SelectItem>
                <SelectItem value="active">{t("Active")}</SelectItem>
                <SelectItem value="inactive">{t("Inactive")}</SelectItem>
                <SelectItem value="draft">{t("Draft")}</SelectItem>
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
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              disabled={activeFilterCount === 0}
            >
              {t("Reset")}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[1040px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-6">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => toggleAll(v === true)}
                    aria-label={t("Select all")}
                  />
                </TableHead>
                <TableHead>{t("Product")}</TableHead>
                {!vendorMode ? <TableHead>{t("Vendor")}</TableHead> : null}
                <TableHead>{t("Category")}</TableHead>
                <TableHead className="text-right">{t("Price")}</TableHead>
                <TableHead>{t("Stock")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
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
                    {t("No products found.")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const stock = stockLabel(row.stock, lowStockThreshold);
                  return (
                    <TableRow key={row.id} data-state={selected.has(row.id) ? "selected" : undefined}>
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selected.has(row.id)}
                          onCheckedChange={(v) => toggleRow(row.id, v === true)}
                          aria-label={`Select ${row.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <ProductThumb name={row.name} imageUrl={row.imageUrl} />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{row.name}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {row.sku ? `SKU: ${row.sku}` : "—"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      {!vendorMode ? (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <VendorAvatar name={row.vendorName ?? "?"} logoUrl={row.vendorLogoUrl} />
                            <span className="truncate">{row.vendorName ?? "—"}</span>
                          </div>
                        </TableCell>
                      ) : null}
                      <TableCell>
                        {row.category ? (
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                              categoryBadgeClass(row.category),
                            )}
                          >
                            {row.category}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{money(row.price)}</TableCell>
                      <TableCell>
                        <div className="tabular-nums font-medium">{stock.count}</div>
                        <div className={cn("text-xs", stock.className)}>{stock.label}</div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm capitalize">
                          <span className={cn("h-2 w-2 rounded-full", statusDotClass(row.status))} />
                          {formatStatusLabel(row.status)}
                        </span>
                      </TableCell>
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && pagination.total > 0 ? (
          <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <Pagination
              page={pagination.page}
              lastPage={pagination.lastPage}
              total={pagination.total}
              from={pagination.from}
              to={pagination.to}
              onPageChange={setPage}
              entityLabel={t("products")}
            />
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">{t("10 per page")}</SelectItem>
                  <SelectItem value="25">{t("25 per page")}</SelectItem>
                  <SelectItem value="50">{t("50 per page")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}
      </div>

      <ProductFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={mode}
        initial={editing}
        vendors={vendors}
        apiBase={apiBase}
        hideVendorSelect={vendorMode}
        onSaved={() => void load()}
      />
    </div>
  );
}
