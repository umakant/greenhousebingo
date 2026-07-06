"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";


type Coupon = {
  id: string;
  name: string;
  description?: string | null;
  code: string;
  discount: string;
  type: string;
  limit?: number | null;
  limit_per_user?: number | null;
  expiry_date?: string | null;
  status: boolean;
};

type UsageRow = {
  id: string;
  user?: { id: string; name: string; email: string } | null;
  order_id?: string | null;
  created_at?: string | null;
};

export default function CouponDetails({ couponId }: { couponId: string }) {
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [coupon, setCoupon] = React.useState<Coupon | null>(null);
  const [usage, setUsage] = React.useState<UsageRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [filters, setFilters] = React.useState({ user_name: "", order_id: "" });

  async function loadCoupon() {
    const res = await fetch(`/api/coupons/${couponId}`, { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok || !json?.ok) throw new Error(json?.message || "Failed to load coupon.");
    setCoupon(json.coupon as Coupon);
  }

  async function loadUsage(opts?: { nextPage?: number; nextPerPage?: number }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("per_page", String(pp));
    if (filters.user_name.trim()) params.set("user_name", filters.user_name.trim());
    if (filters.order_id.trim()) params.set("order_id", filters.order_id.trim());
    const res = await fetch(`/api/coupons/${couponId}/usage?${params.toString()}`, { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok || !json?.ok) throw new Error(json?.message || "Failed to load usage.");
    const meta = json.usageRecords?.meta ?? {};
    setUsage(Array.isArray(json.usageRecords?.data) ? (json.usageRecords.data as UsageRow[]) : []);
    setPage(meta.current_page ?? p);
    setPerPage(meta.per_page ?? pp);
    setTotal(meta.total ?? 0);
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadCoupon(), loadUsage({ nextPage: 1 })]);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponId]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      <Card className="shadow-sm">
        <CardContent className="p-6">
          {loading || !coupon ? (
            <div className="text-sm text-muted-foreground">{t("Loading...")}</div>
          ) : (
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <div className="text-lg font-semibold">{coupon.name}</div>
                <div className="text-sm text-muted-foreground">{coupon.description || "-"}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono">
                    {coupon.code}
                  </Badge>
                  <Badge variant="secondary" className="capitalize">
                    {coupon.type}
                  </Badge>
                  <Badge variant={coupon.status ? "default" : "destructive"}>{coupon.status ? t("Active") : t("Inactive")}</Badge>
                </div>
              </div>
              <div className="text-sm">
                <div>
                  <span className="text-muted-foreground">{t("Discount")}:</span> {coupon.type === "percentage" ? `${coupon.discount}%` : `$${coupon.discount}`}
                </div>
                <div>
                  <span className="text-muted-foreground">{t("Limit")}:</span> {coupon.limit ?? t("Unlimited")}
                </div>
                <div>
                  <span className="text-muted-foreground">{t("Expiry")}:</span> {coupon.expiry_date ? coupon.expiry_date.slice(0, 10) : "-"}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-6 border-b bg-gray-50/50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              <Input value={filters.user_name} onChange={(e) => setFilters((p) => ({ ...p, user_name: e.target.value }))} placeholder={t("User name")} className="w-56" />
              <Input value={filters.order_id} onChange={(e) => setFilters((p) => ({ ...p, order_id: e.target.value }))} placeholder={t("Order ID")} className="w-56" />
              <Button type="button" onClick={() => void loadUsage({ nextPage: 1 })}>
                {t("Search")}
              </Button>
            </div>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              value={String(perPage)}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10) || 10;
                setPerPage(v);
                setPage(1);
                void loadUsage({ nextPage: 1, nextPerPage: v });
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={String(n)}>
                  {n} {t("per page")}
                </option>
              ))}
            </select>
          </div>
        </CardContent>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left font-medium px-4 py-3">{t("User")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Order ID")}</th>
                  <th className="text-left font-medium px-4 py-3">{t("Date")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                      {t("Loading...")}
                    </td>
                  </tr>
                ) : usage.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                      {t("No usage records found.")}
                    </td>
                  </tr>
                ) : (
                  usage.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-accent/20">
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.user?.name || "N/A"}</div>
                        <div className="text-sm text-muted-foreground">{u.user?.email || ""}</div>
                      </td>
                      <td className="px-4 py-3">{u.order_id || "-"}</td>
                      <td className="px-4 py-3">{u.created_at ? fmtDate(u.created_at) : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>

        <CardContent className="px-4 py-2 border-t bg-gray-50/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              {t("Page")} {page} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void loadUsage({ nextPage: page - 1 })} disabled={page <= 1}>
                {t("Previous")}
              </Button>
              <Button type="button" variant="secondary" size="sm" className="min-w-9" disabled>
                {page}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadUsage({ nextPage: page + 1 })}
                disabled={page >= totalPages}
              >
                {t("Next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

