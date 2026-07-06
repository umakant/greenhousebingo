"use client";

import * as React from "react";
import {
  Mail,
  Ban,
  CheckCircle2,
  FileText,
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

import {
  OwnershipPartnerFormSheet,
  type OwnershipPartnerFormValues,
} from "@/components/ownership/ownership-partner-form-sheet";
import { splitHolderName } from "@/lib/brand-ownership-holder-name";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { FormattedDate } from "@/components/formatted-date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { TableActionButton } from "@/components/ui/table-action-button";
import { PartnershipAgreementReviewDialog } from "@/components/partnerships/partnership-agreement-review-dialog";

type PartnerRow = {
  id: string;
  brandId: string;
  brandName: string;
  brandLogo: string | null;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string | null;
  phone: string | null;
  referralCode: string | null;
  currentOwnershipPercent: number;
  minimumOwnershipPercent: number;
  isPrimaryBrandHolder: boolean;
  status: string;
  payoutMethod: string | null;
  payoutEmail: string | null;
  companyCount: number;
  agreementStatus: string | null;
  createdAt: string;
};

type BrandOption = {
  id: string;
  name: string;
  totalOwnership: number;
  availableOwnership: number;
  protectedOwnership: number;
  status: string;
};

const PER_PAGE = 8;

type PartnerFilters = {
  search: string;
  brandFilter: string;
  statusFilter: string;
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_PARTNER_FILTERS: PartnerFilters = {
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
  if (status === "active") return "default";
  if (status === "rejected") return "destructive";
  if (status === "pending_agreement" || status === "pending_brand_approval") return "outline";
  return "secondary";
}

function statusLabel(status: string): string {
  if (status === "pending_agreement") return "Awaiting signature";
  if (status === "pending_brand_approval") return "Awaiting brand approval";
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  if (status === "rejected") return "Rejected";
  return status.replace(/_/g, " ");
}

export default function OwnershipPartnersAdmin() {
  const [rows, setRows] = React.useState<PartnerRow[]>([]);
  const [brands, setBrands] = React.useState<BrandOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<PartnerFilters>(DEFAULT_PARTNER_FILTERS);
  const [searchDraft, setSearchDraft] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<OwnershipPartnerFormValues | null>(null);
  const [defaultBrandId, setDefaultBrandId] = React.useState("");
  const [removePartner, setRemovePartner] = React.useState<PartnerRow | null>(null);
  const [removing, setRemoving] = React.useState(false);
  const [reviewAgreement, setReviewAgreement] = React.useState<PartnerRow | null>(null);

  const patchFilters = React.useCallback((patch: Partial<PartnerFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const f = filters;
      const url = new URL("/api/ownership/partners", window.location.origin);
      if (f.search.trim()) url.searchParams.set("search", f.search.trim());
      if (f.brandFilter !== "all") url.searchParams.set("brandId", f.brandFilter);
      if (f.statusFilter !== "all") url.searchParams.set("status", f.statusFilter);
      if (f.dateFrom) url.searchParams.set("dateFrom", f.dateFrom);
      if (f.dateTo) url.searchParams.set("dateTo", f.dateTo);

      const [partnersRes, brandsRes] = await Promise.all([
        fetch(url.toString(), { credentials: "include" }),
        fetch("/api/ownership/brands", { credentials: "include" }),
      ]);

      const readJson = async (res: Response) => {
        const text = await res.text();
        if (!text.trim()) return null;
        try {
          return JSON.parse(text) as Record<string, unknown>;
        } catch {
          return null;
        }
      };

      const partnersData = await readJson(partnersRes);
      const brandsData = await readJson(brandsRes);

      if (partnersData?.ok) {
        setRows(partnersData.items as PartnerRow[]);
      } else if (!partnersRes.ok) {
        toast.error(String(partnersData?.message ?? "Could not load partners."));
      }

      if (brandsData?.ok) {
        setBrands(
          (brandsData.items as BrandOption[]).map((b) => ({
            id: b.id,
            name: b.name,
            totalOwnership: b.totalOwnership,
            availableOwnership: b.availableOwnership,
            protectedOwnership: b.protectedOwnership,
            status: b.status,
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
    setFilters(DEFAULT_PARTNER_FILTERS);
    setPage(1);
  };

  const globalStats = React.useMemo(() => {
    const activeBrands = brands.filter((b) => b.status === "active");
    const avgOwnership =
      activeBrands.length > 0
        ? Math.round(activeBrands.reduce((sum, b) => sum + b.totalOwnership, 0) / activeBrands.length)
        : 0;
    const avgProtected =
      activeBrands.length > 0
        ? Math.round(activeBrands.reduce((sum, b) => sum + b.protectedOwnership, 0) / activeBrands.length)
        : 0;
    const avgAvailable =
      activeBrands.length > 0
        ? Math.round(activeBrands.reduce((sum, b) => sum + b.availableOwnership, 0) / activeBrands.length)
        : 0;
    return {
      totalPartners: rows.length,
      avgOwnership,
      avgProtected,
      avgAvailable,
    };
  }, [brands, rows.length]);

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

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setDefaultBrandId(brands[0]?.id ?? "");
    setSheetOpen(true);
  };

  const openEdit = (row: PartnerRow) => {
    const isPrimary = row.isPrimaryBrandHolder;
    const parts = isPrimary
      ? { firstName: "", lastName: "" }
      : splitHolderName(row.name, row.firstName, row.lastName);
    setMode("edit");
    setDefaultBrandId(row.brandId);
    setEditing({
      id: row.id,
      brandId: row.brandId,
      firstName: parts.firstName,
      lastName: parts.lastName,
      name: row.name,
      isPrimaryBrandHolder: isPrimary,
      email: row.email ?? "",
      phone: row.phone ?? "",
      referralCode: row.referralCode ?? "",
      currentOwnershipPercent: String(row.currentOwnershipPercent),
      minimumOwnershipPercent: String(row.minimumOwnershipPercent),
      status: row.status,
      payoutMethod: row.payoutMethod ?? "",
      payoutEmail: row.payoutEmail ?? "",
      notes: "",
    });
    setSheetOpen(true);
  };

  const agreementAction = async (holderId: string, action: "approve" | "reject" | "resend") => {
    const res = await fetch(`/api/ownership/holders/${holderId}/agreement`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      toast.success(data.message ?? "Done.");
      void load();
    } else {
      toast.error(data?.message ?? "Action failed.");
    }
  };

  const toggleStatus = async (row: PartnerRow) => {
    const next = row.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/ownership/holders/${row.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentOwnershipPercent: row.currentOwnershipPercent,
        minimumOwnershipPercent: row.minimumOwnershipPercent,
        status: next,
      }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      toast.success(`Partner ${next === "active" ? "activated" : "deactivated"}.`);
      void load();
    } else {
      toast.error(data?.message ?? "Update failed.");
    }
  };

  const confirmRemovePartner = async () => {
    if (!removePartner) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/ownership/holders/${removePartner.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        toast.success(`Partner "${removePartner.name}" removed from ownership.`);
        setRemovePartner(null);
        void load();
      } else {
        toast.error(data?.message ?? "Could not remove partner.");
      }
    } finally {
      setRemoving(false);
    }
  };

  const holdersForBrand = (brandId: string) =>
    rows
      .filter((r) => r.brandId === brandId)
      .map((r) => ({
        id: r.id,
        name: r.name,
        currentOwnershipPercent: r.currentOwnershipPercent,
        isPrimaryBrandHolder: r.isPrimaryBrandHolder,
      }));

  if (loading && rows.length === 0 && brands.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading partners…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Manage partners and their ownership percentages across brands. Total ownership cannot exceed 100%.
        </p>
        <Button className="shrink-0" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Partner
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          label="Total Partners"
          value={globalStats.totalPartners}
          sub="Across all brands"
          icon={<Users className="h-8 w-8" />}
        />
        <DashboardStatCard
          label="Total Ownership"
          value={`${globalStats.avgOwnership}%`}
          sub="Average assigned per brand"
          icon={<Percent className="h-8 w-8" />}
        />
        <DashboardStatCard
          label="Protected Ownership"
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
                placeholder="Search partners by name, brand or code…"
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending_agreement">Awaiting signature</SelectItem>
                    <SelectItem value="pending_brand_approval">Awaiting brand approval</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
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

      {/* Table */}
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
                <TableHead>Partner / Brand</TableHead>
                <TableHead>Referral Code</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Current Ownership</TableHead>
                <TableHead>Minimum Ownership</TableHead>
                <TableHead className="text-center">Companies</TableHead>
                <TableHead>Joined On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No partners found.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-start gap-3 min-w-[180px]">
                        <PartnerAvatar name={row.name} />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{row.name}</div>
                          {row.email ? (
                            <div className="text-xs text-muted-foreground truncate">{row.email}</div>
                          ) : null}
                          {row.isPrimaryBrandHolder ? (
                            <Badge
                              variant="outline"
                              className="mt-1 text-[10px] border-primary/40 text-primary"
                            >
                              Primary Brand
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{row.referralCode ?? "—"}</TableCell>
                    <TableCell className="text-sm">{row.brandName}</TableCell>
                    <TableCell>
                      <OwnershipBar value={row.currentOwnershipPercent} />
                    </TableCell>
                    <TableCell>
                      <OwnershipBar value={row.minimumOwnershipPercent} />
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{row.companyCount}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      <FormattedDate value={row.createdAt} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)} className="capitalize">
                        {statusLabel(row.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <TableActionButton
                        label="Edit"
                        primaryIcon={<Pencil className="h-4 w-4" />}
                        onPrimaryClick={() => openEdit(row)}
                        className="ml-auto"
                        items={[
                          {
                            label: "Edit",
                            onSelect: () => openEdit(row),
                            icon: <Pencil className="h-4 w-4" />,
                          },
                          ...(row.status === "pending_agreement" && !row.isPrimaryBrandHolder
                            ? [
                                {
                                  label: "Resend agreement email",
                                  onSelect: () => void agreementAction(row.id, "resend"),
                                  icon: <Mail className="h-4 w-4" />,
                                },
                              ]
                            : []),
                          ...(row.status === "pending_brand_approval" && !row.isPrimaryBrandHolder
                            ? [
                                {
                                  label: "View signed agreement",
                                  onSelect: () => setReviewAgreement(row),
                                  icon: <FileText className="h-4 w-4" />,
                                },
                                {
                                  label: "Approve agreement",
                                  onSelect: () => void agreementAction(row.id, "approve"),
                                  icon: <CheckCircle2 className="h-4 w-4" />,
                                },
                                {
                                  label: "Reject agreement",
                                  onSelect: () => void agreementAction(row.id, "reject"),
                                  icon: <Ban className="h-4 w-4" />,
                                },
                              ]
                            : []),
                          ...(row.status === "active" || row.status === "inactive"
                            ? [
                                {
                                  label: row.status === "active" ? "Deactivate" : "Activate",
                                  onSelect: () => void toggleStatus(row),
                                  icon:
                                    row.status === "active" ? (
                                      <Ban className="h-4 w-4" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4" />
                                    ),
                                },
                              ]
                            : []),
                          ...(row.isPrimaryBrandHolder
                            ? []
                            : [
                                {
                                  label: "Remove Partner",
                                  onSelect: () => setRemovePartner(row),
                                  icon: <Trash2 className="h-4 w-4" />,
                                },
                              ]),
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      {rows.length > 0 ? (
        <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {from} to {to} of {rows.length} partners
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

      <OwnershipPartnerFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={mode}
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        defaultBrandId={defaultBrandId}
        initial={editing}
        existingHolders={holdersForBrand(defaultBrandId || editing?.brandId || "")}
        onSaved={() => void load()}
      />

      <PartnershipAgreementReviewDialog
        holderId={reviewAgreement?.id ?? null}
        partnerName={reviewAgreement?.name}
        brandName={reviewAgreement?.brandName}
        open={reviewAgreement != null}
        onOpenChange={(open) => !open && setReviewAgreement(null)}
        onApproved={() => void load()}
        onRejected={() => void load()}
      />

      <Dialog open={removePartner != null} onOpenChange={(open) => !open && setRemovePartner(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Partner</DialogTitle>
            <DialogDescription>
              Remove <strong>{removePartner?.name}</strong> from{" "}
              <strong>{removePartner?.brandName}</strong>? Their assigned ownership will be cleared
              and the partnership will end.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovePartner(null)} disabled={removing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmRemovePartner()} disabled={removing}>
              {removing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remove Partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
