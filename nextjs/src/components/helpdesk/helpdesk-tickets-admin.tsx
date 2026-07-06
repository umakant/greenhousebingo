"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, LayoutGrid, List, SlidersHorizontal, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import HelpdeskTicketCreateDialog from "@/components/helpdesk/helpdesk-ticket-create-dialog";
import HelpdeskTicketRowActions from "@/components/helpdesk/helpdesk-ticket-row-actions";
import { TableColumnVisibilityMenu } from "@/components/ui/table-column-visibility-menu";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { useTranslation } from "@/contexts/translation-context";
import { cn } from "@/lib/utils";

type CategoryRow = { id: string; name: string };
type CompanyRow = { id: string; name: string };

type TicketRow = {
  id: string;
  ticket_id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  category_id?: string;
  category?: { id: string; name: string } | null;
  creator?: { id: string; name: string | null } | null;
  created_at?: string | null;
};

type TicketsResponse = {
  ok: boolean;
  tickets: {
    data: TicketRow[];
    meta: { total: number; per_page: number; current_page: number; last_page: number };
  };
  categories: Array<{ id: bigint; name: string }>;
  companies: CompanyRow[];
  message?: string;
};

const HELPDESK_TICKETS_COLUMN_STORAGE_KEY = "pf-helpdesk-tickets-table-columns-v1";

type HelpdeskTicketColumnId =
  | "ticket_id"
  | "title"
  | "category"
  | "status"
  | "priority"
  | "created_by";

const DEFAULT_HELPDESK_TICKET_COLUMNS: Record<HelpdeskTicketColumnId, boolean> = {
  ticket_id: true,
  title: true,
  category: true,
  status: true,
  priority: true,
  created_by: true,
};

function statusPill(status: string) {
  const colors: Record<string, string> = {
    open: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800",
  };
  const cls = colors[status] ?? "bg-gray-100 text-gray-800";
  const label = status.replace(/_/g, " ");
  return <span className={cn("px-2 py-1 rounded-full text-sm capitalize", cls)}>{label}</span>;
}

function priorityPill(priority: string) {
  const colors: Record<string, string> = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };
  const cls = colors[priority] ?? "bg-gray-100 text-gray-800";
  return <span className={cn("px-2 py-1 rounded-full text-sm capitalize", cls)}>{priority}</span>;
}

function sortChevron(active: boolean, dir: "asc" | "desc") {
  return <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform", active && dir === "desc" ? "rotate-180" : "")} />;
}

