"use client";

import * as React from "react";
import Link from "next/link";

import { useAppSettings } from "@/contexts/app-settings-context";
import { useTranslation } from "@/contexts/translation-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { CompanySectionError } from "@/components/companies/company-section-error";

export type CompanyPaymentRow = {
  id: string;
  kind: "customer" | "vendor";
  reference_number: string;
  payment_date: string;
  amount: string;
  status: string;
  payment_method: string | null;
  party_name: string | null;
};

type Props = {
  companyId: string;
  defaultCurrency?: string;
};

function formatAmountCell(raw: string | null | undefined, currencyCode: string): string {
  if (raw == null || raw === "") return "-";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "-";
  const code = currencyCode.length === 3 ? currencyCode : "USD";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return String(raw);
  }
}

export default function CompanyPaymentsSection({
  companyId,
  defaultCurrency = "USD",
}: Props) {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const currencyCode = (defaultCurrency ?? "USD").trim() || "USD";

  const [rows, setRows] = React.useState<CompanyPaymentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/payments`, { cache: "no-store" });
      const json = (await res.json()) as { payments?: CompanyPaymentRow[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to load payments");
      setRows(Array.isArray(json.payments) ? json.payments : []);
    } catch (e: unknown) {
      console.error(e);
      setRows([]);
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
          <div className="font-medium">{t("Payments")}</div>
          <p className="mt-1 text-xs text-muted-foreground">{t("Company payments tab description")}</p>
        </div>
      </div>
      <CompanySectionError message={loadError} />
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">{t("Type")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Reference")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Date")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Party")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Amount")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Status")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Payment method")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  {t("Loading...")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  {t("No payment records yet")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-accent/20">
                  <td className="px-4 py-3 text-foreground">
                    {r.kind === "customer" ? t("Customer payment") : t("Vendor payment")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{r.reference_number}</td>
                  <td className="px-4 py-3 text-foreground">{fmtDate(r.payment_date)}</td>
                  <td className="px-4 py-3 text-foreground">{r.party_name ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums text-foreground">{formatAmountCell(r.amount, currencyCode)}</td>
                  <td className="px-4 py-3 capitalize text-foreground">{r.status ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.payment_method?.trim() || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        <span>{t("Payments link hint")} </span>
        <Link href="/account/customer-payments" className="text-primary hover:underline">
          {t("Customer Payments")}
        </Link>
        <span> · </span>
        <Link href="/account/vendor-payments" className="text-primary hover:underline">
          {t("Vendor Payments")}
        </Link>
      </div>
    </div>
  );
}
