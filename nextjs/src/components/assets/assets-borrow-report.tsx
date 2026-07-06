"use client";

import * as React from "react";
import { Search, Download, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";


const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "returned", label: "Returned" },
  { value: "overdue", label: "Overdue" },
];

type BorrowRow = {
  id: string; userId: string; startDate: string; endDate: string;
  actualReturnDate?: string | null; rentQuantity: number; status: string;
  asset?: { id: string; name: string } | null;
  _count?: { payments: number };
};

function statusBadge(s: string) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    approved: "bg-green-100 text-green-800",
    returned: "bg-blue-100 text-blue-800",
    overdue: "bg-red-100 text-red-800",
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${map[s] ?? "bg-gray-100 text-gray-700"}`}>{s}</span>;
}

export default function AssetsBorrowReport({ permissions }: { permissions: string[] }) {
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const [items, setItems] = React.useState<BorrowRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [perPage] = React.useState(20);

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = { draft: 0, approved: 0, returned: 0, overdue: 0 };
    items.forEach(r => { if (r.status in counts) counts[r.status]++; });
    return counts;
  }, [items]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage), search });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/assets/borrow-rent?${params}`);
      const json = await res.json();
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, statusFilter]);

  React.useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const statCards = [
    { label: t("Total Records"), value: total, color: "text-blue-600" },
    { label: t("Approved"), value: statusCounts.approved, color: "text-green-600" },
    { label: t("Returned"), value: statusCounts.returned, color: "text-purple-600" },
    { label: t("Overdue"), value: statusCounts.overdue, color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map(c => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("Search...")} className="pl-9 w-56" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">{t("Asset")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Borrower")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Start Date")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("End Date")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Return Date")}</th>
                  <th className="text-center px-4 py-3 font-medium">{t("Qty")}</th>
                  <th className="text-center px-4 py-3 font-medium">{t("Payments")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">{t("Loading...")}</td></tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-muted-foreground">{t("No records found")}</p>
                      </div>
                    </td>
                  </tr>
                ) : items.map(row => (
                  <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{row.asset?.name ?? "—"}</td>
                    <td className="px-4 py-3">{row.userId}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(row.startDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(row.endDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.actualReturnDate ? fmtDate(row.actualReturnDate) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">{row.rentQuantity}</td>
                    <td className="px-4 py-3 text-center">{row._count?.payments ?? 0}</td>
                    <td className="px-4 py-3">{statusBadge(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">{t("Page")} {page} {t("of")} {totalPages} ({total} {t("total")})</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t("Previous")}</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t("Next")}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