export default function HelpdeskTicketsAdmin({
  isSuperAdmin,
  permissions,
}: {
  isSuperAdmin: boolean;
  permissions: string[];
}) {
  const canCreate = permissions.includes("*") || permissions.includes("create-helpdesk-tickets");
  const canEdit = permissions.includes("*") || permissions.includes("edit-helpdesk-tickets");
  const canDelete = permissions.includes("*") || permissions.includes("delete-helpdesk-tickets");
  const canView = permissions.includes("*") || permissions.includes("view-helpdesk-tickets");

  const { t } = useTranslation();
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<HelpdeskTicketColumnId>(
    HELPDESK_TICKETS_COLUMN_STORAGE_KEY,
    DEFAULT_HELPDESK_TICKET_COLUMNS,
  );

  const ticketColumnMenuDefs = React.useMemo(
    () => [
      { id: "ticket_id" as const, label: t("Ticket ID") },
      { id: "title" as const, label: t("Title") },
      { id: "category" as const, label: t("Category") },
      { id: "status" as const, label: t("Status") },
      { id: "priority" as const, label: t("Priority") },
      { id: "created_by" as const, label: t("Created By") },
    ],
    [t],
  );

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [items, setItems] = React.useState<TicketRow[]>([]);
  const [categories, setCategories] = React.useState<CategoryRow[]>([]);
  const [companies, setCompanies] = React.useState<CompanyRow[]>([]);

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);

  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [searchTitle, setSearchTitle] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("");
  const [filterPriority, setFilterPriority] = React.useState("");
  const [filterCategory, setFilterCategory] = React.useState("");
  const [filterCompany, setFilterCompany] = React.useState("");

  const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");
  const [sortField, setSortField] = React.useState("");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  async function load(opts?: { nextPage?: number; nextPerPage?: number }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("per_page", String(pp));
      if (searchTitle.trim()) params.set("title", searchTitle.trim());
      if (filterStatus) params.set("status", filterStatus);
      if (filterPriority) params.set("priority", filterPriority);
      if (filterCategory) params.set("category_id", filterCategory);
      if (isSuperAdmin && filterCompany) params.set("company_id", filterCompany);
      if (sortField) {
        params.set("sort", sortField);
        params.set("direction", sortDirection);
      }

      const res = await fetch(`/api/helpdesk-tickets?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as TicketsResponse | null;
      if (!res.ok || !json?.ok) throw new Error((json as any)?.message || "Failed to load tickets.");

      setItems(Array.isArray(json.tickets?.data) ? json.tickets.data : []);
      setPage(json.tickets.meta.current_page);
      setPerPage(json.tickets.meta.per_page);
      setTotal(json.tickets.meta.total);

      setCategories(
        Array.isArray(json.categories)
          ? json.categories.map((c: any) => ({ id: String(c.id), name: String(c.name ?? "") }))
          : []
      );
      setCompanies(Array.isArray(json.companies) ? json.companies : []);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load({ nextPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  function applyFilters() {
    setPage(1);
    void load({ nextPage: 1 });
  }

  function clearFilters() {
    setSearchTitle("");
    setFilterStatus("");
    setFilterPriority("");
    setFilterCategory("");
    setFilterCompany("");
    setSortField("");
    setSortDirection("asc");
    setPage(1);
    void load({ nextPage: 1 });
  }

  function handleSort(field: string) {
    const dir = sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(dir);
    setPage(1);
    void load({ nextPage: 1 });
  }

  function gotoPage(next: number) {
    const clamped = Math.max(1, Math.min(totalPages, next));
    setPage(clamped);
    void load({ nextPage: clamped });
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      <Card className="shadow-sm">
        <CardContent className="p-6 border-b bg-gray-50/50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 max-w-md min-w-[280px]">
              <div className="flex gap-2">
                <Input value={searchTitle} onChange={(e) => setSearchTitle(e.target.value)} placeholder={t("Search tickets...")} />
                <Button type="button" onClick={applyFilters}>
                  {t("Search")}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-md overflow-hidden border">
                <Button type="button" variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-none" onClick={() => setViewMode("list")}>
                  <List className="h-4 w-4" />
                </Button>
                <Button type="button" variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-none border-l" onClick={() => setViewMode("grid")}>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>

              <select className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={String(perPage)} onChange={(e) => { const v = parseInt(e.target.value, 10) || 10; setPerPage(v); setPage(1); void load({ nextPage: 1, nextPerPage: v }); }}>
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} {t("per page")}
                  </option>
                ))}
              </select>

              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    {t("Filters")}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[360px] sm:w-[420px]">
                  <SheetHeader>
                    <SheetTitle>{t("Filters")}</SheetTitle>
                    <SheetDescription>{t("Refine the tickets list.")}</SheetDescription>
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
                          <SelectItem value="open">{t("Open")}</SelectItem>
                          <SelectItem value="in_progress">{t("In Progress")}</SelectItem>
                          <SelectItem value="resolved">{t("Resolved")}</SelectItem>
                          <SelectItem value="closed">{t("Closed")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("Priority")}</Label>
                      <Select value={filterPriority || "all"} onValueChange={(v) => setFilterPriority(v === "all" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("All")}</SelectItem>
                          <SelectItem value="low">{t("Low")}</SelectItem>
                          <SelectItem value="medium">{t("Medium")}</SelectItem>
                          <SelectItem value="high">{t("High")}</SelectItem>
                          <SelectItem value="urgent">{t("Urgent")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("Category")}</Label>
                      <Select value={filterCategory || "all"} onValueChange={(v) => setFilterCategory(v === "all" ? "" : v)} disabled={!categories.length}>
                        <SelectTrigger>
                          <SelectValue placeholder={categories.length ? t("Select category") : t("No categories available")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("All")}</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {isSuperAdmin ? (
                      <div className="space-y-2">
                        <Label>{t("User")}</Label>
                        <Select value={filterCompany || "all"} onValueChange={(v) => setFilterCompany(v === "all" ? "" : v)} disabled={!companies.length}>
                          <SelectTrigger>
                            <SelectValue placeholder={companies.length ? t("Select user") : t("No users available")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("All")}</SelectItem>
                            {companies.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </div>

                  <SheetFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={clearFilters}>
                      {t("Clear")}
                    </Button>
                    <Button type="button" onClick={() => { setFiltersOpen(false); applyFilters(); }}>
                      {t("Apply")}
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>

              <TableColumnVisibilityMenu
                columns={ticketColumnMenuDefs}
                columnVisible={columnVisible}
                setVisibility={setVisibility}
                onReset={resetVisibility}
              />

              <TooltipProvider>
                {canCreate ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div>
                        <HelpdeskTicketCreateDialog categories={categories} companies={companies} isSuperAdmin={isSuperAdmin} canCreate={canCreate} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("Create")}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </TooltipProvider>
            </div>
          </div>
        </CardContent>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground">{t("Loading...")}</div>
          ) : items.length === 0 ? (
            <div className="p-10">
              <div className="mx-auto max-w-sm text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Ticket className="h-8 w-8 text-gray-400" />
                </div>
                <div className="font-medium">{t("No tickets found")}</div>
                <div className="text-sm text-muted-foreground mt-1">{t("Get started by creating your first support ticket.")}</div>
                {canCreate ? (
                  <div className="mt-4 flex justify-center">
                    <HelpdeskTicketCreateDialog categories={categories} companies={companies} isSuperAdmin={isSuperAdmin} canCreate={canCreate} triggerVariant="button" />
                  </div>
                ) : null}
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((tk) => (
                <div key={tk.id} className="rounded-xl border bg-background p-4 hover:bg-accent/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">#{tk.ticket_id}</div>
                      <div className="font-medium line-clamp-2">{tk.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{tk.category?.name || "-"}</div>
                    </div>
                    <div className="shrink-0">
                      {(canEdit || canDelete) ? (
                        <HelpdeskTicketRowActions
                          ticket={tk}
                          categories={categories}
                          canEdit={canEdit}
                          canDelete={canDelete}
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {statusPill(tk.status)}
                    {priorityPill(tk.priority)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr className="border-b">
                    {columnVisible("ticket_id") ? (
                      <th className="text-left font-medium px-4 py-3">
                        <button type="button" className="inline-flex items-center hover:text-foreground" onClick={() => handleSort("ticket_id")}>
                          {t("Ticket ID")}
                          {sortChevron(sortField === "ticket_id", sortDirection)}
                        </button>
                      </th>
                    ) : null}
                    {columnVisible("title") ? (
                      <th className="text-left font-medium px-4 py-3">
                        <button type="button" className="inline-flex items-center hover:text-foreground" onClick={() => handleSort("title")}>
                          {t("Title")}
                          {sortChevron(sortField === "title", sortDirection)}
                        </button>
                      </th>
                    ) : null}
                    {columnVisible("category") ? (
                      <th className="text-left font-medium px-4 py-3">{t("Category")}</th>
                    ) : null}
                    {columnVisible("status") ? (
                      <th className="text-left font-medium px-4 py-3">
                        <button type="button" className="inline-flex items-center hover:text-foreground" onClick={() => handleSort("status")}>
                          {t("Status")}
                          {sortChevron(sortField === "status", sortDirection)}
                        </button>
                      </th>
                    ) : null}
                    {columnVisible("priority") ? (
                      <th className="text-left font-medium px-4 py-3">
                        <button type="button" className="inline-flex items-center hover:text-foreground" onClick={() => handleSort("priority")}>
                          {t("Priority")}
                          {sortChevron(sortField === "priority", sortDirection)}
                        </button>
                      </th>
                    ) : null}
                    {columnVisible("created_by") ? (
                      <th className="text-left font-medium px-4 py-3">{t("Created By")}</th>
                    ) : null}
                    <th className="text-right font-medium px-4 py-3">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((tk) => (
                    <tr key={tk.id} className="border-b hover:bg-accent/20">
                      {columnVisible("ticket_id") ? (
                        <td className="px-4 py-3 font-mono text-xs">
                          {canView ? (
                            <Link href={`/helpdesk-tickets/${tk.id}`} className="text-blue-600 hover:text-blue-700">
                              #{tk.ticket_id}
                            </Link>
                          ) : (
                            `#${tk.ticket_id}`
                          )}
                        </td>
                      ) : null}
                      {columnVisible("title") ? <td className="px-4 py-3">{tk.title}</td> : null}
                      {columnVisible("category") ? <td className="px-4 py-3">{tk.category?.name || "-"}</td> : null}
                      {columnVisible("status") ? <td className="px-4 py-3">{statusPill(tk.status)}</td> : null}
                      {columnVisible("priority") ? <td className="px-4 py-3">{priorityPill(tk.priority)}</td> : null}
                      {columnVisible("created_by") ? <td className="px-4 py-3">{tk.creator?.name || "-"}</td> : null}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          {(canEdit || canDelete) ? (
                            <HelpdeskTicketRowActions
                              ticket={tk}
                              categories={categories}
                              canEdit={canEdit}
                              canDelete={canDelete}
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        <CardContent className="px-4 py-2 border-t bg-gray-50/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              {t("Showing")} {from} {t("to")} {to} {t("of")} {total} {t("results")}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => gotoPage(page - 1)} disabled={page <= 1}>
                {t("Previous")}
              </Button>
              <div className="text-xs text-muted-foreground">
                {t("Page")} {page} / {totalPages}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => gotoPage(page + 1)} disabled={page >= totalPages}>
                {t("Next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

