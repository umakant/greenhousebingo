"use client";

import * as React from "react";
import Link from "next/link";

import { TableActionButton } from "@/components/ui/table-action-button";
import { Eye } from "lucide-react";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { useTranslation } from "@/contexts/translation-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";

export type CompanyOrderRow = {
  id: string;
  order_id: string | null;
  plan_name: string | null;
  customer_name: string | null;
  customer_email: string | null;
  amount: string;
  currency: string;
  payment_status: string | null;
  payment_type: string | null;
  status: string;
  created_at: string;
};

type Props = {
  companyId: string;
};

function formatMoney(amount: string, currencyCode: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  const code = currencyCode.length === 3 ? currencyCode : "USD";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return amount;
  }
}

export default function CompanyOrdersSection({ companyId }: Props) {
  const { t } = useTranslation();
  const appSettings = useAppSettingsOptional();
  const settings = appSettings?.settings ?? {};
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);

  const [rows, setRows] = React.useState<CompanyOrderRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/orders`, { cache: "no-store" });
      const json = (await res.json()) as { orders?: CompanyOrderRow[]; error?: string };
      if (!res.ok) throw new Error(json.error || t("Failed to load orders."));
      setRows(Array.isArray(json.orders) ? json.orders : []);
    } catch (e: unknown) {
      console.error(e);
      setRows([]);
      setLoadError(e instanceof Error ? e.message : t("Failed to load orders."));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, [companyId]);

  return (
    <div className="rounded-xl border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <div className="font-medium">{t("Orders")}</div>
          <p className="mt-1 text-xs text-muted-foreground">{t("Company orders tab description")}</p>
        </div>
      </div>
      {loadError ? (
        <div className="px-4 py-10 text-center text-sm text-destructive">{loadError}</div>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-3 text-left font-medium">{t("Order")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Plan")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Customer")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("Amount")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Payment")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Status")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Date")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  {t("Loading...")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  {t("No orders yet")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-accent/20">
                  <td className="px-4 py-3 font-mono text-xs">{r.order_id ?? `#${r.id}`}</td>
                  <td className="max-w-[160px] px-4 py-3 text-muted-foreground">
                    <span className="line-clamp-2" title={r.plan_name ?? undefined}>
                      {r.plan_name ?? "—"}
                    </span>
                  </td>
                  <td className="max-w-[180px] px-4 py-3">
                    <div className="font-medium line-clamp-1">{r.customer_name ?? "—"}</div>
                    {r.customer_email ? (
                      <div className="truncate text-xs text-muted-foreground">{r.customer_email}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(r.amount, r.currency)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.payment_status ?? "—"}
                    {r.payment_type ? ` · ${r.payment_type}` : ""}
                  </td>
                  <td className="px-4 py-3 capitalize">{r.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <TableActionButton
                      label={t("View")}
                      primaryHref={`/orders/${r.id}`}
                      items={[
                        {
                          label: t("View"),
                          href: `/orders/${r.id}`,
                          icon: <Eye className="h-4 w-4" />,
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        {t("Orders link hint")}{" "}
        <Link href="/orders" className="text-primary hover:underline">
          {t("Manage Orders")}
        </Link>
      </div>
    </div>
  );
}
