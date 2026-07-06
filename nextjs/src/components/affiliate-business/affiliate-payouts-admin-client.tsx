"use client";

import * as React from "react";
import { Wallet } from "lucide-react";
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

type PayoutRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  scheduledAt: string;
  paidAt: string | null;
  reference: string | null;
  partner: { id: string; name: string };
};

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank transfer",
  paypal: "PayPal",
  check: "Check",
};


export function AffiliatePayoutsAdminClient() {
  const { settings } = useAppSettings();
  const currency = settings.currencySymbol ?? "$";

  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<PayoutRow[]>([]);
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
      const res = await fetch(`/api/affiliate-business/payouts${qs ? `?${qs}` : ""}`, {
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: PayoutRow[] };
      if (!res.ok || !data?.ok) {
        toast.error("Failed to load payouts");
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

  const updateStatus = async (id: string, nextStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/affiliate-business/payouts", {
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
      toast.success("Payout updated");
      void load();
    } finally {
      setUpdatingId(null);
    }
  };

  const payoutActions = (row: PayoutRow) => {
    if (row.status !== "scheduled" && row.status !== "processing") {
      return { label: t("View"), items: [] as TableActionItem[] };
    }
    const menuItems: TableActionItem[] = [
      {
        label: t("Mark as Paid"),
        onSelect: () => void updateStatus(row.id, "paid"),
        disabled: updatingId === row.id,
      },
    ];
    return {
      label: t("Mark as Paid"),
      onPrimaryClick: () => void updateStatus(row.id, "paid"),
      items: menuItems,
    };
  };

  return (
    <AffiliateAdminListShell
      search={search}
      onSearchChange={setSearch}
      onSearch={handleSearch}
      searchPlaceholder={t("Search payouts...")}
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
              <SelectItem value="scheduled">{t("Scheduled")}</SelectItem>
              <SelectItem value="processing">{t("Processing")}</SelectItem>
              <SelectItem value="paid">{t("Paid")}</SelectItem>
              <SelectItem value="failed">{t("Failed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
      emptyIcon={Wallet}
      emptyTitle={t("No payouts found")}
      emptyDescription={t("Payouts appear when you schedule partner payments.")}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left font-medium">{t("Partner")}</th>
              <th className="p-3 text-right font-medium">{t("Amount")}</th>
              <th className="p-3 text-left font-medium">{t("Method")}</th>
              <th className="p-3 text-left font-medium">{t("Status")}</th>
              <th className="p-3 text-left font-medium">{t("Scheduled")}</th>
              <th className="p-3 text-left font-medium">{t("Reference")}</th>
              <th className="p-3 text-right font-medium">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr key={row.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{row.partner.name}</td>
                <td className="p-3 text-right tabular-nums font-medium">
                  {formatCurrency(row.amount, { currency })}
                </td>
                <td className="p-3">{METHOD_LABELS[row.method] ?? row.method}</td>
                <td className="p-3">
                  <AffiliateStatusBadge status={row.status} />
                </td>
                <td className="p-3 whitespace-nowrap text-sm text-muted-foreground">
                  {formatDate(row.scheduledAt, settings)}
                </td>
                <td className="p-3 font-mono text-xs">{row.reference ?? "—"}</td>
                <td className="p-3 text-right">
                  {row.status === "scheduled" || row.status === "processing" ? (
                    <TableActionButton {...payoutActions(row)} />
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
