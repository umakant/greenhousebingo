"use client";

import * as React from "react";
import Link from "next/link";

import { TableActionButton } from "@/components/ui/table-action-button";
import { Eye } from "lucide-react";
import { useAppSettings } from "@/contexts/app-settings-context";
import { useTranslation } from "@/contexts/translation-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";

export type CompanyEstimateRow = {
  id: string;
  proposal_number: string;
  proposal_date: string;
  due_date: string;
  total_amount: string;
  status: string;
  converted_to_invoice: boolean;
  customer_name: string | null;
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

export default function CompanyEstimatesSection({
  companyId,
  defaultCurrency = "USD",
}: Props) {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const currencyCode = (defaultCurrency ?? "USD").trim() || "USD";

  const [rows, setRows] = React.useState<CompanyEstimateRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/estimates`, { cache: "no-store" });
      const json = (await res.json()) as { estimates?: CompanyEstimateRow[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to load estimates");
      setRows(Array.isArray(json.estimates) ? json.estimates : []);
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
          <div className="font-medium">{t("Estimates")}</div>
          <p className="mt-1 text-xs text-muted-foreground">{t("Company estimates tab description")}</p>
        </div>
      </div>
      <CompanySectionError message={loadError} />
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-3 text-left font-medium">{t("Proposal #")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Date")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Due")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Customer")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Total")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Status")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Invoiced")}</th>
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
                  {t("No estimate records yet")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-accent/20">
                  <td className="px-4 py-3 font-mono text-xs">{r.proposal_number}</td>
                  <td className="px-4 py-3">{fmtDate(r.proposal_date)}</td>
                  <td className="px-4 py-3">{fmtDate(r.due_date)}</td>
                  <td className="px-4 py-3">{r.customer_name ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{formatAmountCell(r.total_amount, currencyCode)}</td>
                  <td className="px-4 py-3 capitalize">{r.status ?? "—"}</td>
                  <td className="px-4 py-3">{r.converted_to_invoice ? t("Yes") : t("No")}</td>
                  <td className="px-4 py-3 text-right">
                    <TableActionButton
                      label={t("View")}
                      primaryHref={`/sales-proposals/${r.id}`}
                      items={[
                        {
                          label: t("View"),
                          href: `/sales-proposals/${r.id}`,
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
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        {t("Estimates link hint")}{" "}
        <Link href="/sales-proposals" className="text-primary hover:underline">
          {t("Sales Proposals")}
        </Link>
      </div>
    </div>
  );
}
