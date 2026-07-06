"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  Eye,
  EyeOff,
  Filter,
  LayoutGrid,
  Layers,
  List,
  Loader2,
  Package,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Store,
  Trash2,
} from "lucide-react";

import { appConfirm } from "@/lib/app-confirm";
import { parseJsonResponse } from "@/lib/safe-fetch-json";

import {
  StorefrontAdminErrorAlert,
  StorefrontAdminMainCard,
  StorefrontAdminPageShell,
} from "@/components/storefront/storefront-admin-page-layout";
import { AddStorefrontProductDialog } from "@/components/storefront/add-storefront-product-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { TableColumnVisibilityMenu } from "@/components/ui/table-column-visibility-menu";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import NoRecordsFound from "@/components/no-records-found";
import { t } from "@/lib/admin-t";

const ORG_STORAGE_KEY = "pf_sf_merchant_org_id";
const PRODUCTS_COLUMN_STORAGE_KEY = "pf-storefront-products-admin-columns-v2";

type OrgContext = {
  isSuperadmin: boolean;
  organizations: { id: string; name: string }[];
  defaultOrganizationId: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  sku: string | null;
  price: number;
  stock: number;
  isActive: boolean;
  storefrontPublished: boolean;
  storefrontPublishAt: string | null;
  image: string | null;
  updatedAt: string | null;
  pageTemplateKey: string | null;
  collections: { id: string; title: string }[];
};

type Tab = "all" | "active" | "draft" | "scheduled" | "archived";
type ProductSortField = "name" | "collections" | "status" | "inventory" | "price" | "updatedAt";
type ProductTableColumnId = "product" | "collections" | "price" | "inventory" | "status";

const DEFAULT_PRODUCT_TABLE_COLUMNS: Record<ProductTableColumnId, boolean> = {
  product: true,
  collections: true,
  price: true,
  inventory: true,
  status: true,
};

function collectionsSortKey(p: ProductRow): string {
  const titles = (p.collections ?? []).map((c) => c.title.trim().toLowerCase());
  return titles.join("\u0001");
}

function isScheduledProduct(p: ProductRow): boolean {
  if (!p.isActive || !p.storefrontPublished || !p.storefrontPublishAt) return false;
  const at = new Date(p.storefrontPublishAt);
  return !Number.isNaN(at.getTime()) && at.getTime() > Date.now();
}

function statusLabel(p: ProductRow): string {
  if (!p.isActive) return t("Archived");
  if (isScheduledProduct(p)) return t("Scheduled");
  if (p.storefrontPublished) return t("Active");
  return t("Draft");
}

function statusVariant(p: ProductRow): "default" | "secondary" | "outline" {
  if (!p.isActive) return "secondary";
  if (isScheduledProduct(p)) return "outline";
  if (p.storefrontPublished) return "default";
  return "outline";
}

function statusSortKey(p: ProductRow): number {
  if (!p.isActive) return 3;
  if (isScheduledProduct(p)) return 2;
  if (p.storefrontPublished) return 0;
  return 1;
}

