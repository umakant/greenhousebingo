"use client";

import * as React from "react";
import {
  Ban,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  Pencil,
  Percent,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { BrandFormSheet, type BrandFormValues } from "@/components/ownership/brand-form-sheet";
import { splitHolderName } from "@/lib/brand-ownership-holder-name";
import {
  OwnershipDistributionLegend,
  OwnershipDonutChart,
} from "@/components/ownership/ownership-donut-chart";
import {
  OwnershipPartnerFormSheet,
  type OwnershipPartnerFormValues,
} from "@/components/ownership/ownership-partner-form-sheet";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableActionButton } from "@/components/ui/table-action-button";
import { getImagePath } from "@/utils/image-path";
import { FormattedDate } from "@/components/formatted-date";

type BrandRow = {
  id: string;
  name: string;
  slug?: string;
  logo: string | null;
  status: string;
  notes?: string | null;
  totalOwnership: number;
  availableOwnership: number;
  protectedOwnership: number;
  partnerCount: number;
  holderCount?: number;
};

type HolderRow = {
  id: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string | null;
  phone?: string | null;
  referralCode: string | null;
  currentOwnershipPercent: number;
  minimumOwnershipPercent: number;
  isPrimaryBrandHolder: boolean;
  status: string;
  companyCount: number;
  createdAt: string;
};

type BrandSummary = {
  brandId: string;
  totalOwnership: number;
  availableOwnership: number;
  protectedOwnership: number;
  partnerCount: number;
  holders: HolderRow[];
};

const PER_PAGE = 10;

type BrandFilters = {
  search: string;
  statusFilter: string;
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_BRAND_FILTERS: BrandFilters = {
  search: "",
  statusFilter: "all",
  dateFrom: "",
  dateTo: "",
};

type RemoveConfirm =
  | { type: "brand"; brand: BrandRow }
  | { type: "partner"; brandId: string; holder: HolderRow }
  | null;

function isPrimaryPlatformBrand(brand: BrandRow): boolean {
  return brand.slug === "securx";
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  return status === "active" ? "default" : "secondary";
}

function BrandAvatar({ name, logo, size = "md" }: { name: string; logo: string | null; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  const logoSrc = logo ? getImagePath(logo) : "";
  if (logoSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoSrc} alt="" className={`${dim} rounded-lg object-cover border shrink-0`} />
    );
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className={`flex ${dim} items-center justify-center rounded-lg border bg-muted font-semibold shrink-0`}
    >
      {initials || "B"}
    </div>
  );
}

function OwnershipBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <Progress value={Math.min(100, value)} className="h-2 flex-1" />
      <span className="text-sm font-medium tabular-nums w-10 text-right">{value}%</span>
    </div>
  );
}

