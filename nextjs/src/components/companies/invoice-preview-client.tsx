"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Banknote, Download, Loader2, Pencil, Printer, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/contexts/translation-context";
import { cn } from "@/lib/utils";

type InvoicePayload = {
  ok: boolean;
  company?: { id: string; name: string | null; email: string | null; slug: string | null };
  invoice?: {
    id: string;
    reference_number: string;
    date: string;
    amount: string;
    status: string;
    category: string | null;
    description: string | null;
    payment_method: string | null;
    notes: string | null;
    customer: {
      companyName: string;
      contactPersonName: string;
      contactPersonEmail: string;
      contactPersonMobile: string | null;
      billingAddress: unknown;
    } | null;
    bank: {
      bank_name: string;
      account_number: string;
      branch: string | null;
      iban: string | null;
      swift: string | null;
    } | null;
  };
  error?: string;
};

function formatMoney(amount: string, currency: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  const code = currency.length === 3 ? currency : "USD";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(n);
  } catch {
    return amount;
  }
}

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

type Props = {
  companyId: string;
  invoiceId: string;
  defaultCurrency?: string;
  /** When true, Back integrates with parent tab instead of full-page navigation. */
  embedded?: boolean;
  onBack?: () => void;
};

export default function InvoicePreviewClient({
  companyId,
  invoiceId,
  defaultCurrency = "USD",
  embedded = false,
  onBack,
}: Props) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [data, setData] = React.useState<InvoicePayload | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const print =
      searchParams?.get("print") === "1" || searchParams?.get("download") === "1";
    if (!print) return;
    const tid = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(tid);
  }, [searchParams]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/invoices/${invoiceId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as InvoicePayload;
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
      setData({ ok: false });
    } finally {
      setLoading(false);
    }
  }, [companyId, invoiceId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  /** Enables globals.css print rules so only #invoice-print-root is printed (not sidebar/layout). */
  React.useEffect(() => {
    if (!data?.ok || !data.invoice) return;
    const root = document.documentElement;
    root.classList.add("invoice-print-scope");
    return () => root.classList.remove("invoice-print-scope");
  }, [data?.ok, data?.invoice]);

  const currency = (defaultCurrency ?? "USD").trim() || "USD";

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex min-h-[32vh] items-center justify-center gap-2 px-2 py-8 text-muted-foreground sm:px-4">
        <Loader2 className="h-6 w-6 animate-spin" />
        {t("Loading...")}
      </div>
    );
  }

  if (!data?.ok || !data.invoice || !data.company) {
    return (
      <p className="px-2 py-8 text-center text-muted-foreground sm:px-4">
        {t("Invoice not found.")}{" "}
        {embedded && onBack ? (
          <button type="button" className="text-primary underline" onClick={onBack}>
            {t("Back")}
          </button>
        ) : (
          <Link href={`/companies/${companyId}`} className="text-primary underline">
            {t("Back to company")}
          </Link>
        )}
      </p>
    );
  }

  const inv = data.invoice;
  const co = data.company;
  const issueDate = inv.date;
  const dueDate = inv.date;
  const subtotal = inv.amount;
  const total = inv.amount;
  const itemTitle = inv.category?.trim() || t("Service");
  const itemDesc = inv.description?.trim() || "—";
  const statusLower = (inv.status ?? "").toLowerCase();

  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-6xl",
        embedded ? "pb-1 pt-0" : "px-2 py-4 sm:px-4 sm:py-6 lg:px-6",
      )}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden md:mb-8">
        {embedded && onBack ? (
          <Button variant="ghost" size="sm" type="button" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("Back")}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/companies/${companyId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("Back")}
            </Link>
          </Button>
        )}
      </div>

      <div
        className={cn(
          "grid gap-6 sm:gap-8 lg:grid-cols-[1fr_min(100%,280px)] lg:items-start",
          embedded && "lg:gap-10",
        )}
      >
        <article
          id="invoice-print-root"
          className="rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm print:border-0 print:shadow-none"
        >
          <div className="border-b border-border/60 p-8 pb-6">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
              <div>
                <div className="text-xl font-bold tracking-tight text-primary">{co.name || t("Company")}</div>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">{co.email || "—"}</p>
              </div>
              <div className="text-right text-sm">
                <div className="text-lg font-semibold tabular-nums">
                  {t("Invoice")} #{inv.reference_number}
                </div>
                <p className="mt-1 text-muted-foreground">
                  <span className="font-medium text-foreground">{t("Date issued")}:</span> {issueDate}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">{t("Date due")}:</span> {dueDate}
                </p>
                <Badge
                  className={cn(
                    "mt-2",
                    statusLower === "paid" || statusLower === "completed"
                      ? "border-emerald-600/30 bg-emerald-600 text-white hover:bg-emerald-600"
                      : statusLower === "pending"
                        ? "border-amber-500/30 bg-amber-500 text-white hover:bg-amber-500"
                        : "",
                  )}
                >
                  {inv.status || t("—")}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-8 p-8 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Invoice to")}</h3>
              {inv.customer ? (
                <div className="mt-3 space-y-1 text-sm">
                  <p className="font-semibold">{inv.customer.companyName}</p>
                  <p>{inv.customer.contactPersonName}</p>
                  <p className="text-muted-foreground">{inv.customer.contactPersonEmail}</p>
                  {inv.customer.contactPersonMobile ? <p>{inv.customer.contactPersonMobile}</p> : null}
                  {formatBillingLines(inv.customer.billingAddress).map((line, i) => (
                    <p key={i} className="text-muted-foreground">
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{t("No customer linked.")}</p>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Bill to / Bank")}</h3>
              {inv.bank ? (
                <div className="mt-3 space-y-1 text-sm">
                  <p>
                    <span className="font-medium">{t("Total due")}:</span> {formatMoney(total, currency)}
                  </p>
                  <p>{inv.bank.bank_name}</p>
                  <p className="text-muted-foreground tabular-nums">{inv.bank.account_number}</p>
                  {inv.bank.iban ? (
                    <p className="text-muted-foreground">
                      {t("IBAN")}: {inv.bank.iban}
                    </p>
                  ) : null}
                  {inv.bank.swift ? (
                    <p className="text-muted-foreground">
                      {t("SWIFT")}: {inv.bank.swift}
                    </p>
                  ) : null}
                  {inv.bank.branch ? <p className="text-muted-foreground">{inv.bank.branch}</p> : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{t("No bank account on file for this record.")}</p>
              )}
            </div>
          </div>

          <div className="px-8">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-3 text-left font-semibold">{t("Item")}</th>
                  <th className="px-3 py-3 text-left font-semibold">{t("Description")}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t("Cost")}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t("Qty")}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t("Price")}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/80">
                  <td className="px-3 py-4 align-top font-medium">{itemTitle}</td>
                  <td className="px-3 py-4 align-top text-muted-foreground">{itemDesc}</td>
                  <td className="px-3 py-4 align-top text-right tabular-nums">{formatMoney(subtotal, currency)}</td>
                  <td className="px-3 py-4 align-top text-right tabular-nums">1</td>
                  <td className="px-3 py-4 align-top text-right font-medium tabular-nums">
                    {formatMoney(subtotal, currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-6 p-8 pt-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {inv.notes ? (
                <>
                  <span className="font-medium text-foreground">{t("Notes")}:</span> {inv.notes}
                </>
              ) : (
                <span className="text-muted-foreground/70">{t("Salesperson")}: —</span>
              )}
            </div>
            <div className="w-full max-w-xs space-y-2 text-sm sm:text-right">
              <div className="flex justify-between gap-8 border-b border-border/60 py-1">
                <span className="text-muted-foreground">{t("Subtotal")}</span>
                <span className="tabular-nums">{formatMoney(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between gap-8 border-b border-border/60 py-1">
                <span className="text-muted-foreground">{t("Discount")}</span>
                <span className="tabular-nums">{formatMoney("0", currency)}</span>
              </div>
              <div className="flex justify-between gap-8 border-b border-border/60 py-1">
                <span className="text-muted-foreground">{t("Tax")}</span>
                <span className="tabular-nums">{formatMoney("0", currency)}</span>
              </div>
              <div className="flex justify-between gap-8 pt-1 text-base font-bold">
                <span>{t("Total")}</span>
                <span className="tabular-nums">{formatMoney(total, currency)}</span>
              </div>
            </div>
          </div>
        </article>

        <aside className="flex flex-col gap-3 print:hidden">
          <Button className="w-full justify-center gap-2 bg-primary" type="button" onClick={() => toast.message(t("Send invoice (coming soon)"))}>
            <Send className="h-4 w-4" />
            {t("Send invoice")}
          </Button>
          <Button variant="secondary" className="w-full" type="button" onClick={handlePrint}>
            <Download className="h-4 w-4" />
            {t("Download / Print")}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" type="button" onClick={handlePrint}>
              <Printer className="mr-1 h-4 w-4" />
              {t("Print")}
            </Button>
            {embedded && onBack ? (
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  toast.message(t("Use Edit in the invoice row menu on the list to change this record."));
                  onBack();
                }}
              >
                <Pencil className="mr-1 h-4 w-4" />
                {t("Edit")}
              </Button>
            ) : (
              <Button variant="outline" type="button" asChild>
                <Link href={`/companies/${companyId}?section=invoices`}>
                  <Pencil className="mr-1 h-4 w-4" />
                  {t("Edit")}
                </Link>
              </Button>
            )}
          </div>
          <Button
            className="w-full justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-600/90"
            type="button"
            onClick={() => toast.message(t("Add payment (coming soon)"))}
          >
            <Banknote className="h-4 w-4" />
            {t("Add payment")}
          </Button>
        </aside>
      </div>
    </div>
  );
}