export function StorefrontProductsAdmin() {
  const [orgCtx, setOrgCtx] = useState<OrgContext | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<string>("all");
  const [collectionOptions, setCollectionOptions] = useState<{ id: string; title: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortField, setSortField] = useState<ProductSortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const [addOpen, setAddOpen] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);

  const [bundleProductIds, setBundleProductIds] = useState<string[]>([]);
  const [bundleListLoading, setBundleListLoading] = useState(false);
  const [bundleSaving, setBundleSaving] = useState(false);

  const bundleIdSet = useMemo(() => new Set(bundleProductIds), [bundleProductIds]);

  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<ProductTableColumnId>(
    PRODUCTS_COLUMN_STORAGE_KEY,
    DEFAULT_PRODUCT_TABLE_COLUMNS,
  );

  const productColumnMenuDefs = useMemo(
    () => [
      { id: "product" as const, label: t("Product") },
      { id: "collections" as const, label: t("Collections") },
      { id: "price" as const, label: t("Price") },
      { id: "inventory" as const, label: t("Inventory") },
      { id: "status" as const, label: t("Status") },
    ],
    [],
  );

  const buildApiUrl = useCallback(
    (pathname: string, extraSearch?: Record<string, string | undefined>) => {
      const u = new URL(pathname, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      if (orgCtx?.isSuperadmin && selectedOrgId) {
        u.searchParams.set("organizationId", selectedOrgId);
      }
      if (extraSearch) {
        for (const [k, v] of Object.entries(extraSearch)) {
          if (v != null && v !== "") u.searchParams.set(k, v);
        }
      }
      return u.pathname + u.search;
    },
    [orgCtx?.isSuperadmin, selectedOrgId],
  );

  const orgReady = orgCtx != null && (!orgCtx.isSuperadmin || !!selectedOrgId);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setOrgLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/storefront/organization-context", { credentials: "include" });
        const json = await parseJsonResponse<OrgContext & { ok?: boolean; message?: string }>(res);
        if (!res.ok || !json.ok) throw new Error(json.message ?? "Failed to load organization context");
        if (cancelled) return;
        const c: OrgContext = {
          isSuperadmin: json.isSuperadmin,
          organizations: json.organizations ?? [],
          defaultOrganizationId: json.defaultOrganizationId ?? null,
        };
        setOrgCtx(c);
        // The superadmin Store is bound to the dedicated Water Ice Express store org
        // (returned as defaultOrganizationId); no company switching here.
        const orgId: string | null = c.defaultOrganizationId;
        setSelectedOrgId(orgId);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setOrgLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadProducts = useCallback(async () => {
    if (!orgReady) return;
    setLoading(true);
    setError(null);
    try {
      const base = buildApiUrl("/api/storefront/catalog/products");
      const u = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      u.searchParams.set("tab", tab);
      if (q.trim()) u.searchParams.set("q", q.trim());
      const res = await fetch(u.pathname + u.search, { credentials: "same-origin" });
      const data = await parseJsonResponse<{ ok?: boolean; data?: ProductRow[]; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setRows(
        (data.data ?? []).map((r) => ({
          ...r,
          collections: Array.isArray(r.collections) ? r.collections : [],
        })),
      );
      setSelected(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, orgReady, q, tab]);

  const loadBundleProducts = useCallback(async () => {
    if (!orgReady) return;
    setBundleListLoading(true);
    try {
      const res = await fetch(buildApiUrl("/api/storefront/catalog/bundle-products"), { credentials: "same-origin" });
      const data = await parseJsonResponse<{ ok?: boolean; productIds?: string[]; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setBundleProductIds(Array.isArray(data.productIds) ? data.productIds : []);
    } catch {
      setBundleProductIds([]);
    } finally {
      setBundleListLoading(false);
    }
  }, [buildApiUrl, orgReady]);

  const loadCollectionOptions = useCallback(async () => {
    if (!orgReady) return;
    try {
      const res = await fetch(buildApiUrl("/api/storefront/collections"), { credentials: "same-origin" });
      const data = await parseJsonResponse<{
        ok?: boolean;
        collections?: { id: string; title: string }[];
        message?: string;
      }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setCollectionOptions(
        (data.collections ?? []).map((c) => ({ id: String(c.id), title: c.title })),
      );
    } catch {
      setCollectionOptions([]);
    }
  }, [buildApiUrl, orgReady]);

  const persistBundleProductIds = useCallback(
    async (nextIds: string[]) => {
      if (!orgReady) return;
      setBundleSaving(true);
      setError(null);
      try {
        const res = await fetch(buildApiUrl("/api/storefront/catalog/bundle-products"), {
          method: "PUT",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productIds: nextIds }),
        });
        const data = await parseJsonResponse<{ ok?: boolean; productIds?: string[]; message?: string }>(res);
        if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
        setBundleProductIds(Array.isArray(data.productIds) ? data.productIds : nextIds);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setBundleSaving(false);
      }
    },
    [buildApiUrl, orgReady],
  );

  const toggleProductBundleMembership = useCallback(
    (productId: string) => {
      const id = String(productId).trim();
      if (!id) return;
      if (bundleIdSet.has(id)) {
        void persistBundleProductIds(bundleProductIds.filter((x) => x !== id));
      } else {
        const next = [...bundleProductIds];
        if (!next.includes(id)) next.push(id);
        void persistBundleProductIds(next);
      }
    },
    [bundleIdSet, bundleProductIds, persistBundleProductIds],
  );

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    void loadBundleProducts();
  }, [loadBundleProducts]);

  useEffect(() => {
    void loadCollectionOptions();
  }, [loadCollectionOptions]);

  useEffect(() => {
    setPage(1);
  }, [tab, q, collectionFilter]);

  const patchProduct = async (id: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/catalog/products/${encodeURIComponent(id)}`), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await parseJsonResponse<{ ok?: boolean; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      await loadProducts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!(await appConfirm(t("Delete this product permanently? This cannot be undone.")))) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/catalog/products/${encodeURIComponent(id)}`), {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await parseJsonResponse<{ ok?: boolean; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      await loadProducts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const actionIconCls = "h-4 w-4";

  const toggleSelect = (id: string, on: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  };

  const sortedRows = useMemo(() => {
    const copy =
      collectionFilter === "all"
        ? [...rows]
        : rows.filter((r) => (r.collections ?? []).some((c) => c.id === collectionFilter));
    const dir = sortDirection === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      } else if (sortField === "collections") {
        cmp = collectionsSortKey(a).localeCompare(collectionsSortKey(b), undefined, { sensitivity: "base" });
      } else if (sortField === "status") {
        cmp = statusSortKey(a) - statusSortKey(b);
        if (cmp === 0) cmp = statusLabel(a).localeCompare(statusLabel(b));
      } else if (sortField === "inventory") {
        cmp = a.stock - b.stock;
      } else if (sortField === "price") {
        cmp = a.price - b.price;
      } else if (sortField === "updatedAt") {
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        cmp = ta - tb;
      }
      return cmp * dir;
    });
    return copy;
  }, [rows, sortField, sortDirection, collectionFilter]);

  const total = sortedRows.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage) || 1);

  useEffect(() => {
    if (page > lastPage) setPage(lastPage);
  }, [page, lastPage]);

  const pageSafe = Math.min(page, lastPage);
  const paginatedRows = useMemo(() => {
    const start = (pageSafe - 1) * perPage;
    return sortedRows.slice(start, start + perPage);
  }, [sortedRows, pageSafe, perPage]);

  const allSelected = sortedRows.length > 0 && sortedRows.every((r) => selected.has(r.id));

  const toggleSelectAll = (on: boolean) => {
    if (on) setSelected(new Set(sortedRows.map((r) => r.id)));
    else setSelected(new Set());
  };

  const bulkAddToBundle = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    const next = [...bundleProductIds];
    let changed = false;
    for (const id of ids) {
      if (!next.includes(id)) {
        next.push(id);
        changed = true;
      }
    }
    if (changed) await persistBundleProductIds(next);
  };

  const bulkRemoveFromBundle = async () => {
    const rm = new Set(selected);
    const next = bundleProductIds.filter((id) => !rm.has(id));
    await persistBundleProductIds(next);
  };

  const bulkUnpublish = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!(await appConfirm(t("Unpublish selected products from the storefront?")))) return;
    setLoading(true);
    setError(null);
    try {
      for (const id of ids) {
        const res = await fetch(buildApiUrl(`/api/storefront/catalog/products/${encodeURIComponent(id)}`), {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ storefrontPublished: false }),
        });
        const data = await parseJsonResponse<{ ok?: boolean; message?: string }>(res);
        if (!res.ok || !data.ok) throw new Error(data.message ?? `Failed on ${id}`);
      }
      await loadProducts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const fmtPrice = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }),
    [],
  );

  const handleSearch = () => {
    setQ(searchInput.trim());
    setPage(1);
  };

  const handleSort = (field: ProductSortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "name" || field === "collections" ? "asc" : "desc");
    }
  };

  const sortChevron = (field: ProductSortField) => (
    <ChevronDown
      className={`ml-1 inline-block h-3 w-3 transition-transform ${
        sortField === field && sortDirection === "desc" ? "rotate-180" : ""
      }`}
    />
  );

  const activeFilterCount = (tab !== "all" ? 1 : 0) + (collectionFilter !== "all" ? 1 : 0);
  const hasFilters = !!q.trim() || tab !== "all" || collectionFilter !== "all";

  const from = total === 0 ? 0 : (pageSafe - 1) * perPage + 1;
  const to = Math.min(pageSafe * perPage, total);

  const buildRowActions = (p: ProductRow): { items: TableActionItem[] } => {
    const items: TableActionItem[] = [
      {
        label: bundleIdSet.has(p.id) ? t("Remove from bundle") : t("Add to bundle"),
        icon: <Layers className={actionIconCls} />,
        onSelect: () => void toggleProductBundleMembership(p.id),
        disabled: bundleSaving,
      },
      {
        label: t("Edit"),
        icon: <Pencil className={actionIconCls} />,
        onSelect: () => {
          setEditProductId(p.id);
          setAddOpen(true);
        },
      },
    ];
    if (isScheduledProduct(p)) {
      items.push({
        label: t("Publish now"),
        icon: <Play className={actionIconCls} />,
        onSelect: () => void patchProduct(p.id, { storefrontPublishAt: null }),
      });
    }
    if (p.storefrontPublished) {
      items.push({
        label: t("Unpublish"),
        icon: <EyeOff className={actionIconCls} />,
        onSelect: () => void patchProduct(p.id, { storefrontPublished: false }),
      });
    } else {
      items.push({
        label: t("Publish to storefront"),
        icon: <Store className={actionIconCls} />,
        onSelect: () => void patchProduct(p.id, { storefrontPublished: true }),
        disabled: !p.isActive,
      });
    }
    if (p.isActive) {
      items.push({
        label: t("Archive"),
        icon: <Archive className={actionIconCls} />,
        onSelect: () => void patchProduct(p.id, { isActive: false, storefrontPublished: false }),
      });
    } else {
      items.push({
        label: t("Unarchive"),
        icon: <ArchiveRestore className={actionIconCls} />,
        onSelect: () => void patchProduct(p.id, { isActive: true }),
      });
    }
    items.push({
      label: t("Delete"),
      icon: <Trash2 className={actionIconCls} />,
      destructive: true,
      onSelect: () => void deleteProduct(p.id),
    });
    return { items };
  };

  if (orgLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">{t("Loading…")}</span>
      </div>
    );
  }

  return (
    <StorefrontAdminPageShell>
      <StorefrontAdminErrorAlert>{error}</StorefrontAdminErrorAlert>

      <StorefrontAdminMainCard contentClassName="p-0 sm:p-0">
        <div className="space-y-0">
          <div className="border-b bg-muted/30 p-4 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
              <div className="min-w-0 w-full max-w-full lg:max-w-md lg:flex-1">
                <SearchInput
                  value={searchInput}
                  onChange={setSearchInput}
                  onSearch={handleSearch}
                  placeholder={t("Search products...")}
                  buttonLabel={t("Search")}
                />
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
                <div className="flex overflow-hidden rounded-md border">
                  <button
                    type="button"
                    className={`p-2 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                    title={t("List view")}
                    aria-label={t("List view")}
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={`p-2 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                    title={t("Grid view")}
                    aria-label={t("Grid view")}
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
                <Select
                  value={String(perPage)}
                  onValueChange={(v) => {
                    const n = parseInt(v, 10) || 10;
                    setPerPage(n);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} {t("per page")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="default" className="relative">
                      <Filter className="mr-2 h-4 w-4" />
                      {t("Filters")}
                      {activeFilterCount > 0 ? (
                        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                          {activeFilterCount}
                        </span>
                      ) : null}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-[70vh] w-56 overflow-y-auto p-2">
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      {t("Catalog")}
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={tab}
                      onValueChange={(v) => {
                        setTab(v as Tab);
                        setPage(1);
                      }}
                    >
                      <DropdownMenuRadioItem value="all">{t("All")}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="active">{t("Active")}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="draft">{t("Draft")}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="scheduled">{t("Scheduled")}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="archived">{t("Archived")}</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    {collectionOptions.length > 0 ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                          {t("Collection")}
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={collectionFilter}
                          onValueChange={(v) => {
                            setCollectionFilter(v);
                            setPage(1);
                          }}
                        >
                          <DropdownMenuRadioItem value="all">{t("All collections")}</DropdownMenuRadioItem>
                          {collectionOptions.map((c) => (
                            <DropdownMenuRadioItem key={c.id} value={c.id}>
                              {c.title}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
                <TableColumnVisibilityMenu
                  columns={productColumnMenuDefs}
                  columnVisible={columnVisible}
                  setVisibility={setVisibility}
                  onReset={resetVisibility}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 shrink-0"
                  onClick={() => {
                    void loadProducts();
                    void loadBundleProducts();
                  }}
                  disabled={loading || bundleListLoading}
                  aria-label={t("Refresh")}
                >
                  <RefreshCw className={`h-4 w-4 ${loading || bundleListLoading ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    setEditProductId(null);
                    setAddOpen(true);
                  }}
                  disabled={!orgReady || loading}
                >
              <Plus className="h-4 w-4" />
              {t("Add product")}
            </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
          {selected.size > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm">
              <span className="font-medium">
                {selected.size} {t("selected")}
              </span>
              <Button type="button" size="sm" variant="secondary" onClick={() => void bulkAddToBundle()} disabled={loading || bundleSaving}>
                {t("Add selected to bundle")}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => void bulkRemoveFromBundle()} disabled={loading || bundleSaving}>
                {t("Remove selected from bundle")}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => void bulkUnpublish()} disabled={loading}>
                {t("Unpublish")}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                {t("Clear selection")}
              </Button>
            </div>
          ) : null}

            {loading && rows.length === 0 ? (
              <div className="flex justify-center py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : sortedRows.length === 0 ? (
              <NoRecordsFound
                icon={Package}
                title={t("No products found")}
                description={t("Add a product or adjust filters to see catalog items here.")}
                hasFilters={hasFilters}
                onClearFilters={() => {
                  setTab("all");
                  setSearchInput("");
                  setQ("");
                  setCollectionFilter("all");
                  setPage(1);
                }}
              />
            ) : viewMode === "list" ? (
              <div className="overflow-x-auto rounded-md border border-border/60">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-12 min-w-[3rem] max-w-[3rem] p-3 text-left font-medium">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(c) => toggleSelectAll(c === true)}
                          aria-label={t("Select all")}
                        />
                      </th>
                      {columnVisible("product") ? (
                        <th className="min-w-0 p-3 text-left font-medium">
                          <button type="button" className="inline-flex max-w-full items-center truncate" onClick={() => handleSort("name")}>
                            {t("Product")}
                            {sortChevron("name")}
                          </button>
                        </th>
                      ) : null}
                      {columnVisible("collections") ? (
                        <th className="hidden min-w-0 p-3 text-center font-medium md:table-cell">
                          <button
                            type="button"
                            className="inline-flex w-full max-w-full items-center justify-center gap-0.5 truncate"
                            onClick={() => handleSort("collections")}
                          >
                            {t("Collections")}
                            {sortChevron("collections")}
                          </button>
                        </th>
                      ) : null}
                      {columnVisible("price") ? (
                        <th className="hidden min-w-0 whitespace-nowrap p-3 text-center font-medium md:table-cell">
                          <button
                            type="button"
                            className="inline-flex w-full items-center justify-center gap-0.5"
                            onClick={() => handleSort("price")}
                          >
                            {t("Price")}
                            {sortChevron("price")}
                          </button>
                        </th>
                      ) : null}
                      {columnVisible("inventory") ? (
                        <th className="hidden min-w-0 whitespace-nowrap p-3 text-center font-medium md:table-cell">
                          <button
                            type="button"
                            className="inline-flex w-full items-center justify-center gap-0.5"
                            onClick={() => handleSort("inventory")}
                          >
                            {t("Inventory")}
                            {sortChevron("inventory")}
                          </button>
                        </th>
                      ) : null}
                      {columnVisible("status") ? (
                        <th className="hidden min-w-0 whitespace-nowrap p-3 text-center font-medium md:table-cell">
                          <button
                            type="button"
                            className="inline-flex w-full max-w-full items-center justify-center gap-0.5 truncate"
                            onClick={() => handleSort("status")}
                          >
                            {t("Status")}
                            {sortChevron("status")}
                          </button>
                        </th>
                      ) : null}
                      <th className="min-w-0 p-3 text-right font-medium">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((p) => {
                  const shopPath =
                    p.pageTemplateKey === "waterice-ebook"
                      ? `/ebooks/${encodeURIComponent(p.slug ?? p.id)}`
                      : orgCtx?.isSuperadmin
                        ? `/shop/flavors/${encodeURIComponent(p.slug ?? p.id)}`
                        : `/shop/products/${encodeURIComponent(p.slug ?? p.id)}`;
                      const { items } = buildRowActions(p);
                  return (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="w-12 min-w-[3rem] max-w-[3rem] p-3 align-top">
                        <Checkbox
                          checked={selected.has(p.id)}
                          onCheckedChange={(c) => toggleSelect(p.id, c === true)}
                          aria-label={t("Select row")}
                        />
                          </td>
                          {columnVisible("product") ? (
                            <td className="min-w-0 p-3 align-top">
                              <div className="flex min-w-0 items-start gap-3">
                                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                                  {p.image ? (
                                    <img src={p.image} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                      <Package className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex min-w-0 flex-col gap-0.5">
                                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <Link href={shopPath} className="truncate font-medium text-primary hover:underline" title={p.name}>
                                      {p.name}
                                    </Link>
                                    {bundleIdSet.has(p.id) ? (
                                      <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
                                        {t("Bundle")}
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {p.slug ? `/${p.slug}` : p.sku ? p.sku : "—"}
                                  </span>
                                  <div className="mt-1 space-y-1 md:hidden">
                                    {p.collections && p.collections.length > 0 ? (
                                      <p className="line-clamp-2 text-xs text-muted-foreground">
                                        {p.collections.map((c) => c.title).join(" · ")}
                                      </p>
                                    ) : null}
                                    <p className="text-xs text-muted-foreground">
                                      <span className="font-medium text-foreground">{fmtPrice.format(p.price)}</span>
                                      {" · "}
                                      <span>
                                        {t("Inventory")}: {p.stock}
                                      </span>
                                    </p>
                                    <Badge variant={statusVariant(p)} className="w-fit">
                                      {statusLabel(p)}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </td>
                          ) : null}
                          {columnVisible("collections") ? (
                            <td className="hidden min-w-0 p-3 text-center align-top md:table-cell">
                              <div className="flex flex-wrap justify-center gap-1">
                                {p.collections && p.collections.length > 0 ? (
                                  p.collections.map((c) => (
                                    <Badge
                                      key={c.id}
                                      variant="secondary"
                                      className="max-w-full truncate font-normal"
                                      title={c.title}
                                    >
                                      {c.title}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            </td>
                          ) : null}
                          {columnVisible("price") ? (
                            <td className="hidden min-w-0 whitespace-nowrap p-3 text-center align-top md:table-cell">
                              {fmtPrice.format(p.price)}
                            </td>
                          ) : null}
                          {columnVisible("inventory") ? (
                            <td className="hidden min-w-0 whitespace-nowrap p-3 text-center align-top md:table-cell">{p.stock}</td>
                          ) : null}
                          {columnVisible("status") ? (
                            <td className="hidden min-w-0 p-3 text-center align-top md:table-cell">
                              <div className="flex justify-center">
                                <Badge variant={statusVariant(p)}>{statusLabel(p)}</Badge>
                              </div>
                            </td>
                          ) : null}
                          <td className="min-w-0 p-3 text-right align-top">
                            <TableActionButton
                              label={t("View")}
                              primaryIcon={<Eye className={actionIconCls} />}
                              onPrimaryClick={() => {
                                window.open(shopPath, "_blank", "noopener,noreferrer");
                              }}
                              items={items}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedRows.map((p) => {
                  const shopPath =
                    p.pageTemplateKey === "waterice-ebook"
                      ? `/ebooks/${encodeURIComponent(p.slug ?? p.id)}`
                      : orgCtx?.isSuperadmin
                        ? `/shop/flavors/${encodeURIComponent(p.slug ?? p.id)}`
                        : `/shop/products/${encodeURIComponent(p.slug ?? p.id)}`;
                  const { items } = buildRowActions(p);
                  return (
                    <Card key={p.id} className="overflow-hidden border-border/60 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                            {p.image ? (
                              <img src={p.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link href={shopPath} className="block min-w-0 flex-1 font-medium text-primary hover:underline">
                                {p.name}
                              </Link>
                              {bundleIdSet.has(p.id) ? (
                                <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
                                  {t("Bundle")}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">{p.slug ? `/${p.slug}` : p.sku ?? "—"}</p>
                            {p.collections && p.collections.length > 0 ? (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {p.collections.map((c) => (
                                  <Badge key={c.id} variant="secondary" className="max-w-full truncate text-[10px] font-normal">
                                    {c.title}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>{fmtPrice.format(p.price)}</span>
                              <span>
                                {t("Inventory")}: {p.stock}
                              </span>
                            </div>
                            <Badge variant={statusVariant(p)} className="mt-2 w-fit">
                              {statusLabel(p)}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end border-t border-border/60 pt-3">
                          <TableActionButton
                            label={t("View")}
                            primaryIcon={<Eye className={actionIconCls} />}
                            onPrimaryClick={() => {
                              window.open(shopPath, "_blank", "noopener,noreferrer");
                            }}
                            items={items}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {!loading && sortedRows.length > 0 ? (
              <div className="border-t border-border/60 pt-4">
                <Pagination page={pageSafe} lastPage={lastPage} total={total} from={from} to={to} onPageChange={setPage} />
              </div>
            ) : null}
          </div>
            </div>
      </StorefrontAdminMainCard>

      <AddStorefrontProductDialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) setEditProductId(null);
        }}
        orgReady={orgReady}
        loading={loading}
        setLoading={setLoading}
        buildApiUrl={buildApiUrl}
        editProductId={editProductId}
        onCreated={(nextTab) => {
          setTab(nextTab);
          void loadProducts();
        }}
        setGlobalError={setError}
      />
    </StorefrontAdminPageShell>
  );
}
