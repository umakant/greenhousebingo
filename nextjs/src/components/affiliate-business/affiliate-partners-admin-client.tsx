"use client";

import * as React from "react";
import { Copy, Users } from "lucide-react";
import { toast } from "sonner";

import {
  AffiliateAdminListShell,
  useAffiliateListPagination,
} from "@/components/affiliate-business/affiliate-admin-list-shell";
import { AffiliatePartnerFormSheet, type AffiliatePartnerFormValues } from "@/components/affiliate-business/affiliate-partner-form-sheet";
import { AffiliateStatusBadge } from "@/components/affiliate-business/affiliate-status-badge";
import { TableColumnVisibilityMenu } from "@/components/ui/table-column-visibility-menu";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format-currency";
import { useAppSettings } from "@/contexts/app-settings-context";
import { t } from "@/lib/admin-t";

type PartnerRow = {
  id: string;
  name: string;
  email: string | null;
  referralCode: string;
  tier: string;
  status: string;
  commissionRate: number;
  totalClicks: number;
  totalConversions: number;
  lifetimeEarnings: number;
  joinedAt: string;
};

const STORAGE_KEY = "pf-affiliate-partners-table-columns-v1";

type ColumnId = "partner" | "code" | "tier" | "status" | "clicks" | "conversions" | "lifetime";

const DEFAULT_COLUMNS: Record<ColumnId, boolean> = {
  partner: true,
  code: true,
  tier: true,
  status: true,
  clicks: true,
  conversions: true,
  lifetime: true,
};


