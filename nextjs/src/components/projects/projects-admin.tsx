"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Box,
  ChevronDown,
  Eye,
  Filter,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useTranslation } from "@/contexts/translation-context";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib, formatDateRange } from "@/lib/format-date";
import { formatCurrency } from "@/lib/format-currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { TableColumnVisibilityMenu } from "@/components/ui/table-column-visibility-menu";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
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
import { ProjectDrawer } from "@/components/projects/project-drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProjectForm } from "@/components/project-form";
import { ProjectEditForm } from "@/components/projects/project-edit-form";
import type { ProjectGanttHandle } from "@/components/project-gantt";

const ProjectGantt = dynamic(() => import("@/components/project-gantt"), {
  ssr: false,
  loading: () => (
    <div className="p-12 text-center text-muted-foreground text-sm">Loading…</div>
  ),
});

export type ProjectRow = {
  id: number;
  name: string;
  description: string | null;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  created_by: number | null;
  created_at: string | null;
  updated_at: string | null;
  users_count: number;
};

type ListResponse = {
  data: ProjectRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

const STATUS_OPTIONS = ["Ongoing", "Finished", "Onhold", "Not Started"];

const PROJECTS_COLUMN_STORAGE_KEY = "pf-projects-admin-table-columns-v1";

type ProjectTableColumnId = "name" | "users" | "budget" | "start_date" | "end_date" | "status";

const DEFAULT_PROJECT_TABLE_COLUMNS: Record<ProjectTableColumnId, boolean> = {
  name: true,
  users: true,
  budget: true,
  start_date: true,
  end_date: true,
  status: true,
};

/** Has any project management permission (manage implies create/edit/delete for plan-based access). */
function canManageProject(permissions: string[]) {
  return (
    permissions.includes("*") ||
    permissions.includes("manage-project") ||
    permissions.includes("manage-project-dashboard")
  );
}

function canAccessProjectGantt(permissions: string[]) {
  return (
    permissions.includes("*") ||
    permissions.includes("manage-project") ||
    permissions.includes("manage-project-dashboard")
  );
}

export default function ProjectsAdmin({
  permissions,
  activatedPackages = [],
}: {
  permissions: string[];
  activatedPackages?: string[];
}) {
  const { t } = useTranslation();
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<ProjectTableColumnId>(
    PROJECTS_COLUMN_STORAGE_KEY,
    DEFAULT_PROJECT_TABLE_COLUMNS,
  );

  const projectColumnMenuDefs = React.useMemo(
    () => [
      { id: "name" as const, label: t("Name") },
      { id: "users" as const, label: t("Users") },
      { id: "budget" as const, label: t("Budget") },
      { id: "start_date" as const, label: t("Start Date") },
      { id: "end_date" as const, label: t("End Date") },
      { id: "status" as const, label: t("Status") },
    ],
    [t],
  );

  const { settings } = useAppSettings();
  const canCreate =
    permissions.includes("*") ||
    permissions.includes("create-project") ||
    canManageProject(permissions);
  const canEdit =
    permissions.includes("*") ||
    permissions.includes("edit-project") ||
    canManageProject(permissions);
  const canDelete =
    permissions.includes("*") ||
    permissions.includes("delete-project") ||
    canManageProject(permissions);
  const canView =
    permissions.includes("*") ||
    permissions.includes("view-project") ||
    canManageProject(permissions);

  const hasTaskly = activatedPackages.map((p) => p.toLowerCase()).includes("taskly");
  const hasProjectPerm = canManageProject(permissions) || permissions.includes("view-project");

  React.useEffect(() => {
    if (!hasTaskly || hasProjectPerm) return;
    if (sessionStorage.getItem("pf_refresh_attempted")) return;
    sessionStorage.setItem("pf_refresh_attempted", "1");
    fetch("/api/auth/refresh-permissions", { method: "POST", credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) window.location.reload();
      })
      .catch(() => {});
  }, [hasTaskly, hasProjectPerm]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<ProjectRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [lastPage, setLastPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [dateFilter, setDateFilter] = React.useState<string>("");
  const [sortField, setSortField] = React.useState("createdAt");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = React.useState<"list" | "grid" | "gantt">("list");
  const canGanttView = canAccessProjectGantt(permissions);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingProjectId, setEditingProjectId] = React.useState<number | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const ganttRef = React.useRef<ProjectGanttHandle | null>(null);

  /** Gantt chart filters (shown in the same Filters dropdown / search row as list view). */
  const [ganttSearch, setGanttSearch] = React.useState("");
  const [ganttClientFilter, setGanttClientFilter] = React.useState("__all__");
  const [ganttStatusFilter, setGanttStatusFilter] = React.useState("__all__");
  const [ganttDateRangeFilter, setGanttDateRangeFilter] = React.useState("__all__");
  const [ganttClients, setGanttClients] = React.useState<Array<{ id: string; name: string; code?: string }>>([]);

  React.useEffect(() => {
    if (viewMode !== "gantt" || !canGanttView) return;
    fetch("/api/gantt-clients", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        if (Array.isArray(data)) setGanttClients(data as Array<{ id: string; name: string; code?: string }>);
        else setGanttClients([]);
      })
      .catch(() => setGanttClients([]));
  }, [viewMode, canGanttView]);

  const applyViewMode = React.useCallback(
    (mode: "list" | "grid" | "gantt") => {
      setViewMode(mode);
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (mode === "gantt") params.set("view", "gantt");
      else params.delete("view");
      const qs = params.toString();
      router.replace(qs ? `/projects?${qs}` : "/projects", { scroll: false });
    },
    [router, searchParams],
  );

  React.useEffect(() => {
    const v = searchParams?.get("view");
    if (v === "gantt" && canGanttView) setViewMode("gantt");
  }, [searchParams, canGanttView]);

  React.useEffect(() => {
    if (viewMode === "gantt" && !canGanttView) {
      setViewMode("list");
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.delete("view");
      const qs = params.toString();
      router.replace(qs ? `/projects?${qs}` : "/projects", { scroll: false });
    }
  }, [viewMode, canGanttView, router, searchParams]);

  React.useEffect(() => {
    const createParam = searchParams?.get("create");
    const editParam = searchParams?.get("edit");
    if (createParam === "1") {
      setCreateOpen(true);
      router.replace("/projects");
    } else if (editParam) {
      fetch(`/api/project/${editParam}`, { credentials: "include" })
        .then((r) => r.json())
        .then((data: { id?: number; error?: string }) => {
          if (data?.id) {
            setEditingProjectId(Number(data.id));
            setEditOpen(true);
            router.replace("/projects");
          }
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = React.useCallback(
    async (opts?: {
      nextPage?: number;
      nextPerPage?: number;
      sort?: string;
      direction?: "asc" | "desc";
      nextStatus?: string;
      nextDate?: string;
    }) => {
      setLoading(true);
      setError(null);
      const p = opts?.nextPage ?? page;
      const pp = opts?.nextPerPage ?? perPage;
      const sort = opts?.sort ?? sortField;
      const dir = opts?.direction ?? sortDirection;
      const status = opts?.nextStatus !== undefined ? opts.nextStatus : statusFilter;
      const date = opts?.nextDate !== undefined ? opts.nextDate : dateFilter;
      try {
        const params = new URLSearchParams();
        params.set("page", String(p));
        params.set("per_page", String(pp));
        if (search.trim()) params.set("search", search.trim());
        if (status) params.set("status", status);
        if (date) params.set("date", date);
        params.set("sort", sort);
        params.set("direction", dir);
        const res = await fetch(`/api/project/list?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || res.statusText);
        }
        const json = (await res.json()) as ListResponse;
        setItems(json.data ?? []);
        setTotal(json.total ?? 0);
        setLastPage(json.last_page ?? 1);
        if (opts?.nextPage != null) setPage(opts.nextPage);
        if (opts?.nextPerPage != null) setPerPage(opts.nextPerPage);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load projects");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [page, perPage, search, statusFilter, dateFilter, sortField, sortDirection]
  );

  React.useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => load({ nextPage: 1 });
  const handleSort = (field: string) => {
    const nextDir = sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(nextDir);
    setPage(1);
    load({ nextPage: 1, sort: field, direction: nextDir });
  };
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/project/${deleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteId(null);
      load();
    } catch {
      setDeleting(false);
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (row: ProjectRow) => {
    setEditingProjectId(row.id);
    setEditOpen(true);
  };

  const projectRowTableActions = (row: ProjectRow) => {
    const items: TableActionItem[] = [
      ...(canView
        ? [{ label: t("View"), href: `/project/${row.id}`, icon: <Eye className="h-4 w-4" /> }]
        : []),
      ...(canEdit
        ? [{ label: t("Edit"), icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(row) }]
        : []),
      ...(canDelete
        ? [
            {
              label: t("Delete"),
              icon: <Trash2 className="h-4 w-4" />,
              onSelect: () => setDeleteId(row.id),
              destructive: true as const,
            },
          ]
        : []),
    ];
    const label = canEdit ? t("Edit") : canDelete ? t("Delete") : t("View");
    const primaryHref = !canEdit && !canDelete && canView ? `/project/${row.id}` : undefined;
    const onPrimaryClick = canEdit ? () => openEdit(row) : canDelete ? () => setDeleteId(row.id) : undefined;
    return { label, primaryHref, onPrimaryClick, items };
  };

  const sortChevron = (field: string) => (
    <ChevronDown
      className={`h-3 w-3 ml-1 inline-block transition-transform ${
        sortField === field && sortDirection === "desc" ? "rotate-180" : ""
      }`}
    />
  );

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  const activeFilterCount = [statusFilter, dateFilter].filter(Boolean).length;
  const ganttFilterCount = [
    ganttDateRangeFilter !== "__all__",
    ganttClientFilter !== "__all__",
    ganttStatusFilter !== "__all__",
  ].filter(Boolean).length;
  const hasFilters = !!search.trim() || !!statusFilter || !!dateFilter;

  const formatMoney = (val: number | null) => val != null ? formatCurrency(val, settings) : "—";
  const formatDate = (d: string | null) => fmtDateLib(d, settings);

  return (
    <>
      <Card className="shadow-sm">
        <CardContent className="border-b bg-muted/30 p-4 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
            <div className="min-w-0 w-full max-w-full lg:max-w-md lg:flex-1">
              {viewMode === "gantt" && canGanttView ? (
                <SearchInput
                  value={ganttSearch}
                  onChange={setGanttSearch}
                  onSearch={() => {}}
                  placeholder={t("Search projects...")}
                  buttonLabel={t("Search")}
                />
              ) : (
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  onSearch={handleSearch}
                  placeholder={t("Search projects...")}
                  buttonLabel={t("Search")}
                />
              )}
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
              <div className="flex overflow-hidden rounded-md border">
                <button
                  type="button"
                  className={`p-2 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  onClick={() => applyViewMode("list")}
                  title={t("List view")}
                  aria-label={t("List view")}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={`p-2 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  onClick={() => applyViewMode("grid")}
                  title={t("Grid view")}
                  aria-label={t("Grid view")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                {canGanttView ? (
                  <button
                    type="button"
                    className={`p-2 ${viewMode === "gantt" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                    onClick={() => applyViewMode("gantt")}
                    title={t("Gantt chart view")}
                    aria-label={t("Gantt chart view")}
                  >
                    <BarChart3 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              {viewMode !== "gantt" ? (
                <>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="default" className="relative">
                        <Filter className="mr-2 h-4 w-4" />
                        {t("Filters")}
                        {activeFilterCount > 0 && (
                          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                            {activeFilterCount}
                          </span>
                        )}
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
                          className="h-9 shadow-sm transition-colors"
                        />
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <TableColumnVisibilityMenu
                    columns={projectColumnMenuDefs}
                    columnVisible={columnVisible}
                    setVisibility={setVisibility}
                    onReset={resetVisibility}
                  />
                </>
              ) : canGanttView ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="default" className="relative">
                      <Filter className="mr-2 h-4 w-4" />
                      {t("Filters")}
                      {ganttFilterCount > 0 && (
                        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                          {ganttFilterCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 space-y-3 p-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t("Added On")}</label>
                      <Select value={ganttDateRangeFilter} onValueChange={setGanttDateRangeFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">{t("Start Date To End Date")}</SelectItem>
                          <SelectItem value="today">{t("Today")}</SelectItem>
                          <SelectItem value="last30">{t("Last 30 Days")}</SelectItem>
                          <SelectItem value="thisMonth">{t("This Month")}</SelectItem>
                          <SelectItem value="lastMonth">{t("Last Month")}</SelectItem>
                          <SelectItem value="last90">{t("Last 90 Days")}</SelectItem>
                          <SelectItem value="last6m">{t("Last 6 Months")}</SelectItem>
                          <SelectItem value="last1y">{t("Last 1 Year")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t("Client")}</label>
                      <Select value={ganttClientFilter} onValueChange={setGanttClientFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("All")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">{t("All")}</SelectItem>
                          {ganttClients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              <span>{c.name}</span>
                              {c.code ? <span className="ml-1 text-xs text-muted-foreground">({c.code})</span> : null}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t("Status")}</label>
                      <Select value={ganttStatusFilter} onValueChange={setGanttStatusFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("All")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">{t("All")}</SelectItem>
                          <SelectItem value="active">{t("Active")}</SelectItem>
                          <SelectItem value="completed">{t("Completed")}</SelectItem>
                          <SelectItem value="on_hold">{t("On Hold")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              {canCreate &&
                (viewMode === "gantt" && canGanttView ? (
                  <Button size="sm" type="button" onClick={() => ganttRef.current?.openCreateProject()}>
                    <Plus className="mr-1 h-4 w-4" />
                    {t("Create Project")}
                  </Button>
                ) : viewMode !== "gantt" ? (
                  <Button size="sm" asChild>
                    <Link href="/project/new">
                      <Plus className="mr-1 h-4 w-4" />
                      {t("Create Project")}
                    </Link>
                  </Button>
                ) : null)}
            </div>
          </div>
        </CardContent>

        {viewMode === "gantt" && canGanttView ? (
          <div className="hidden border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[240px_minmax(0,1fr)] sm:gap-0">
            <span className="border-r border-border/60 pr-2">{t("Name")}</span>
            <span className="pl-2 text-center">{t("Schedule")}</span>
          </div>
        ) : null}

        {error && viewMode !== "gantt" && (
          <div className="px-6 py-4 text-sm text-destructive">{error}</div>
        )}

        {viewMode === "gantt" && canGanttView ? (
          <div
            className="flex min-h-0 flex-1 flex-col border-t px-2 pb-2 pt-3 sm:px-4 sm:pt-4"
            style={{ minHeight: "min(55dvh, 560px)", height: "max(360px, calc(100dvh - 13rem))" }}
          >
            <ProjectGantt
              ref={ganttRef}
              embedded
              filters={{
                search: ganttSearch,
                onSearchChange: setGanttSearch,
                clientFilter: ganttClientFilter,
                onClientFilterChange: setGanttClientFilter,
                statusFilter: ganttStatusFilter,
                onStatusFilterChange: setGanttStatusFilter,
                dateRangeFilter: ganttDateRangeFilter,
                onDateRangeFilterChange: setGanttDateRangeFilter,
              }}
            />
          </div>
        ) : loading ? (
          <div className="p-12 text-center text-muted-foreground">{t("Loading...")}</div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <NoRecordsFound
              icon={Box}
              title={t("No projects found")}
              description={t("Get started by creating your first project.")}
              hasFilters={hasFilters}
              onClearFilters={() => {
                setSearch("");
                setStatusFilter("");
                setDateFilter("");
                setPage(1);
                load({ nextPage: 1, nextStatus: "", nextDate: "" });
              }}
            />
            {canCreate && (
              <div className="flex justify-center mt-4">
                <Button asChild>
                  <Link href="/project/new">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("Create Project")}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {columnVisible("name") ? (
                    <th className="text-left p-3 font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center"
                        onClick={() => handleSort("name")}
                      >
                        {t("Name")} {sortChevron("name")}
                      </button>
                    </th>
                  ) : null}
                  {columnVisible("users") ? (
                    <th className="text-left p-3 font-medium">{t("Users")}</th>
                  ) : null}
                  {columnVisible("budget") ? (
                    <th className="text-left p-3 font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center"
                        onClick={() => handleSort("budget")}
                      >
                        {t("Budget")} {sortChevron("budget")}
                      </button>
                    </th>
                  ) : null}
                  {columnVisible("start_date") ? (
                    <th className="text-left p-3 font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center"
                        onClick={() => handleSort("startDate")}
                      >
                        {t("Start Date")} {sortChevron("startDate")}
                      </button>
                    </th>
                  ) : null}
                  {columnVisible("end_date") ? (
                    <th className="text-left p-3 font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center"
                        onClick={() => handleSort("endDate")}
                      >
                        {t("End Date")} {sortChevron("endDate")}
                      </button>
                    </th>
                  ) : null}
                  {columnVisible("status") ? (
                    <th className="text-left p-3 font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center"
                        onClick={() => handleSort("status")}
                      >
                        {t("Status")} {sortChevron("status")}
                      </button>
                    </th>
                  ) : null}
                  {(canEdit || canDelete || canView) && (
                    <th className="text-right p-3 font-medium">{t("Actions")}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-muted/30">
                    {columnVisible("name") ? (
                      <td className="p-3">
                        <Link
                          href={`/project/${row.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {row.name}
                        </Link>
                      </td>
                    ) : null}
                    {columnVisible("users") ? (
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {row.users_count}
                        </span>
                      </td>
                    ) : null}
                    {columnVisible("budget") ? <td className="p-3">{formatMoney(row.budget)}</td> : null}
                    {columnVisible("start_date") ? <td className="p-3">{formatDate(row.start_date)}</td> : null}
                    {columnVisible("end_date") ? <td className="p-3">{formatDate(row.end_date)}</td> : null}
                    {columnVisible("status") ? (
                      <td className="p-3">
                        <span className="capitalize">{row.status ?? "—"}</span>
                      </td>
                    ) : null}
                    {(canEdit || canDelete || canView) && (
                      <td className="p-3 text-right">
                        <TableActionButton {...projectRowTableActions(row)} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {["Scheduled", "In Progress", "Completed"].map((bucket) => {
              const bucketProjects = items.filter((row) => {
                const status = (row.status ?? "").toLowerCase();
                if (bucket === "Scheduled") return status === "not started" || status === "onhold";
                if (bucket === "In Progress") return status === "ongoing";
                if (bucket === "Completed") return status === "finished";
                return false;
              });
              if (bucketProjects.length === 0) return null;
              return (
                <div key={bucket} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground">{t(bucket)}</h3>
                    <span className="text-xs text-muted-foreground">{bucketProjects.length}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {bucketProjects.map((row) => (
                      <Card key={row.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/project/${row.id}`}
                                className="block truncate font-medium text-primary hover:underline"
                              >
                                {row.name}
                              </Link>
                              <p className="mt-1 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                                {formatDateRange(row.start_date, row.end_date, settings)}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {t("Budget")}: {formatMoney(row.budget)}
                              </p>
                              {/* Status pill in card body */}
                              <p className="mt-2">
                                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground bg-muted/40">
                                  {row.status ?? t("No status")}
                                </span>
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {/* Compact status text in top-right for quick scan */}
                              <span className="text-[11px] font-medium capitalize text-muted-foreground">
                                {row.status ?? t("No status")}
                              </span>
                              {(canEdit || canDelete || canView) && (
                                <TableActionButton {...projectRowTableActions(row)} />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && viewMode !== "gantt" && (
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
        )}
      </Card>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="sm:max-w-none w-[560px] max-w-[92vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("Create Project")}</SheetTitle>
            <SheetDescription>{t("Fill in the project details below.")}</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ProjectForm
              mode="drawer"
              onSuccess={(id) => {
                setCreateOpen(false);
                window.location.href = `/project/${id}`;
              }}
              onCancel={() => setCreateOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <ProjectDrawer
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingProjectId(null);
        }}
        title={t("Edit Project")}
        description={t("Update the project details below.")}
        className="sm:max-w-none w-[640px] max-w-[92vw] overflow-y-auto"
        footer={
          editingProjectId
            ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditOpen(false);
                    setEditingProjectId(null);
                  }}
                >
                  {t("Cancel")}
                </Button>
                <Button type="submit" form="projects-admin-edit-form">
                  {t("Save Changes")}
                </Button>
              </>
            )
            : null
        }
      >
        {editingProjectId ? (
          <ProjectEditForm
            projectId={editingProjectId}
            formId="projects-admin-edit-form"
            showActions={false}
            onCancel={() => {
              setEditOpen(false);
              setEditingProjectId(null);
            }}
            onSuccess={() => {
              setEditOpen(false);
              setEditingProjectId(null);
              void load();
            }}
          />
        ) : null}
      </ProjectDrawer>

      <ProjectDrawer
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t("Delete Project")}
        description={t("Are you sure you want to delete this project? This action cannot be undone.")}
        narrow
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              {t("Cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("Deleting...") : t("Delete")}
            </Button>
          </>
        }
      >
        <span className="sr-only">{t("Confirm delete project")}</span>
      </ProjectDrawer>
    </>
  );
}