function exportBrandsCsv(brands: BrandRow[]) {
  const headers = ["Name", "Status", "Total Ownership %", "Partners", "Available %", "Protected %"];
  const rows = brands.map((b) => [
    b.name,
    b.status,
    b.totalOwnership,
    b.holderCount ?? b.partnerCount,
    b.availableOwnership,
    b.protectedOwnership,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `brands-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BrandsAdmin() {
  const [brands, setBrands] = React.useState<BrandRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<BrandFilters>(DEFAULT_BRAND_FILTERS);
  const [searchDraft, setSearchDraft] = React.useState("");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [summaries, setSummaries] = React.useState<Record<string, BrandSummary>>({});
  const [loadingSummary, setLoadingSummary] = React.useState<string | null>(null);
  const [brandSheetOpen, setBrandSheetOpen] = React.useState(false);
  const [brandSheetMode, setBrandSheetMode] = React.useState<"create" | "edit">("create");
  const [editingBrand, setEditingBrand] = React.useState<BrandFormValues | null>(null);
  const [partnerSheetOpen, setPartnerSheetOpen] = React.useState(false);
  const [partnerMode, setPartnerMode] = React.useState<"create" | "edit">("create");
  const [editingPartner, setEditingPartner] = React.useState<OwnershipPartnerFormValues | null>(null);
  const [partnerBrandId, setPartnerBrandId] = React.useState<string>("");
  const [page, setPage] = React.useState(1);
  const [removeConfirm, setRemoveConfirm] = React.useState<RemoveConfirm>(null);
  const [removing, setRemoving] = React.useState(false);

  const patchFilters = React.useCallback((patch: Partial<BrandFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }, []);

  const loadBrands = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/ownership/brands", window.location.origin);
      if (filters.search.trim()) url.searchParams.set("search", filters.search.trim());
      if (filters.statusFilter !== "all") url.searchParams.set("status", filters.statusFilter);
      if (filters.dateFrom) url.searchParams.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) url.searchParams.set("dateTo", filters.dateTo);

      const res = await fetch(url.toString(), { credentials: "include" });
      const data = await res.json();
      if (data?.ok) setBrands(Array.isArray(data.items) ? data.items : []);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadSummary = React.useCallback(async (brandId: string) => {
    setLoadingSummary(brandId);
    try {
      const res = await fetch(`/api/ownership/brands/${brandId}`, { credentials: "include" });
      const data = await res.json();
      if (data?.ok && data.summary) {
        setSummaries((prev) => ({ ...prev, [brandId]: data.summary as BrandSummary }));
      }
    } finally {
      setLoadingSummary(null);
    }
  }, []);

  React.useEffect(() => {
    void loadBrands();
  }, [loadBrands]);

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
    setFilters(DEFAULT_BRAND_FILTERS);
    setPage(1);
  };

  const activeFilterCount =
    (filters.search.trim() ? 1 : 0) +
    (filters.statusFilter !== "all" ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0);

  const globalStats = React.useMemo(() => {
    const active = brands.filter((b) => b.status === "active");
    const totalPartners = brands.reduce(
      (sum, b) => sum + (b.holderCount ?? b.partnerCount),
      0,
    );
    const avgProtected =
      active.length > 0
        ? Math.round(active.reduce((sum, b) => sum + b.protectedOwnership, 0) / active.length)
        : 0;
    const avgAvailable =
      active.length > 0
        ? Math.round(active.reduce((sum, b) => sum + b.availableOwnership, 0) / active.length)
        : 0;
    return {
      totalBrands: brands.length,
      totalPartners,
      avgProtected,
      avgAvailable,
    };
  }, [brands]);

  const totalPages = Math.max(1, Math.ceil(brands.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageBrands = brands.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const from = brands.length === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
  const to = Math.min(currentPage * PER_PAGE, brands.length);

  const toggleExpand = (brandId: string) => {
    if (expandedId === brandId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(brandId);
    if (!summaries[brandId]) void loadSummary(brandId);
  };

  const refreshBrand = async (brandId: string) => {
    await loadBrands();
    await loadSummary(brandId);
  };

  const openCreateBrand = () => {
    setBrandSheetMode("create");
    setEditingBrand(null);
    setBrandSheetOpen(true);
  };

  const openEditBrand = (brand: BrandRow) => {
    setBrandSheetMode("edit");
    setEditingBrand({
      id: brand.id,
      name: brand.name,
      logo: brand.logo,
      status: brand.status,
      notes: brand.notes ?? null,
    });
    setBrandSheetOpen(true);
  };

  const openAddPartner = (brandId: string) => {
    setPartnerBrandId(brandId);
    setPartnerMode("create");
    setEditingPartner(null);
    setPartnerSheetOpen(true);
  };

  const openEditPartner = (brandId: string, holder: HolderRow) => {
    const isPrimary = holder.isPrimaryBrandHolder;
    const parts = isPrimary
      ? { firstName: "", lastName: "" }
      : splitHolderName(holder.name, holder.firstName, holder.lastName);
    setPartnerBrandId(brandId);
    setPartnerMode("edit");
    setEditingPartner({
      id: holder.id,
      brandId,
      firstName: parts.firstName,
      lastName: parts.lastName,
      name: holder.name,
      isPrimaryBrandHolder: isPrimary,
      email: holder.email ?? "",
      phone: holder.phone ?? "",
      referralCode: holder.referralCode ?? "",
      currentOwnershipPercent: String(holder.currentOwnershipPercent),
      minimumOwnershipPercent: String(holder.minimumOwnershipPercent),
      status: holder.status,
      payoutMethod: "",
      payoutEmail: "",
      notes: "",
    });
    setPartnerSheetOpen(true);
  };

  const toggleBrandStatus = async (brand: BrandRow) => {
    const next = brand.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/ownership/brands/${brand.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      toast.success(`Brand ${next === "active" ? "activated" : "deactivated"}`);
      void refreshBrand(brand.id);
    } else {
      toast.error(data?.message ?? "Update failed");
    }
  };

  const confirmRemove = async () => {
    if (!removeConfirm) return;
    setRemoving(true);
    try {
      if (removeConfirm.type === "brand") {
        const res = await fetch(`/api/ownership/brands/${removeConfirm.brand.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          toast.success(`Brand "${removeConfirm.brand.name}" removed.`);
          setRemoveConfirm(null);
          if (expandedId === removeConfirm.brand.id) setExpandedId(null);
          setSummaries((prev) => {
            const next = { ...prev };
            delete next[removeConfirm.brand.id];
            return next;
          });
          void loadBrands();
        } else {
          toast.error(data?.message ?? "Could not remove brand.");
        }
      } else {
        const res = await fetch(`/api/ownership/holders/${removeConfirm.holder.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          toast.success(`Partner "${removeConfirm.holder.name}" removed from ownership.`);
          setRemoveConfirm(null);
          void refreshBrand(removeConfirm.brandId);
        } else {
          toast.error(data?.message ?? "Could not remove partner.");
        }
      }
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading brands…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Manage brand ownership percentages across partners. Total ownership cannot exceed 100%.
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              exportBrandsCsv(brands);
              toast.success("Brands exported.");
            }}
            disabled={brands.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={openCreateBrand}>
            <Plus className="mr-2 h-4 w-4" />
            Create Brand
          </Button>
        </div>
      </div>

      {/* Global summary */}
      {brands.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardStatCard
            label="Total Brands"
            value={globalStats.totalBrands}
            sub="Active brands in system"
            icon={<Building2 className="h-8 w-8" />}
          />
          <DashboardStatCard
            label="Total Partners"
            value={globalStats.totalPartners}
            sub="Across all brands"
            icon={<Users className="h-8 w-8" />}
          />
          <DashboardStatCard
            label="Total Protected Ownership"
            value={`${globalStats.avgProtected}%`}
            sub="Average minimum protected"
            icon={<Shield className="h-8 w-8" />}
          />
          <DashboardStatCard
            label="Available Ownership"
            value={`${globalStats.avgAvailable}%`}
            sub="Average unassigned"
            icon={<Percent className="h-8 w-8" />}
          />
        </div>
      ) : null}

      {/* Filters */}
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
                placeholder="Search brands by name or slug…"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-end">
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
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

      {/* Brand table with row accordion */}
      {brands.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No brands yet. Create your first brand to begin assigning ownership.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Brand</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ownership</TableHead>
                  <TableHead className="text-center">Partners</TableHead>
                  <TableHead className="text-center">Available</TableHead>
                  <TableHead className="text-center">Protected</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageBrands.map((brand) => {
                  const expanded = expandedId === brand.id;
                  const summary = summaries[brand.id];
                  const holders = summary?.holders ?? [];
                  const chartData = holders.map((h) => ({
                    name: h.name,
                    value: h.currentOwnershipPercent,
                    isPrimaryBrandHolder: h.isPrimaryBrandHolder,
                  }));
                  const showPrimaryBadge =
                    brand.slug === "securx" ||
                    holders.some((h) => h.isPrimaryBrandHolder && h.name.toLowerCase().includes("holdings"));

                  return (
                    <React.Fragment key={brand.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/20"
                        onClick={() => toggleExpand(brand.id)}
                        aria-expanded={expanded}
                      >
                        <TableCell className="w-10 px-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={expanded ? "Collapse row" : "Expand row"}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(brand.id);
                            }}
                          >
                            {expanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-[160px]">
                            <BrandAvatar name={brand.name} logo={brand.logo} />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{brand.name}</span>
                                {expanded && showPrimaryBadge ? (
                                  <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                                    Primary Brand
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(brand.status)} className="capitalize">
                            {brand.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <OwnershipBar value={brand.totalOwnership} />
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {brand.holderCount ?? brand.partnerCount}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">{brand.availableOwnership}%</TableCell>
                        <TableCell className="text-center tabular-nums">{brand.protectedOwnership}%</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <TableActionButton
                            label="Edit"
                            primaryIcon={<Pencil className="h-4 w-4" />}
                            onPrimaryClick={() => openEditBrand(brand)}
                            className="ml-auto"
                            items={[
                              {
                                label: "Edit",
                                onSelect: () => openEditBrand(brand),
                                icon: <Pencil className="h-4 w-4" />,
                              },
                              {
                                label: "Add Partner",
                                onSelect: () => openAddPartner(brand.id),
                                icon: <Plus className="h-4 w-4" />,
                              },
                              {
                                label: brand.status === "active" ? "Deactivate" : "Activate",
                                onSelect: () => void toggleBrandStatus(brand),
                                icon:
                                  brand.status === "active" ? (
                                    <Ban className="h-4 w-4" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                  ),
                              },
                              ...(!isPrimaryPlatformBrand(brand)
                                ? [
                                    {
                                      label: "Remove Brand",
                                      onSelect: () => setRemoveConfirm({ type: "brand", brand }),
                                      icon: <Trash2 className="h-4 w-4" />,
                                      destructive: true,
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </TableCell>
                      </TableRow>

                      {expanded ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={8} className="border-t bg-muted/5 p-0">
                            <div className="p-4 md:p-6">
                              {loadingSummary === brand.id && !summary ? (
                                <div className="flex items-center justify-center py-12 text-muted-foreground">
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Loading details…
                                </div>
                              ) : summary ? (
                                <>
                                  <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-4 text-sm text-muted-foreground">
                                    <span>
                                      <strong className="text-foreground">{summary.totalOwnership}%</strong> ownership
                                    </span>
                                    <span>
                                      <strong className="text-foreground">{holders.length}</strong> partners
                                    </span>
                                    <span>
                                      <strong className="text-foreground">{summary.availableOwnership}%</strong> available
                                    </span>
                                    <span>
                                      Protected <strong className="text-foreground">{summary.protectedOwnership}%</strong>
                                    </span>
                                  </div>

                                  <div className="grid gap-6 xl:grid-cols-12">
                                    <Card className="xl:col-span-4 shadow-sm">
                                      <CardHeader className="pb-2">
                                        <CardTitle className="text-base font-semibold">
                                          Ownership Distribution
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-4">
                                        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                                          <OwnershipDonutChart data={chartData} size={160} />
                                          <div className="min-w-0 flex-1">
                                            <OwnershipDistributionLegend data={chartData} />
                                          </div>
                                        </div>
                                        <div className="rounded-lg border   p-3 text-center dark: dark:from-amber-950 dark:to-amber-900">
                                          <p className="text-xs text-amber-700/80 dark:text-amber-400">
                                            Available Ownership
                                          </p>
                                          <p className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-200">
                                            {summary.availableOwnership}%
                                          </p>
                                        </div>
                                      </CardContent>
                                    </Card>

                                    <Card className="xl:col-span-8 shadow-sm">
                                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                        <CardTitle className="text-base font-semibold">
                                          Partners ({holders.length})
                                        </CardTitle>
                                        <Button size="sm" onClick={() => openAddPartner(brand.id)}>
                                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                                          Add Partner
                                        </Button>
                                      </CardHeader>
                                      <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>Partner / Brand</TableHead>
                                                <TableHead>Referral Code</TableHead>
                                                <TableHead>Current</TableHead>
                                                <TableHead>Minimum</TableHead>
                                                <TableHead>Joined On</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {holders.length === 0 ? (
                                                <TableRow>
                                                  <TableCell
                                                    colSpan={6}
                                                    className="py-8 text-center text-muted-foreground"
                                                  >
                                                    No partners assigned yet.
                                                  </TableCell>
                                                </TableRow>
                                              ) : (
                                                holders.map((h) => (
                                                  <TableRow key={h.id}>
                                                    <TableCell>
                                                      <div className="flex items-center gap-2 min-w-[140px]">
                                                        <BrandAvatar name={h.name} logo={null} size="sm" />
                                                        <div className="min-w-0">
                                                          <div className="font-medium truncate">{h.name}</div>
                                                          {h.email ? (
                                                            <div className="text-xs text-muted-foreground truncate">
                                                              {h.email}
                                                            </div>
                                                          ) : null}
                                                          {h.isPrimaryBrandHolder ? (
                                                            <Badge
                                                              variant="outline"
                                                              className="mt-0.5 text-[10px] border-primary/40 text-primary"
                                                            >
                                                              Primary Brand
                                                            </Badge>
                                                          ) : null}
                                                        </div>
                                                      </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm">{h.referralCode ?? "—"}</TableCell>
                                                    <TableCell>
                                                      <OwnershipBar value={h.currentOwnershipPercent} />
                                                    </TableCell>
                                                    <TableCell>
                                                      <OwnershipBar value={h.minimumOwnershipPercent} />
                                                    </TableCell>
                                                    <TableCell className="text-sm whitespace-nowrap">
                                                      <FormattedDate value={h.createdAt} />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                      <TableActionButton
                                                        label="Edit"
                                                        primaryIcon={<Pencil className="h-4 w-4" />}
                                                        onPrimaryClick={() => openEditPartner(brand.id, h)}
                                                        className="ml-auto"
                                                        items={[
                                                          {
                                                            label: "Edit",
                                                            onSelect: () => openEditPartner(brand.id, h),
                                                            icon: <Pencil className="h-4 w-4" />,
                                                          },
                                                          ...(h.isPrimaryBrandHolder
                                                            ? []
                                                            : [
                                                                {
                                                                  label: "Remove Partner",
                                                                  onSelect: () =>
                                                                    setRemoveConfirm({
                                                                      type: "partner",
                                                                      brandId: brand.id,
                                                                      holder: h,
                                                                    }),
                                                                  icon: <Trash2 className="h-4 w-4" />,
                                                                },
                                                              ]),
                                                        ]}
                                                      />
                                                    </TableCell>
                                                  </TableRow>
                                                ))
                                              )}
                                              {holders.length > 0 ? (
                                                <TableRow className="bg-muted/40 font-medium border-t">
                                                  <TableCell colSpan={2} className="text-right">
                                                    Total
                                                  </TableCell>
                                                  <TableCell>
                                                    <OwnershipBar value={summary.totalOwnership} />
                                                  </TableCell>
                                                  <TableCell>
                                                    <OwnershipBar value={summary.protectedOwnership} />
                                                  </TableCell>
                                                  <TableCell colSpan={2} />
                                                </TableRow>
                                              ) : null}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Pagination footer */}
      {brands.length > 0 ? (
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
          <p>
            Showing {from} to {to} of {brands.length} brands
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

      <BrandFormSheet
        open={brandSheetOpen}
        onOpenChange={setBrandSheetOpen}
        mode={brandSheetMode}
        initial={editingBrand}
        onSaved={() => {
          const editedId = editingBrand?.id;
          void loadBrands();
          if (editedId) void loadSummary(editedId);
        }}
      />

      <OwnershipPartnerFormSheet
        open={partnerSheetOpen}
        onOpenChange={setPartnerSheetOpen}
        mode={partnerMode}
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        defaultBrandId={partnerBrandId}
        initial={editingPartner}
        existingHolders={
          summaries[partnerBrandId]?.holders.map((h) => ({
            id: h.id,
            name: h.name,
            currentOwnershipPercent: h.currentOwnershipPercent,
            isPrimaryBrandHolder: h.isPrimaryBrandHolder,
          })) ?? []
        }
        onSaved={() => {
          if (partnerBrandId) void refreshBrand(partnerBrandId);
          else void loadBrands();
        }}
      />

      <Dialog open={removeConfirm != null} onOpenChange={(open) => !open && setRemoveConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {removeConfirm?.type === "brand" ? "Remove Brand" : "Remove Partner"}
            </DialogTitle>
            <DialogDescription>
              {removeConfirm?.type === "brand" ? (
                <>
                  Permanently remove <strong>{removeConfirm.brand.name}</strong> and all of its
                  ownership records? This cannot be undone.
                </>
              ) : removeConfirm?.type === "partner" ? (
                <>
                  Remove <strong>{removeConfirm.holder.name}</strong> from ownership? Their assigned
                  percentage will be cleared and the partnership will end.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveConfirm(null)} disabled={removing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmRemove()} disabled={removing}>
              {removing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {removeConfirm?.type === "brand" ? "Remove Brand" : "Remove Partner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
