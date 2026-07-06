"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FileDown,
  HelpCircle,
  Plus,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { SalesInvoiceRowActions } from "@/components/sales-invoices/sales-invoice-row-actions";
import { SalesInvoiceCreateForm } from "@/components/sales-invoices/sales-invoice-create-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency as fmtCurrencyLib } from "@/lib/format-currency";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  short_code: string;
  project_name: string | null;
  invoice_date: string | null;
  customer: {
    company_name: string;
    contact_person_name: string;
    contact_person_email: string;
  } | null;
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  display_status: "paid" | "unpaid" | "partially_paid";
};

type CustomerOption = { id: string; name: string; company_name: string };

function clientInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function StatusDot({ status }: { status: InvoiceRow["display_status"] }) {
  const paid = status === "paid";
  return (
    <span className="inline-flex items-center gap-1.5 capitalize">
      <span className={cn("h-2 w-2 rounded-full", paid ? "bg-emerald-500" : "bg-red-500")} />
      {paid ? t("Paid") : status === "partially_paid" ? t("Partially Paid") : t("Unpaid")}
    </span>
  );
}

export function SalesInvoicesAdmin({ permissions }: { permissions: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canCreate =
    permissions.includes("*") ||
    permissions.includes("create-sales-invoices") ||
    permissions.includes("manage-sales-invoices");
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

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<InvoiceRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerOption[]>([]);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [filterCustomer, setFilterCustomer] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createFormKey, setCreateFormKey] = React.useState(0);

  React.useEffect(() => {
    if (searchParams?.get("create") === "1") {
      setCreateOpen(true);
      setCreateFormKey((k) => k + 1);
      router.replace("/sales-invoices", { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateDrawer = () => {
    setCreateFormKey((k) => k + 1);
    setCreateOpen(true);
  };

  const load = React.useCallback(
    async (opts?: { nextPage?: number; nextPerPage?: number }) => {
      const p = opts?.nextPage ?? page;
      const pp = opts?.nextPerPage ?? perPage;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(p));
        params.set("per_page", String(pp));
        if (search.trim()) params.set("search", search.trim());
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);
        if (filterCustomer) params.set("customer_id", filterCustomer);
        if (filterStatus) params.set("status", filterStatus);
        const res = await fetch(`/api/sales-invoices?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          invoices?: {
            data: InvoiceRow[];
            meta: { total: number; per_page: number; current_page: number; last_page: number };
          };
          customers?: CustomerOption[];
          message?: string;
        };
        if (!res.ok || !json?.ok) {
          const apiError =
            (json as { error?: string; message?: string } | null)?.error ??
            (json as { error?: string; message?: string } | null)?.message;
          throw new Error(apiError ?? t("Failed to load invoices."));
        }
        setItems(Array.isArray(json.invoices?.data) ? json.invoices.data : []);
        setPage(json.invoices?.meta?.current_page ?? p);
        setPerPage(json.invoices?.meta?.per_page ?? pp);
        setTotal(json.invoices?.meta?.total ?? 0);
        setCustomers(Array.isArray(json.customers) ? json.customers : []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : t("Something went wrong."));
      } finally {
        setLoading(false);
      }
    },
    [page, perPage, search, dateFrom, dateTo, filterCustomer, filterStatus],
  );

  React.useEffect(() => {
    void load({ nextPage: 1 });
  }, []);

  const applyFilters = () => {
    setPage(1);
    void load({ nextPage: 1 });
  };

  const exportCsv = () => {
    if (items.length === 0) {
      toast.message(t("No invoices to export."));
      return;
    }
    const header = ["Code", "Invoice", "Project", "Client", "Total", "Paid", "Unpaid", "Date", "Status"];
    const lines = items.map((row) =>
      [
        row.short_code,
        row.invoice_number,
        row.project_name ?? "",
        row.customer?.contact_person_name ?? "",
        row.total_amount,
        row.paid_amount,
        row.unpaid_amount,
        row.invoice_date ?? "",
        row.display_status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card className="shadow-sm">
        <CardContent className="border-b bg-muted/20 p-4 md:p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px] flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">{t("Duration")}</Label>
              <div className="flex items-center gap-2">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
                <span className="text-xs text-muted-foreground">{t("To")}</span>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
              </div>
            </div>
            <div className="min-w-[140px] space-y-1">
              <Label className="text-xs text-muted-foreground">{t("Client")}</Label>
              <Select value={filterCustomer || "all"} onValueChange={(v) => setFilterCustomer(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("All")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All")}</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[200px] flex-[2] space-y-1">
              <Label className="text-xs text-muted-foreground">{t("Start typing to search")}</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Start typing to search")}
                className="h-9"
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              />
            </div>
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-9">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  {t("Filters")}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[360px]">
                <SheetHeader>
                  <SheetTitle>{t("Filters")}</SheetTitle>
                  <SheetDescription>{t("Refine the invoices list.")}</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>{t("Status")}</Label>
                    <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("All")}</SelectItem>
                        <SelectItem value="paid">{t("Paid")}</SelectItem>
                        <SelectItem value="unpaid">{t("Unpaid")}</SelectItem>
                        <SelectItem value="partially_paid">{t("Partially Paid")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <SheetFooter className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFilterStatus("");
                      setFilterCustomer("");
                      setDateFrom("");
                      setDateTo("");
                      setSearch("");
                      setPage(1);
                      void load({ nextPage: 1 });
                    }}
                  >
                    {t("Clear")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setFiltersOpen(false);
                      applyFilters();
                    }}
                  >
                    {t("Apply")}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
            <Button type="button" size="sm" className="h-9" onClick={applyFilters}>
              {t("Search")}
            </Button>
          </div>
        </CardContent>

        <CardContent className="flex flex-wrap items-center gap-2 border-b px-4 py-3 md:px-5">
          {canCreate ? (
            <Button
              type="button"
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={openCreateDrawer}
            >
              <Plus className="mr-1 h-4 w-4" />
              {t("Create Invoice")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toast.message(t("Recurring invoices will be available soon."))}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            {t("Recurring Invoice")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toast.message(t("Time log invoices will be available soon."))}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("Create TimeLog Invoice")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
            <FileDown className="mr-1 h-4 w-4" />
            {t("Export")}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="ml-auto h-8 w-8" aria-label={t("Help")}>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        </CardContent>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground">{t("Loading...")}</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">{t("No invoices found.")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">{t("Code")}</th>
                    <th className="px-4 py-3">{t("Invoice")}</th>
                    <th className="px-4 py-3">{t("Project")}</th>
                    <th className="px-4 py-3">{t("Client")}</th>
                    <th className="px-4 py-3">{t("Total")}</th>
                    <th className="px-4 py-3">{t("Invoice Date")}</th>
                    <th className="px-4 py-3">{t("Status")}</th>
                    <th className="px-4 py-3 text-right">{t("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{row.short_code || "—"}</td>
                      <td className="px-4 py-3">
                        <Link href={`/sales-invoices/${row.id}`} className="font-medium text-primary hover:underline">
                          {row.invoice_number}
                        </Link>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">
                        {row.project_name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {clientInitials(row.customer?.contact_person_name ?? row.customer?.company_name ?? "?")}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-medium">{row.customer?.contact_person_name ?? "—"}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {row.customer?.company_name ?? ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs leading-relaxed">
                        <div>
                          {t("Total")}: {formatCurrency(row.total_amount)}
                        </div>
                        <div className="text-emerald-600">
                          {t("Paid")}: {formatCurrency(row.paid_amount)}
                        </div>
                        <div className="text-red-600">
                          {t("Unpaid")}: {formatCurrency(row.unpaid_amount)}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{formatDate(row.invoice_date)}</td>
                      <td className="px-4 py-3">
                        <StatusDot status={row.display_status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <SalesInvoiceRowActions row={row} onRefresh={() => void load()} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground md:px-5">
          <div className="flex items-center gap-2">
            <span>{t("Show")}</span>
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
                  {n}
                </option>
              ))}
            </select>
            <span>{t("entries")}</span>
          </div>
          <div>
            {t("Showing")} {from} {t("to")} {to} {t("of")} {total} {t("entries")}
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                const p = page - 1;
                setPage(p);
                void load({ nextPage: p });
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              {t("Previous")}
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                type="button"
                variant={p === page ? "default" : "outline"}
                size="sm"
                className="min-w-8"
                onClick={() => {
                  setPage(p);
                  void load({ nextPage: p });
                }}
              >
                {p}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => {
                const p = page + 1;
                setPage(p);
                void load({ nextPage: p });
              }}
            >
              {t("Next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent
          side="right"
          className="flex h-full w-[min(92vw,720px)] max-w-[92vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
        >
          <SheetHeader className="shrink-0 border-b px-6 py-4 pr-14">
            <SheetTitle>{t("Create Invoice")}</SheetTitle>
            <SheetDescription>{t("Fill in the invoice details below.")}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <SalesInvoiceCreateForm
              key={createFormKey}
              embedded
              redirectOnSuccess={false}
              onSuccess={(id) => {
                setCreateOpen(false);
                if (id) router.push(`/sales-invoices/${id}`);
                else void load({ nextPage: 1 });
              }}
              onCancel={() => setCreateOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
