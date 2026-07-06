"use client";

import * as React from "react";
import { DollarSign } from "lucide-react";
import { toast } from "sonner";

import {
  AffiliateAdminListShell,
  useAffiliateListPagination,
} from "@/components/affiliate-business/affiliate-admin-list-shell";
import { AffiliateStatusBadge } from "@/components/affiliate-business/affiliate-status-badge";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format-currency";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate } from "@/lib/format-date";
import { t } from "@/lib/admin-t";

type CommissionRow = {
  id: string;
  orderRef: string;
  customerEmail: string | null;
  amount: number;
  currency: string;
  status: string;
  earnedAt: string;
  partner: { id: string; name: string; referralCode: string };
  program: { id: string; name: string };
};


export function AffiliateCommissionsAdminClient() {
  const { settings } = useAppSettings();
  const currency = settings.currencySymbol ?? "$";

  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<CommissionRow[]>([]);
  const [search, setSearch] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const { page, perPage, setPage, setPerPage, resetPage, paginate } = useAffiliateListPagination(10);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (appliedSearch) params.set("search", appliedSearch);
      if (status) params.set("status", status);
      const qs = params.toString();
      const res = await fetch(`/api/affiliate-business/commissions${qs ? `?${qs}` : ""}`, {
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: CommissionRow[] };
      if (!res.ok || !data?.ok) {
        toast.error("Failed to load commissions");
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

  const setCommissionStatus = async (id: string, nextStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/affiliate-business/commissions", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean };
      if (!res.ok || !data?.ok) {
        toast.error("Update failed");
        return;
      }
      toast.success(`Marked as ${nextStatus}`);
      void load();
    } finally {
      setUpdatingId(null);
    }
  };

  const commissionActions = (row: CommissionRow) => {
    if (row.status !== "pending") {
      return { label: t("View"), items: [] as TableActionItem[] };
    }
    const menuItems: TableActionItem[] = [
      {
        label: t("Approve"),
        onSelect: () => void setCommissionStatus(row.id, "approved"),
        disabled: updatingId === row.id,
      },
      {
        label: t("Reject"),
        onSelect: () => void setCommissionStatus(row.id, "rejected"),
        destructive: true,
        disabled: updatingId === row.id,
      },
    ];
    return {
      label: t("Approve"),
      onPrimaryClick: () => void setCommissionStatus(row.id, "approved"),
      items: menuItems,
    };
  };

  return (
    <AffiliateAdminListShell
      search={search}
      onSearchChange={setSearch}
      onSearch={handleSearch}
      searchPlaceholder={t("Search commissions...")}
      loading={loading}
      itemCount={items.length}
      pagination={{ page, perPage, onPageChange: setPage, onPerPageChange: setPerPage }}
      paginatedTotal={total}
      paginatedLastPage={lastPage}
      paginatedFrom={from}
      paginatedTo={to}
      activeFilterCount={status ? 1 : 0}
      hasFilters={!!appliedSearch.trim() || !!status}
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
              <SelectItem value="pending">{t("Pending")}</SelectItem>
              <SelectItem value="approved">{t("Approved")}</SelectItem>
              <SelectItem value="paid">{t("Paid")}</SelectItem>
              <SelectItem value="rejected">{t("Rejected")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
      emptyIcon={DollarSign}
      emptyTitle={t("No commissions found")}
      emptyDescription={t("Commissions appear when partners generate referred sales.")}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left font-medium">{t("Order")}</th>
              <th className="p-3 text-left font-medium">{t("Partner")}</th>
              <th className="p-3 text-left font-medium">{t("Program")}</th>
              <th className="p-3 text-left font-medium">{t("Customer")}</th>
              <th className="p-3 text-right font-medium">{t("Amount")}</th>
              <th className="p-3 text-left font-medium">{t("Status")}</th>
              <th className="p-3 text-left font-medium">{t("Earned")}</th>
              <th className="p-3 text-right font-medium">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr key={row.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono text-sm">{row.orderRef}</td>
                <td className="p-3">
                  <div className="font-medium">{row.partner.name}</div>
                  <div className="text-xs text-muted-foreground">{row.partner.referralCode}</div>
                </td>
                <td className="p-3">{row.program.name}</td>
                <td className="p-3 text-sm text-muted-foreground">{row.customerEmail ?? "—"}</td>
                <td className="p-3 text-right tabular-nums font-medium">
                  {formatCurrency(row.amount, { currency })}
                </td>
                <td className="p-3">
                  <AffiliateStatusBadge status={row.status} />
                </td>
                <td className="p-3 whitespace-nowrap text-sm text-muted-foreground">
                  {formatDate(row.earnedAt, settings)}
                </td>
                <td className="p-3 text-right">
                  {row.status === "pending" ? (
                    <TableActionButton {...commissionActions(row)} />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AffiliateAdminListShell>
  );
}
