"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { CompanyInvoiceRowActions } from "@/components/companies/company-invoice-row-actions";
import InvoicePreviewClient from "@/components/companies/invoice-preview-client";
import { useAppSettings } from "@/contexts/app-settings-context";
import { useTranslation } from "@/contexts/translation-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
export type CompanyInvoiceRow = {
  id: string;
  reference_number: string;
  date: string;
  amount: string;
  status: string;
  category: string | null;
  description: string | null;
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

function CompanyInvoicesSectionInner({ companyId, defaultCurrency = "USD" }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const currencyCode = (defaultCurrency ?? "USD").trim() || "USD";

  const [rows, setRows] = React.useState<CompanyInvoiceRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const inv = searchParams?.get("invoice");
    setSelectedInvoiceId(inv && inv.trim() ? inv.trim() : null);
  }, [searchParams]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/invoices`, { cache: "no-store" });
      const json = (await res.json()) as { invoices?: CompanyInvoiceRow[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to load invoices");
      setRows(Array.isArray(json.invoices) ? json.invoices : []);
    } catch (e: unknown) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openInvoice = React.useCallback(
    (id: string) => {
      setSelectedInvoiceId(id);
      router.replace(`/companies/${companyId}?section=invoices&invoice=${encodeURIComponent(id)}`, {
        scroll: false,
      });
    },
    [companyId, router],
  );

  const closeInvoice = React.useCallback(() => {
    setSelectedInvoiceId(null);
    router.replace(`/companies/${companyId}?section=invoices`, { scroll: false });
  }, [companyId, router]);

  if (selectedInvoiceId) {
    return (
      <div className="rounded-xl border border-border/80 bg-background p-4 sm:p-6 md:p-8">
        <InvoicePreviewClient
          companyId={companyId}
          invoiceId={selectedInvoiceId}
          defaultCurrency={currencyCode}
          embedded
          onBack={closeInvoice}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <div className="font-medium">{t("Invoices")}</div>
          <p className="mt-1 text-xs text-muted-foreground">{t("Company invoices tab description")}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-3 text-left font-medium">{t("Invoice #")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Date")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Customer")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Amount")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Status")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Category")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("Actions")}</th>
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
                  {t("No invoice records yet")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-accent/20">
                  <td className="px-4 py-3 font-mono text-xs">
                    <button
                      type="button"
                      className="text-left font-mono text-xs text-primary underline-offset-4 hover:underline"
                      onClick={() => openInvoice(r.id)}
                    >
                      {r.reference_number}
                    </button>
                  </td>
                  <td className="px-4 py-3">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3">{r.customer_name ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{formatAmountCell(r.amount, currencyCode)}</td>
                  <td className="px-4 py-3 capitalize">{r.status ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.category ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <CompanyInvoiceRowActions
                      companyId={companyId}
                      row={{ id: r.id, reference_number: r.reference_number }}
                      onDeleted={load}
                      onViewInline={openInvoice}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CompanyInvoicesSection(props: Props) {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border bg-background p-10 text-center text-sm text-muted-foreground">
          {t("Loading...")}
        </div>
      }
    >
      <CompanyInvoicesSectionInner {...props} />
    </Suspense>
  );
}
