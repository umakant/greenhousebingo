"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  Filter,
  Grid3X3,
  LayoutList,
  Loader2,
  Pencil,
  Plus,
  Users,
} from "lucide-react";

import NoRecordsFound from "@/components/no-records-found";
import { LmsCourseCatalogCard } from "@/components/lms/lms-course-catalog-card";
import { LmsCourseEnrollmentsSheet } from "@/components/lms/lms-course-enrollments-sheet";
import { LmsCourseFormSheet, type LmsCourseSheetMode } from "@/components/lms/lms-course-form-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
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
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  deliveryType: string;
  isPublic: boolean;
  coverImageUrl?: string | null;
  category: { name: string } | null;
  enrollmentCount: number;
};

type ViewMode = "list" | "grid";
const VIEW_MODE_STORAGE_KEY = "lms-courses-view-mode";

const STATUS_OPTIONS = ["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"] as const;

type InitialSheet = { mode: "create" } | { mode: "edit"; courseId: string } | null;

type SortField = "title" | "status" | "deliveryType" | "enrollmentCount";

function formatDeliveryType(v: string) {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatStatus(v: string) {
  return v.charAt(0) + v.slice(1).toLowerCase();
}

export function LmsCoursesCatalogClient(props: {
  canManageCourses: boolean;
  initialSheet?: InitialSheet;
}) {
  const { canManageCourses: canManage, initialSheet = null } = props;
  const [items, setItems] = React.useState<CourseRow[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [sortField, setSortField] = React.useState<SortField>("title");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (stored === "list" || stored === "grid") setViewMode(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const handleViewModeChange = React.useCallback((mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetMode, setSheetMode] = React.useState<LmsCourseSheetMode>("create");
  const [sheetCourseId, setSheetCourseId] = React.useState<string | undefined>();
  const [sheetCourseTitle, setSheetCourseTitle] = React.useState<string | undefined>();
  const [enrollmentsOpen, setEnrollmentsOpen] = React.useState(false);
  const [enrollmentsCourseId, setEnrollmentsCourseId] = React.useState<string | undefined>();
  const [enrollmentsCourseTitle, setEnrollmentsCourseTitle] = React.useState<string | undefined>();
  const appliedInitialSheet = React.useRef(false);

  const reloadCourses = React.useCallback(async () => {
    setErr(null);
    const res = await fetch("/api/lms/courses", { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      items?: CourseRow[];
      message?: string;
    } | null;
    if (!res.ok || !data?.ok || !Array.isArray(data.items)) {
      setErr(data?.message ?? "Could not load courses.");
      setItems([]);
      return;
    }
    setItems(data.items);
  }, []);

  React.useEffect(() => {
    void reloadCourses();
  }, [reloadCourses]);

  const openCreateSheet = React.useCallback(() => {
    setSheetMode("create");
    setSheetCourseId(undefined);
    setSheetCourseTitle(undefined);
    setSheetOpen(true);
  }, []);

  const openEditSheet = React.useCallback((course: Pick<CourseRow, "id" | "title">) => {
    setSheetMode("edit");
    setSheetCourseId(course.id);
    setSheetCourseTitle(course.title);
    setSheetOpen(true);
  }, []);

  const openEnrollmentsSheet = React.useCallback((course: Pick<CourseRow, "id" | "title">) => {
    setEnrollmentsCourseId(course.id);
    setEnrollmentsCourseTitle(course.title);
    setEnrollmentsOpen(true);
  }, []);

  React.useEffect(() => {
    if (!initialSheet || !canManage || appliedInitialSheet.current) return;
    appliedInitialSheet.current = true;
    if (initialSheet.mode === "create") {
      openCreateSheet();
      return;
    }
    const row = items?.find((i) => i.id === initialSheet.courseId);
    openEditSheet({ id: initialSheet.courseId, title: row?.title ?? "Course" });
  }, [initialSheet, canManage, items, openCreateSheet, openEditSheet]);

  React.useEffect(() => {
    if (!initialSheet || !canManage || items === null) return;
    if (initialSheet.mode !== "edit") return;
    const row = items.find((i) => i.id === initialSheet.courseId);
    if (row) setSheetCourseTitle(row.title);
  }, [initialSheet, canManage, items]);

  const filtered = React.useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.category?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter]);

  const sorted = React.useMemo(() => {
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortField === "enrollmentCount") {
        return (a.enrollmentCount - b.enrollmentCount) * dir;
      }
      const av = sortField === "title" ? a.title : sortField === "status" ? a.status : a.deliveryType;
      const bv = sortField === "title" ? b.title : sortField === "status" ? b.status : b.deliveryType;
      return av.localeCompare(bv, undefined, { sensitivity: "base" }) * dir;
    });
  }, [filtered, sortField, sortDirection]);

  const total = sorted.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, lastPage);
  const pageItems = sorted.slice((safePage - 1) * perPage, safePage * perPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(safePage * perPage, total);

  React.useEffect(() => {
    if (page > lastPage) setPage(lastPage);
  }, [page, lastPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const sortChevron = (field: SortField) => (
    <ChevronDown
      className={`ml-1 inline-block h-3 w-3 transition-transform ${
        sortField === field && sortDirection === "desc" ? "rotate-180" : ""
      }`}
    />
  );

  const activeFilterCount = statusFilter ? 1 : 0;
  const hasFilters = !!search.trim() || !!statusFilter;

  const courseRowActions = (c: CourseRow) => {
    const actionItems: TableActionItem[] = [
      {
        label: "Content",
        href: `/lms/courses/${c.id}/content`,
        icon: <LayoutList className="h-4 w-4" />,
      },
      {
        label: "Enrollments",
        onSelect: () => openEnrollmentsSheet(c),
        icon: <Users className="h-4 w-4" />,
      },
      {
        label: "Edit",
        onSelect: () => openEditSheet(c),
        icon: <Pencil className="h-4 w-4" />,
      },
    ];
    return {
      label: "Edit",
      onPrimaryClick: () => openEditSheet(c),
      items: actionItems,
    };
  };

  return (
    <>
    <Card className="shadow-sm">
      <CardContent className="border-b bg-muted/30 p-4 sm:p-6">
        <CoursesToolbar
          canManage={canManage}
          onNewCourse={openCreateSheet}
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          perPage={perPage}
          onPerPageChange={(n) => {
            setPerPage(n);
            setPage(1);
          }}
          statusFilter={statusFilter}
          onStatusFilterChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          activeFilterCount={activeFilterCount}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      </CardContent>

      {err ? <div className="px-6 py-4 text-sm text-destructive">{err}</div> : null}

      {items === null ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : pageItems.length === 0 ? (
        <div className="p-6">
          <NoRecordsFound
            icon={BookOpen}
            title="No courses found"
            description={
              canManage
                ? "Get started by creating your first course."
                : "No courses are assigned to you yet."
            }
            hasFilters={hasFilters}
            onClearFilters={() => {
              setSearch("");
              setStatusFilter("");
              setPage(1);
            }}
          />
          {canManage && !hasFilters ? (
            <CoursesEmptyCreateButton onNewCourse={openCreateSheet} />
          ) : null}
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {pageItems.map((c) => (
                <LmsCourseCatalogCard
                  key={c.id}
                  course={c}
                  canManage={canManage}
                  onEdit={() => openEditSheet(c)}
                  actionItems={courseRowActions(c).items}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">
                      <button type="button" className="inline-flex items-center" onClick={() => handleSort("title")}>
                        Name {sortChevron("title")}
                      </button>
                    </th>
                    <th className="p-3 text-left font-medium">
                      <button type="button" className="inline-flex items-center" onClick={() => handleSort("status")}>
                        Status {sortChevron("status")}
                      </button>
                    </th>
                    <th className="hidden p-3 text-left font-medium sm:table-cell">
                      <button
                        type="button"
                        className="inline-flex items-center"
                        onClick={() => handleSort("deliveryType")}
                      >
                        Type {sortChevron("deliveryType")}
                      </button>
                    </th>
                    <th className="hidden p-3 text-left font-medium lg:table-cell">Visibility</th>
                    <th className="hidden p-3 text-left font-medium lg:table-cell">Category</th>
                    <th className="p-3 text-left font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center"
                        onClick={() => handleSort("enrollmentCount")}
                      >
                        Enrolled {sortChevron("enrollmentCount")}
                      </button>
                    </th>
                    {canManage ? <th className="p-3 text-right font-medium">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        {canManage ? (
                          <button
                            type="button"
                            className="font-medium text-primary hover:underline text-left"
                            onClick={() => openEditSheet(c)}
                          >
                            {c.title}
                          </button>
                        ) : (
                          <Link href={`/lms/courses/${c.id}`} className="font-medium text-primary hover:underline">
                            {c.title}
                          </Link>
                        )}
                      </td>
                      <td className="p-3 capitalize">{formatStatus(c.status)}</td>
                      <td className="hidden p-3 sm:table-cell">{formatDeliveryType(c.deliveryType)}</td>
                      <td className="hidden p-3 lg:table-cell">{c.isPublic ? "Public" : "Private"}</td>
                      <td className="hidden p-3 text-muted-foreground lg:table-cell">{c.category?.name ?? "—"}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {c.enrollmentCount}
                        </span>
                      </td>
                      {canManage ? (
                        <td className="p-3 text-right">
                          <TableActionButton {...courseRowActions(c)} />
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t p-4">
            <Pagination
              page={safePage}
              lastPage={lastPage}
              total={total}
              from={from}
              to={to}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </Card>

    {canManage ? (
      <>
        <LmsCourseFormSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          mode={sheetMode}
          courseId={sheetCourseId}
          courseTitle={sheetCourseTitle}
          onSaved={() => void reloadCourses()}
        />
        <LmsCourseEnrollmentsSheet
          open={enrollmentsOpen}
          onOpenChange={setEnrollmentsOpen}
          courseId={enrollmentsCourseId}
          courseTitle={enrollmentsCourseTitle}
          onUpdated={() => void reloadCourses()}
        />
      </>
    ) : null}
    </>
  );
}

function CoursesToolbar(props: {
  canManage: boolean;
  onNewCourse: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  perPage: number;
  onPerPageChange: (n: number) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  activeFilterCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
      <div className="min-w-0 w-full max-w-full lg:max-w-md lg:flex-1">
        <SearchInput
          value={props.search}
          onChange={props.onSearchChange}
          onSearch={() => props.onSearchChange(props.search)}
          placeholder="Search courses…"
          buttonLabel="Search"
        />
      </div>
      <CoursesToolbarActions {...props} />
    </div>
  );
}

function CoursesToolbarActions(props: {
  canManage: boolean;
  onNewCourse: () => void;
  perPage: number;
  onPerPageChange: (n: number) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  activeFilterCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
      <div className="inline-flex overflow-hidden rounded-md border">
        <Button
          type="button"
          variant={props.viewMode === "list" ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8 rounded-none"
          onClick={() => props.onViewModeChange("list")}
          aria-label="List view"
        >
          <LayoutList className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={props.viewMode === "grid" ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8 rounded-none border-l"
          onClick={() => props.onViewModeChange("grid")}
          aria-label="Grid view"
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>
      </div>
      <Select
        value={String(props.perPage)}
        onValueChange={(v) => props.onPerPageChange(parseInt(v, 10) || 10)}
      >
        <SelectTrigger className="w-[110px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[10, 25, 50, 100].map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n} per page
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="default" className="relative">
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {props.activeFilterCount > 0 ? (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {props.activeFilterCount}
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 space-y-3 p-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select
              value={props.statusFilter || "all"}
              onValueChange={(v) => props.onStatusFilterChange(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatStatus(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {props.canManage ? (
        <Button size="sm" type="button" onClick={props.onNewCourse}>
          <Plus className="mr-1 h-4 w-4" />
          New course
        </Button>
      ) : null}
    </div>
  );
}

function CoursesEmptyCreateButton(props: { onNewCourse: () => void }) {
  return (
    <div className="mt-4 flex justify-center">
      <Button type="button" onClick={props.onNewCourse}>
        <Plus className="mr-2 h-4 w-4" />
        New course
      </Button>
    </div>
  );
}
