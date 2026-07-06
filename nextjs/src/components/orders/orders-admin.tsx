"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ShoppingCart } from "lucide-react";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";


type OrderRow = {
  id: string;
  order_id: string;
  plan_name: string;
  price: string;
  currency: string;
  payment_status: string;
  payment_type: string;
  created_at: string | null;
  total_coupon_used?: { coupon_detail?: { code: string; name: string } } | null;
};

type OrdersResponse = {
  ok: boolean;
  orders: { data: OrderRow[]; meta: { total: number; per_page: number; current_page: number; last_page: number } };
  message?: string;
};

function statusBadge(status: string) {
  const cls =
    status === "succeeded"
      ? "bg-green-100 text-green-800"
      : status === "pending"
        ? "bg-yellow-100 text-yellow-800"
        : status === "failed"
          ? "bg-red-100 text-red-800"
          : "bg-gray-100 text-gray-800";
  return <span className={`px-2 py-1 rounded-full text-sm ${cls}`}>{t(status.charAt(0).toUpperCase() + status.slice(1))}</span>;
}

export default function OrdersAdmin() {
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<OrderRow[]>([]);

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState("");

  async function load(opts?: { nextPage?: number; nextPerPage?: number }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("per_page", String(pp));
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/orders?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as OrdersResponse | null;
      if (!res.ok || !json?.ok) throw new Error((json as any)?.message || "Failed to load orders.");
      setItems(Array.isArray(json.orders?.data) ? json.orders.data : []);
      setPage(json.orders.meta.current_page);
      setPerPage(json.orders.meta.per_page);
      setTotal(json.orders.meta.total);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load({ nextPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  function goto(next: number) {
    const clamped = Math.max(1, Math.min(totalPages, next));
    setPage(clamped);
    void load({ nextPage: clamped });
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      <Card className="shadow-sm">
        <CardContent className="p-6 border-b bg-gray-50/50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 max-w-md min-w-[280px]">
              <div className="flex gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Search orders...")} />
                <Button type="button" onClick={() => void load({ nextPage: 1 })}>
                  {t("Search")}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={String(perPage)}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10) || 10;
                  setPerPage(v);
                  setPage(1);
                  void load({ nextPage: 1, nextPerPage: v });
                }}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} {t("per page")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left font-medium px-4 py-3">{t("Order ID")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Plan")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Coupon")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Amount")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Status")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Payment Method")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Date")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      {t("Loading...")}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14">
                      <div className="flex flex-col items-center justify-center text-center gap-2">
                        <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                        <div className="font-medium">{t("No orders found")}</div>
                        <div className="text-sm text-muted-foreground">{t("Orders will appear here when customers make purchases.")}</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((o) => {
                    const couponCode = o.total_coupon_used?.coupon_detail?.code;
                    return (
                      <tr key={o.id} className="border-b hover:bg-accent/20">
                        <td className="px-4 py-3">{o.order_id}</td>
                        <td className="px-4 py-3">{o.plan_name || "-"}</td>
                        <td className="px-4 py-3">
                          {couponCode ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {couponCode}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{formatCurrency(parseFloat(String(o.price)) || 0, settings)}</td>
                        <td className="px-4 py-3">{statusBadge(o.payment_status)}</td>
                        <td className="px-4 py-3">{o.payment_type}</td>
                        <td className="px-4 py-3">{o.created_at ? fmtDate(o.created_at) : "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>

        <CardContent className="px-4 py-2 border-t bg-gray-50/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              {t("Showing")} {from} {t("to")} {to} {t("of")} {total} {t("results")}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => goto(page - 1)} disabled={page <= 1}>
                {t("Previous")}
              </Button>
              <Button type="button" variant="secondary" size="sm" className="min-w-9" disabled>
                {page}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => goto(page + 1)} disabled={page >= totalPages}>
                {t("Next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

