"use client";

import * as React from "react";
import Link from "next/link";

import { useAppSettings } from "@/contexts/app-settings-context";
import { useTranslation } from "@/contexts/translation-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { CompanySectionError } from "@/components/companies/company-section-error";

export type CompanyCreditNoteRow = {
  id: string;
  reference_number: string;
  date: string;
  amount: string;
  status: string;
  reason: string | null;
  notes: string | null;
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

export default function CompanyCreditNotesSection({
  companyId,
  defaultCurrency = "USD",
}: Props) {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const currencyCode = (defaultCurrency ?? "USD").trim() || "USD";

  const [rows, setRows] = React.useState<CompanyCreditNoteRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/credit-notes`, { cache: "no-store" });
      const json = (await res.json()) as { credit_notes?: CompanyCreditNoteRow[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to load credit notes");
      setRows(Array.isArray(json.credit_notes) ? json.credit_notes : []);
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
          <div className="font-medium">{t("Credit Note")}</div>
          <p className="mt-1 text-xs text-muted-foreground">{t("Company credit notes tab description")}</p>
        </div>
      </div>
      <CompanySectionError message={loadError} />
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-3 text-left font-medium">{t("Reference")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Date")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Customer")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Amount")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Status")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Reason")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  {t("Loading...")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  {t("No credit note records yet")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-accent/20">
                  <td className="px-4 py-3 font-mono text-xs">{r.reference_number}</td>
                  <td className="px-4 py-3">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3">{r.customer_name ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{formatAmountCell(r.amount, currencyCode)}</td>
                  <td className="px-4 py-3 capitalize">{r.status ?? "—"}</td>
                  <td className="max-w-[220px] px-4 py-3 text-muted-foreground">
                    <span className="line-clamp-2" title={r.reason ?? undefined}>
                      {r.reason?.trim() ? r.reason : "—"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        {t("Credit notes link hint")}{" "}
        <Link href="/account/credit-notes" className="text-primary hover:underline">
          {t("Credit Notes")}
        </Link>
      </div>
    </div>
  );
}
