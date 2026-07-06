"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Download,
  Loader2,
  Pencil,
  Printer,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency as fmtCurrencyLib } from "@/lib/format-currency";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";

type InvoicePayload = {
  ok: boolean;
  company?: { name: string; email: string };
  invoice?: {
    id: string;
    invoice_number: string;
    invoice_date: string | null;
    due_date: string | null;
    project_name: string | null;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    paid_amount: number;
    unpaid_amount: number;
    display_status: string;
    notes: string | null;
    terms: string | null;
    items: Array<{
      id: string;
      description: string;
      quantity: number;
      unit_price: number;
      tax_percentage: number;
      tax_amount: number;
      total_amount: number;
    }>;
    customer: {
      company_name: string;
      contact_person_name: string;
      contact_person_email: string;
      contact_person_mobile: string | null;
      billing_address: unknown;
    } | null;
  };
  error?: string;
};

function formatBillingLines(addr: unknown): string[] {
  if (addr == null) return [];
  if (typeof addr === "string") return addr.trim() ? [addr] : [];
  if (typeof addr === "object" && !Array.isArray(addr)) {
    const o = addr as Record<string, unknown>;
    const line1 = [o.line1, o.street, o.address].find((x) => typeof x === "string" && x.trim()) as string | undefined;
    const city = typeof o.city === "string" ? o.city : "";
    const state = typeof o.state === "string" ? o.state : "";
    const zip = typeof o.zip === "string" ? o.zip : typeof o.postalCode === "string" ? o.postalCode : "";
    const country = typeof o.country === "string" ? o.country : "";
    const lines: string[] = [];
    if (line1) lines.push(line1);
    const cityLine = [city, state, zip].filter(Boolean).join(", ");
    if (cityLine) lines.push(cityLine);
    if (country) lines.push(country);
    return lines;
  }
  return [];
}

function invoiceStatusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "paid") return "border-emerald-600/30 bg-emerald-600 text-white hover:bg-emerald-600";
  if (s === "partially_paid") return "border-amber-500/30 bg-amber-500 text-white hover:bg-amber-500";
  return "border-red-500/30 bg-red-500 text-white hover:bg-red-500";
}

function invoiceStatusLabel(status: string) {
  const s = status.toLowerCase();
  if (s === "paid") return t("Paid");
  if (s === "partially_paid") return t("Partially Paid");
  return t("Unpaid");
}

