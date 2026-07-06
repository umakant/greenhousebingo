"use client";

import type { ReactNode } from "react";
import { Filter, LayoutGrid, List, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { t } from "@/lib/admin-t";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export type HrmViewMode = "list" | "grid";

type Props = {
  /** When false, the search row is omitted (toolbar still shows view mode, per page, filters, etc.). */
  showSearch?: boolean;
  searchPlaceholder: string;
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  onSearchSubmit: () => void;
  viewMode: HrmViewMode;
  onViewModeChange: (m: HrmViewMode) => void;
  perPage: number;
  onPerPageChange: (n: number) => void;
  activeFilterCount?: number;
  filtersMenuContent?: ReactNode;
  columnsMenu?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  primaryAction?: ReactNode;
  children: ReactNode;
  page: number;
  lastPage: number;
  total: number;
  from: number;
  to: number;
  onPageChange: (p: number) => void;
};

/**
 * Shared list chrome aligned with the Projects admin: Search + toolbar, list/grid, per-page,
 * optional Filters / Columns / refresh, primary action, bordered body, Pagination footer.
 */
export function HrmProjectsStyleListPage({
  showSearch = true,
  searchPlaceholder,
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  viewMode,
  onViewModeChange,
  perPage,
  onPerPageChange,
  activeFilterCount = 0,
  filtersMenuContent,
  columnsMenu,
  onRefresh,
  refreshing,
  primaryAction,
  children,
  page,
  lastPage,
  total,
  from,
  to,
  onPageChange,
}: Props) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardContent className="p-0 sm:p-0">
        <div className="border-b bg-muted/30 p-4 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
            {showSearch ? (
              <div className="min-w-0 w-full max-w-full lg:max-w-md lg:flex-1">
                <SearchInput
                  value={searchInput}
                  onChange={onSearchInputChange}
                  onSearch={onSearchSubmit}
                  placeholder={searchPlaceholder}
                  buttonLabel={t("Search")}
                />
              </div>
            ) : null}
            <div className={`flex w-full flex-wrap items-center gap-2 lg:justify-end ${showSearch ? "lg:w-auto" : "lg:ml-auto"}`}>
              <div className="flex overflow-hidden rounded-md border">
                <button
                  type="button"
                  className={`p-2 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  title={t("List view")}
                  aria-label={t("List view")}
                  onClick={() => onViewModeChange("list")}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={`p-2 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  title={t("Grid view")}
                  aria-label={t("Grid view")}
                  onClick={() => onViewModeChange("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
              <Select
                value={String(perPage)}
                onValueChange={(v) => {
                  const n = parseInt(v, 10) || 10;
                  onPerPageChange(n);
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
              {filtersMenuContent ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className="relative">
                      <Filter className="mr-2 h-4 w-4" />
                      {t("Filters")}
                      {activeFilterCount > 0 ? (
                        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                          {activeFilterCount}
                        </span>
                      ) : null}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-3">
                    {filtersMenuContent}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              {columnsMenu}
              {onRefresh ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 shrink-0"
                  onClick={onRefresh}
                  disabled={refreshing}
                  aria-label={t("Refresh")}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              ) : null}
              {primaryAction}
            </div>
          </div>
        </div>
        {children}
        <div className="border-t border-border/60 p-4">
          <Pagination page={page} lastPage={lastPage} total={total} from={from} to={to} onPageChange={onPageChange} />
        </div>
      </CardContent>
    </Card>
  );
}
