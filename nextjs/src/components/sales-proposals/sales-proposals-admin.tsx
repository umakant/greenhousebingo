"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FileDown,
  HelpCircle,
  Info,
  LayoutTemplate,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { SalesProposalRowActions } from "@/components/sales-proposals/sales-proposal-row-actions";
import { SalesProposalCreateForm } from "@/components/sales-proposals/sales-proposal-create-form";
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

type ProposalRow = {
  id: string;
  proposal_number: string;
  proposal_date: string | null;
  due_date: string | null;
  contact_name: string;
  deal: { id: string; name: string } | null;
  total_amount: number;
  display_status: string;
  lead?: { company?: string; email?: string } | null;
  customer?: { email?: string } | null;
};

type LeadOption = { id: string; name: string };

function clientInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function StatusDot({ status }: { status: string }) {
  const paidLike = status === "accepted";
  const sentLike = status === "sent";
  return (
    <span className="inline-flex items-center gap-1.5 capitalize">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          paidLike ? "bg-emerald-500" : sentLike ? "bg-blue-500" : status === "rejected" ? "bg-red-500" : "bg-amber-500",
        )}
      />
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function SalesProposalsAdmin({ permissions }: { permissions: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canCreate =
    permissions.includes("*") ||
    permissions.includes("create-sales-proposals") ||
    permissions.includes("manage-sales-proposals");
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
  const [items, setItems] = React.useState<ProposalRow[]>([]);
  const [leads, setLeads] = React.useState<LeadOption[]>([]);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [filterLead, setFilterLead] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createFormKey, setCreateFormKey] = React.useState(0);
  const [createTemplateId, setCreateTemplateId] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (searchParams?.get("create") === "1") {
      setCreateTemplateId(searchParams.get("template") ?? undefined);
      setCreateOpen(true);
      setCreateFormKey((k) => k + 1);
      router.replace("/sales-proposals", { scroll: false });
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
        if (filterLead) params.set("lead_id", filterLead);
        if (filterStatus) params.set("status", filterStatus);
        const res = await fetch(`/api/sales-proposals?${params.toString()}`, { credentials: "include", cache: "no-store" });
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          proposals?: {
            data: ProposalRow[];
            meta: { total: number; per_page: number; current_page: number; last_page: number };
          };
          message?: string;
        };
        if (!res.ok || !json?.ok) throw new Error(json?.message ?? t("Failed to load proposals."));
        setItems(Array.isArray(json.proposals?.data) ? json.proposals.data : []);
        setPage(json.proposals?.meta?.current_page ?? p);
        setPerPage(json.proposals?.meta?.per_page ?? pp);
        setTotal(json.proposals?.meta?.total ?? 0);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : t("Something went wrong."));
      } finally {
        setLoading(false);
      }
    },
    [page, perPage, search, dateFrom, dateTo, filterLead, filterStatus],
  );

  React.useEffect(() => {
    void load({ nextPage: 1 });
    void fetch("/api/sales-proposals/form-options", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((json: { ok?: boolean; leads?: Array<{ id: string; name: string }> }) => {
        const rows = json?.ok && Array.isArray(json.leads) ? json.leads : [];
        setLeads(rows.map((l) => ({ id: l.id, name: l.name || t("Lead") })));
      })
      .catch(() => setLeads([]));
  }, []);

  const applyFilters = () => {
    setPage(1);
    void load({ nextPage: 1 });
  };

  const exportCsv = () => {
    if (items.length === 0) {
      toast.message(t("No proposals to export."));
      return;
    }
    const header = ["Proposal", "Deal", "Contact", "Total", "Date", "Valid Till", "Status"];
    const lines = items.map((row) =>
      [row.proposal_number, row.deal?.name ?? "", row.contact_name, row.total_amount, row.proposal_date ?? "", row.due_date ?? "", row.display_status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "proposals.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
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
              <Label className="text-xs text-muted-foreground">{t("Lead")}</Label>
              <Select value={filterLead || "all"} onValueChange={(v) => setFilterLead(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("All")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All")}</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
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
                  <SheetDescription>{t("Refine the proposals list.")}</SheetDescription>
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
                        <SelectItem value="draft">{t("Draft")}</SelectItem>
                        <SelectItem value="sent">{t("Sent")}</SelectItem>
                        <SelectItem value="accepted">{t("Accepted")}</SelectItem>
                        <SelectItem value="rejected">{t("Rejected")}</SelectItem>
                        <SelectItem value="expired">{t("Expired")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <SheetFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => { setFilterStatus(""); setFilterLead(""); setDateFrom(""); setDateTo(""); setSearch(""); setPage(1); void load({ nextPage: 1 }); }}>
                    {t("Clear")}
                  </Button>
                  <Button type="button" onClick={() => { setFiltersOpen(false); applyFilters(); }}>
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

        <CardContent className="border-b bg-sky-50 px-4 py-3 md:px-5">
          <div className="flex items-start gap-2 text-sm text-sky-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {t("Proposals are for Leads. If you want to create for existing clients, then create")}{" "}
              <Link href="/account/revenues" className="font-medium underline">
                {t("Estimate")}
              </Link>
              .
            </p>
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
              {t("Create Proposal")}
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/sales-proposal-templates">
              <LayoutTemplate className="mr-1 h-4 w-4" />
              {t("Proposal Template")}
            </Link>
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
            <div className="p-10 text-center text-muted-foreground">{t("No data available in table")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">{t("Proposal")}</th>
                    <th className="px-4 py-3">{t("Deals")}</th>
                    <th className="px-4 py-3">{t("Contact Name")}</th>
                    <th className="px-4 py-3">{t("Total")}</th>
                    <th className="px-4 py-3">{t("Date")}</th>
                    <th className="px-4 py-3">{t("Valid Till")}</th>
                    <th className="px-4 py-3">{t("Status")}</th>
                    <th className="px-4 py-3 text-right">{t("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <Link href={`/sales-proposals/${row.id}`} className="font-medium text-primary hover:underline">
                          {row.proposal_number}
                        </Link>
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-muted-foreground">{row.deal?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {clientInitials(row.contact_name)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-medium">{row.contact_name}</div>
                            {row.lead?.company ? (
                              <div className="truncate text-xs text-muted-foreground">{row.lead.company}</div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums">{formatCurrency(row.total_amount)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatDate(row.proposal_date)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatDate(row.due_date)}</td>
                      <td className="px-4 py-3">
                        <StatusDot status={row.display_status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <SalesProposalRowActions row={row} onRefresh={() => void load()} />
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
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); void load({ nextPage: p }); }}>
              <ChevronLeft className="h-4 w-4" />
              {t("Previous")}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); void load({ nextPage: p }); }}>
              {t("Next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent
          side="right"
          className="flex h-full w-[min(96vw,1280px)] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
        >
          <SheetHeader className="shrink-0 space-y-0 border-b px-6 py-4 pr-14">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <SheetTitle>{t("Create Proposal")}</SheetTitle>
                <SheetDescription className="mt-1">
                  {t("Fill in the proposal details below to create a professional proposal.")}
                </SheetDescription>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="submit"
                  form="sales-proposal-create-form"
                  variant="outline"
                  value="draft"
                  className="border-primary/30 text-primary hover:bg-primary/5"
                >
                  {t("Save Draft")}
                </Button>
                <Button
                  type="submit"
                  form="sales-proposal-create-form"
                  value="create"
                >
                  {t("Create Proposal")}
                </Button>
              </div>
            </div>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SalesProposalCreateForm
              key={`${createFormKey}-${createTemplateId ?? ""}`}
              templateId={createTemplateId}
              embedded
              redirectOnSuccess={false}
              onSuccess={(id) => {
                setCreateOpen(false);
                if (id) router.push(`/sales-proposals/${id}`);
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