export function AffiliatePartnersAdminClient() {
  const { settings } = useAppSettings();
  const currency = settings.currencySymbol ?? "$";

  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<ColumnId>(
    STORAGE_KEY,
    DEFAULT_COLUMNS,
  );

  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<PartnerRow[]>([]);
  const [search, setSearch] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetMode, setSheetMode] = React.useState<"create" | "edit">("create");
  const [editInitial, setEditInitial] = React.useState<AffiliatePartnerFormValues | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const { page, perPage, setPage, setPerPage, resetPage, paginate } = useAffiliateListPagination(10);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (appliedSearch) params.set("search", appliedSearch);
      if (status) params.set("status", status);
      const qs = params.toString();
      const res = await fetch(`/api/affiliate-business/partners${qs ? `?${qs}` : ""}`, {
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: PartnerRow[] };
      if (!res.ok || !data?.ok) {
        toast.error("Failed to load partners");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleSearch = () => {
    setAppliedSearch(search.trim());
    resetPage();
  };

  const { slice, total, lastPage, from, to, safePage } = paginate(items);
  React.useEffect(() => {
    if (safePage !== page) setPage(safePage);
  }, [safePage, page, setPage]);

  const openCreate = () => {
    setSheetMode("create");
    setEditInitial(null);
    setSheetOpen(true);
  };

  const openEdit = (row: PartnerRow) => {
    setSheetMode("edit");
    setEditInitial({
      id: row.id,
      name: row.name,
      email: row.email ?? "",
      referralCode: row.referralCode,
      tier: row.tier,
      status: row.status,
      commissionRate: row.commissionRate,
    });
    setSheetOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/affiliate-business/partners/${deleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean };
      if (!res.ok || !data?.ok) {
        toast.error("Delete failed");
        return;
      }
      toast.success("Partner deleted");
      setDeleteId(null);
      void load();
    } finally {
      setDeleting(false);
    }
  };

  const copyCode = (code: string) => {
    void navigator.clipboard.writeText(code);
    toast.success("Referral code copied");
  };

  const partnerActions = (row: PartnerRow) => {
    const menuItems: TableActionItem[] = [
      { label: t("Edit"), onSelect: () => openEdit(row) },
      {
        label: t("Delete"),
        onSelect: () => setDeleteId(row.id),
        destructive: true,
      },
    ];
    return {
      label: t("Edit"),
      onPrimaryClick: () => openEdit(row),
      items: menuItems,
    };
  };

  const columnMenuDefs = [
    { id: "partner" as const, label: t("Partner") },
    { id: "code" as const, label: t("Code") },
    { id: "tier" as const, label: t("Tier") },
    { id: "status" as const, label: t("Status") },
    { id: "clicks" as const, label: t("Clicks") },
    { id: "conversions" as const, label: t("Conv.") },
    { id: "lifetime" as const, label: t("Lifetime") },
  ];

  const hasFilters = !!appliedSearch.trim() || !!status;

  return (
    <>
      <AffiliateAdminListShell
        search={search}
        onSearchChange={setSearch}
        onSearch={handleSearch}
        searchPlaceholder={t("Search partners...")}
        loading={loading}
        itemCount={items.length}
        pagination={{
          page,
          perPage,
          onPageChange: setPage,
          onPerPageChange: setPerPage,
        }}
        paginatedTotal={total}
        paginatedLastPage={lastPage}
        paginatedFrom={from}
        paginatedTo={to}
        activeFilterCount={status ? 1 : 0}
        hasFilters={hasFilters}
        onClearFilters={() => {
          setSearch("");
          setAppliedSearch("");
          setStatus("");
          resetPage();
        }}
        filterContent={
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("Status")}</label>
            <Select
              value={status || "all"}
              onValueChange={(v) => {
                setStatus(v === "all" ? "" : v);
                resetPage();
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("All statuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All statuses")}</SelectItem>
                <SelectItem value="active">{t("Active")}</SelectItem>
                <SelectItem value="pending">{t("Pending")}</SelectItem>
                <SelectItem value="suspended">{t("Suspended")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        columnMenu={
          <TableColumnVisibilityMenu
            columns={columnMenuDefs}
            columnVisible={columnVisible}
            setVisibility={setVisibility}
            onReset={resetVisibility}
          />
        }
        createLabel={t("Add Partner")}
        onCreateClick={openCreate}
        emptyIcon={Users}
        emptyTitle={t("No partners found")}
        emptyDescription={t("Get started by adding your first affiliate partner.")}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {columnVisible("partner") ? (
                  <th className="p-3 text-left font-medium">{t("Partner")}</th>
                ) : null}
                {columnVisible("code") ? (
                  <th className="p-3 text-left font-medium">{t("Code")}</th>
                ) : null}
                {columnVisible("tier") ? (
                  <th className="p-3 text-left font-medium">{t("Tier")}</th>
                ) : null}
                {columnVisible("status") ? (
                  <th className="p-3 text-left font-medium">{t("Status")}</th>
                ) : null}
                {columnVisible("clicks") ? (
                  <th className="p-3 text-right font-medium">{t("Clicks")}</th>
                ) : null}
                {columnVisible("conversions") ? (
                  <th className="p-3 text-right font-medium">{t("Conv.")}</th>
                ) : null}
                {columnVisible("lifetime") ? (
                  <th className="p-3 text-right font-medium">{t("Lifetime")}</th>
                ) : null}
                <th className="p-3 text-right font-medium">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/30">
                  {columnVisible("partner") ? (
                    <td className="p-3">
                      <div className="font-medium">{row.name}</div>
                      {row.email ? (
                        <div className="text-xs text-muted-foreground">{row.email}</div>
                      ) : null}
                    </td>
                  ) : null}
                  {columnVisible("code") ? (
                    <td className="p-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-mono text-sm hover:underline"
                        onClick={() => copyCode(row.referralCode)}
                      >
                        {row.referralCode}
                        <Copy className="h-3 w-3" />
                      </button>
                    </td>
                  ) : null}
                  {columnVisible("tier") ? (
                    <td className="p-3 capitalize">{row.tier}</td>
                  ) : null}
                  {columnVisible("status") ? (
                    <td className="p-3">
                      <AffiliateStatusBadge status={row.status} />
                    </td>
                  ) : null}
                  {columnVisible("clicks") ? (
                    <td className="p-3 text-right tabular-nums">{row.totalClicks}</td>
                  ) : null}
                  {columnVisible("conversions") ? (
                    <td className="p-3 text-right tabular-nums">{row.totalConversions}</td>
                  ) : null}
                  {columnVisible("lifetime") ? (
                    <td className="p-3 text-right tabular-nums">
                      {formatCurrency(row.lifetimeEarnings, { currency })}
                    </td>
                  ) : null}
                  <td className="p-3 text-right">
                    <TableActionButton {...partnerActions(row)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AffiliateAdminListShell>

      <AffiliatePartnerFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        initial={editInitial}
        onSaved={() => void load()}
      />

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Delete Partner")}</DialogTitle>
            <DialogDescription>
              {t("Are you sure you want to delete this partner? Related commissions may be removed.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              {t("Cancel")}
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? t("Deleting...") : t("Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