export function SalesInvoiceViewClient({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useAppSettings();
  const formatCurrency = (n: number) => fmtCurrencyLib(n, settings);
  const formatDate = (s: string | null) => {
    if (!s) return "—";
    try {
      return fmtDateLib(s, settings);
    } catch {
      return s;
    }
  };

  const [data, setData] = React.useState<InvoicePayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);

  const viewHref = `/sales-invoices/${invoiceId}`;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales-invoices/${invoiceId}`, { credentials: "include", cache: "no-store" });
      const json = (await res.json()) as InvoicePayload;
      if (!res.ok || !json.ok) throw new Error(json.error ?? t("Failed to load invoice"));
      setData(json);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("Error"));
      setData({ ok: false });
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const print = searchParams?.get("print") === "1" || searchParams?.get("download") === "1";
    if (!print || !data?.invoice) return;
    const tid = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(tid);
  }, [searchParams, data?.invoice]);

  React.useEffect(() => {
    if (!data?.ok || !data.invoice) return;
    document.documentElement.classList.add("invoice-print-scope");
    return () => document.documentElement.classList.remove("invoice-print-scope");
  }, [data?.ok, data?.invoice]);

  const openDownload = () => {
    window.open(`${viewHref}?download=1`, "_blank", "noopener,noreferrer");
  };

  const handlePrint = () => window.print();

  const sendInvoice = () => {
    const email = data?.invoice?.customer?.contact_person_email?.trim();
    if (!email) {
      toast.error(t("No customer email on this invoice."));
      return;
    }
    setSending(true);
    try {
      const link = `${window.location.origin}${viewHref}`;
      const subject = `${t("Invoice")}: ${data?.invoice?.invoice_number ?? ""}`;
      const body = `${t("Please find your invoice at the link below.")}\n\n${link}`;
      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } finally {
      setSending(false);
    }
  };

  const addPayment = () => {
    if (data?.invoice?.display_status === "paid") {
      toast.message(t("This invoice is already paid."));
      return;
    }
    window.open(`${viewHref}?payment=1`, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        {t("Loading...")}
      </div>
    );
  }

  if (!data?.ok || !data.invoice || !data.company) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        {t("Invoice not found.")}{" "}
        <Link href="/sales-invoices" className="text-primary underline">
          {t("Back to invoices")}
        </Link>
      </p>
    );
  }

  const inv = data.invoice;
  const co = data.company;
  const isPaid = inv.display_status === "paid";

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-2 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden md:mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sales-invoices">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("Back")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_min(100%,280px)] lg:items-start">
        <article
          id="invoice-print-root"
          className="overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm print:border-0 print:shadow-none"
        >
          <div className="border-b border-border/60 p-8 pb-6">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
              <div>
                <div className="text-xl font-bold tracking-tight text-primary">{co.name}</div>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">{co.email || "—"}</p>
              </div>
              <div className="text-right text-sm">
                <div className="text-lg font-semibold uppercase tracking-wide">{t("Invoice")}</div>
                <p className="mt-1 tabular-nums">
                  <span className="font-medium text-foreground">#</span>
                  {inv.invoice_number}
                </p>
                <p className="mt-1 text-muted-foreground">
                  <span className="font-medium text-foreground">{t("Date issued")}:</span> {formatDate(inv.invoice_date)}
                </p>
                {inv.due_date ? (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">{t("Date due")}:</span> {formatDate(inv.due_date)}
                  </p>
                ) : null}
                <Badge className={cn("mt-2 uppercase", invoiceStatusBadgeClass(inv.display_status))}>
                  {invoiceStatusLabel(inv.display_status)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-8 border-b border-border/60 p-8 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Billed To")}</h3>
              {inv.customer ? (
                <div className="mt-3 space-y-1 text-sm">
                  <p className="font-semibold">{inv.customer.contact_person_name}</p>
                  <p className="text-muted-foreground">{inv.customer.contact_person_email}</p>
                  {inv.customer.contact_person_mobile ? <p>{inv.customer.contact_person_mobile}</p> : null}
                  {formatBillingLines(inv.customer.billing_address).map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">—</p>
              )}
            </div>
            {inv.project_name ? (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Project")}</h3>
                <p className="mt-3 text-sm font-medium">{inv.project_name}</p>
              </div>
            ) : (
              <div className="hidden md:block" />
            )}
          </div>

          <div className="px-8 pt-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-3 text-left font-semibold">{t("Description")}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t("Qty")}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t("Unit Price")}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t("Tax")}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t("Amount")}</th>
                </tr>
              </thead>
              <tbody>
                {inv.items.map((it) => (
                  <tr key={it.id} className="border-b border-border/80">
                    <td className="px-3 py-4 align-top">{it.description}</td>
                    <td className="px-3 py-4 align-top text-right tabular-nums">
                      {it.quantity} {t("Pcs")}
                    </td>
                    <td className="px-3 py-4 align-top text-right tabular-nums">{formatCurrency(it.unit_price)}</td>
                    <td className="px-3 py-4 align-top text-right tabular-nums">
                      {it.tax_percentage > 0 ? `${it.tax_percentage}%` : "—"}
                    </td>
                    <td className="px-3 py-4 align-top text-right font-medium tabular-nums">
                      {formatCurrency(it.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-6 p-8 pt-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {inv.notes?.trim() ? (
                <>
                  <span className="font-medium text-foreground">{t("Note")}:</span> {inv.notes}
                </>
              ) : (
                <span>{t("Thanks for your business.")}</span>
              )}
              {inv.terms?.trim() ? (
                <p className="mt-2">
                  <span className="font-medium text-foreground">{t("Terms and Conditions")}:</span> {inv.terms}
                </p>
              ) : null}
            </div>
            <div className="w-full max-w-xs space-y-2 text-sm sm:text-right">
              <div className="flex justify-between gap-8 border-b border-border/60 py-1">
                <span className="text-muted-foreground">{t("Sub Total")}</span>
                <span className="tabular-nums">{formatCurrency(inv.subtotal)}</span>
              </div>
              {inv.tax_amount > 0 ? (
                <div className="flex justify-between gap-8 border-b border-border/60 py-1">
                  <span className="text-muted-foreground">{t("Tax")}</span>
                  <span className="tabular-nums">{formatCurrency(inv.tax_amount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between gap-8 border-b border-border/60 py-1">
                <span className="font-semibold">{t("Total")}</span>
                <span className="tabular-nums font-semibold text-primary">{formatCurrency(inv.total_amount)}</span>
              </div>
              <div className="flex justify-between gap-8 border-b border-border/60 py-1">
                <span className="text-muted-foreground">{t("Total Paid")}</span>
                <span className="tabular-nums font-medium text-emerald-600">{formatCurrency(inv.paid_amount)}</span>
              </div>
              <div className="flex justify-between gap-8 pt-1 text-base font-bold">
                <span>{t("Total Due")}</span>
                <span className="tabular-nums">{formatCurrency(inv.unpaid_amount)}</span>
              </div>
            </div>
          </div>
        </article>

        <aside className="flex flex-col gap-3 print:hidden">
          <Button
            className="w-full justify-center gap-2 bg-primary"
            type="button"
            disabled={sending}
            onClick={sendInvoice}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t("Send Invoice")}
          </Button>

          <Button variant="outline" className="w-full justify-center gap-2" type="button" onClick={openDownload}>
            <Download className="h-4 w-4" />
            {t("Download")}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" type="button" onClick={handlePrint}>
              <Printer className="mr-1 h-4 w-4" />
              {t("Print")}
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => toast.message(t("Open the invoice list to edit invoice details."))}
            >
              <Pencil className="mr-1 h-4 w-4" />
              {t("Edit")}
            </Button>
          </div>

          {!isPaid ? (
            <Button
              className="w-full justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-600/90"
              type="button"
              onClick={addPayment}
            >
              <Banknote className="h-4 w-4" />
              {t("Add Payment")}
            </Button>
          ) : null}

          <Button variant="ghost" className="w-full" type="button" onClick={() => router.push("/sales-invoices")}>
            {t("Back to list")}
          </Button>
        </aside>
      </div>
    </div>
  );
}
