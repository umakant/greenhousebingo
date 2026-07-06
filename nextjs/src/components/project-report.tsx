"use client";

import * as React from "react";
import Link from "next/link";
import { BarChart3, ChevronDown, Eye, Filter } from "lucide-react";
import { useTranslation } from "@/contexts/translation-context";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { Input } from "@/components/ui/input";
import NoRecordsFound from "@/components/no-records-found";
import { Pagination } from "@/components/ui/pagination";
import { TableActionButton } from "@/components/ui/table-action-button";

type ReportRow = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  tasks_count: string;
  bugs_count: string;
  milestones_count: string;
};

type ListResponse = {
  data: ReportRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
};

const STATUS_OPTIONS = ["Ongoing", "Finished", "Onhold", "Not Started"];

export function ProjectReport() {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const formatDate = (d: string | null) => fmtDateLib(d, settings);
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<ReportRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [lastPage, setLastPage] = React.useState(1);
  const [from, setFrom] = React.useState(0);
  const [to, setTo] = React.useState(0);
  const [nameFilter, setNameFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState("");
  const [sortField, setSortField] = React.useState("createdAt");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc");

  const load = React.useCallback(
    async (opts?: {
      nextPage?: number;
      nextPerPage?: number;
      sort?: string;
      direction?: "asc" | "desc";
      nextStatus?: string;
      nextName?: string;
      nextDate?: string;
    }) => {
      setLoading(true);
      const p = opts?.nextPage ?? page;
      const pp = opts?.nextPerPage ?? perPage;
      const sort = opts?.sort ?? sortField;
      const dir = opts?.direction ?? sortDirection;
      const name = opts?.nextName !== undefined ? opts.nextName : nameFilter;
      const status = opts?.nextStatus !== undefined ? opts.nextStatus : statusFilter;
      const date = opts?.nextDate !== undefined ? opts.nextDate : dateFilter;
      try {
        const params = new URLSearchParams();
        params.set("page", String(p));
        params.set("per_page", String(pp));
        if (name.trim()) params.set("name", name.trim());
        if (status) params.set("status", status);
        if (date) params.set("date", date);
        params.set("sort", sort);
        params.set("direction", dir);
        const res = await fetch(`/api/project/report?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json()) as ListResponse;
        setItems(json.data ?? []);
        setTotal(json.total ?? 0);
        setLastPage(json.last_page ?? 1);
        setFrom(json.from ?? 0);
        setTo(json.to ?? 0);
        if (opts?.nextPage != null) setPage(opts.nextPage);
        if (opts?.nextPerPage != null) setPerPage(opts.nextPerPage);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [page, perPage, nameFilter, statusFilter, dateFilter, sortField, sortDirection]
  );

  React.useEffect(() => {
    load();
  }, [load]);

  const handleSort = (field: string) => {
    const nextDir = sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(nextDir);
    setPage(1);
    load({ nextPage: 1, sort: field, direction: nextDir });
  };

  const sortChevron = (field: string) => (
    <ChevronDown
      className={`h-3 w-3 ml-1 inline-block transition-transform ${
        sortField === field && sortDirection === "desc" ? "rotate-180" : ""
      }`}
    />
  );

  const hasFilters = !!nameFilter.trim() || !!statusFilter || !!dateFilter;
  const activeFilterCount = [statusFilter, dateFilter].filter(Boolean).length;

  const countCell = (value: string) => {
    const [completed, total] = (value || "0/0").split("/");
    const isAllCompleted = completed === total && total !== "0";
    return (
      <span className={isAllCompleted ? "text-green-600 font-semibold" : ""}>
        {value || "0/0"}
      </span>
    );
  };

  const getStatusClass = (status: string | null) => {
    if (!status) return "bg-muted text-muted-foreground";
    const map: Record<string, string> = {
      Ongoing: "bg-blue-100 text-blue-800",
      Onhold: "bg-yellow-100 text-yellow-800",
      Finished: "bg-green-100 text-green-800",
      "Not Started": "bg-gray-100 text-gray-800",
    };
    return map[status] ?? "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardContent className="border-b bg-muted/30 p-4 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
            <div className="min-w-0 w-full max-w-full lg:max-w-md lg:flex-1">
              <SearchInput
                value={nameFilter}
                onChange={setNameFilter}
                onSearch={() => load({ nextPage: 1 })}
                placeholder={t("Search by project name...")}
                buttonLabel={t("Search")}
              />
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="default" className="relative">
                    <Filter className="mr-2 h-4 w-4" />
                    {t("Filters")}
                    {activeFilterCount > 0 ? (
                      <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 space-y-3 p-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("Status")}</label>
                    <Select
                      value={statusFilter || "all"}
                      onValueChange={(v) => {
                        const newStatus = v === "all" ? "" : v;
                        setStatusFilter(newStatus);
                        setPage(1);
                        load({ nextPage: 1, nextStatus: newStatus });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("All statuses")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("All statuses")}</SelectItem>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("Date")}</label>
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDateFilter(val);
                        setPage(1);
                        load({ nextPage: 1, nextDate: val });
                      }}
                      className="h-9 shadow-sm"
                    />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Select
                value={String(perPage)}
                onValueChange={(v) => {
                  const n = parseInt(v, 10) || 10;
                  setPerPage(n);
                  setPage(1);
                  load({ nextPage: 1, nextPerPage: n });
                }}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {t("per page")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setNameFilter("");
                    setStatusFilter("");
                    setDateFilter("");
                    setPage(1);
                    load({ nextPage: 1, nextStatus: "", nextDate: "", nextName: "" });
                  }}
                >
                  {t("Clear filters")}
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>

        {loading ? (
          <div className="border-t p-12 text-center text-muted-foreground">{t("Loading...")}</div>
        ) : items.length === 0 ? (
          <div className="border-t p-6">
            <NoRecordsFound
              icon={BarChart3}
              title={t("No project reports found")}
              description={t("Create projects to see report data.")}
              hasFilters={hasFilters}
              onClearFilters={() => {
                setNameFilter("");
                setStatusFilter("");
                setDateFilter("");
                setPage(1);
                load({ nextPage: 1 });
              }}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto border-t">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center"
                        onClick={() => handleSort("name")}
                      >
                        {t("Project Name")} {sortChevron("name")}
                      </button>
                    </th>
                    <th className="text-left p-3 font-medium">{t("Tasks")}</th>
                    <th className="text-left p-3 font-medium">{t("Bugs")}</th>
                    <th className="text-left p-3 font-medium">{t("Milestones")}</th>
                    <th className="text-left p-3 font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center"
                        onClick={() => handleSort("startDate")}
                      >
                        {t("Start Date")} {sortChevron("startDate")}
                      </button>
                    </th>
                    <th className="text-left p-3 font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center"
                        onClick={() => handleSort("endDate")}
                      >
                        {t("End Date")} {sortChevron("endDate")}
                      </button>
                    </th>
                    <th className="text-left p-3 font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center"
                        onClick={() => handleSort("status")}
                      >
                        {t("Status")} {sortChevron("status")}
                      </button>
                    </th>
                    <th className="text-right p-3 font-medium">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <Link
                          href={`/project/${row.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="p-3">{countCell(row.tasks_count)}</td>
                      <td className="p-3">{countCell(row.bugs_count)}</td>
                      <td className="p-3">{countCell(row.milestones_count)}</td>
                      <td className="p-3 text-muted-foreground">{formatDate(row.start_date)}</td>
                      <td className="p-3">
                        {row.end_date ? (
                          new Date(row.end_date) < new Date() ? (
                            <span className="text-red-600">{formatDate(row.end_date)}</span>
                          ) : (
                            formatDate(row.end_date)
                          )
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(row.status)}`}
                        >
                          {row.status ?? "—"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <TableActionButton
                          label={t("View")}
                          primaryHref={`/project/${row.id}`}
                          items={[
                            { label: t("View"), href: `/project/${row.id}`, icon: <Eye className="h-4 w-4" /> },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t">
              <Pagination
                page={page}
                lastPage={lastPage}
                total={total}
                from={from}
                to={to}
                onPageChange={(p) => {
                  setPage(p);
                  load({ nextPage: p });
                }}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
