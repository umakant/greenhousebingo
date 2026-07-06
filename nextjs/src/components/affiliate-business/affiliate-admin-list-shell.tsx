"use client";

import * as React from "react";
import { Filter, Plus } from "lucide-react";

import NoRecordsFound from "@/components/no-records-found";
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
import type { LucideIcon } from "lucide-react";
import { t } from "@/lib/admin-t";


export type AffiliateListPagination = {
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
};

export function useAffiliateListPagination(initialPerPage = 10) {
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(initialPerPage);

  const resetPage = React.useCallback(() => setPage(1), []);

  const paginate = React.useCallback(
    <T,>(items: T[]) => {
      const total = items.length;
      const lastPage = Math.max(1, Math.ceil(total / perPage) || 1);
      const safePage = Math.min(page, lastPage);
      const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
      const to = Math.min(safePage * perPage, total);
      const slice = items.slice((safePage - 1) * perPage, safePage * perPage);
      return { slice, total, lastPage: lastPage || 1, from, to, safePage };
    },
    [page, perPage],
  );

  return {
    page,
    perPage,
    setPage,
    setPerPage,
    resetPage,
    paginate,
  };
}

type AffiliateAdminListShellProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  searchPlaceholder: string;
  loading: boolean;
  error?: string | null;
  itemCount: number;
  pagination: AffiliateListPagination;
  paginatedTotal: number;
  paginatedLastPage: number;
  paginatedFrom: number;
  paginatedTo: number;
  activeFilterCount?: number;
  filterContent?: React.ReactNode;
  columnMenu?: React.ReactNode;
  createLabel?: string;
  onCreateClick?: () => void;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  hasFilters?: boolean;
  onClearFilters?: () => void;
  children: React.ReactNode;
};

export function AffiliateAdminListShell({
  search,
  onSearchChange,
  onSearch,
  searchPlaceholder,
  loading,
  error,
  itemCount,
  pagination,
  paginatedTotal,
  paginatedLastPage,
  paginatedFrom,
  paginatedTo,
  activeFilterCount = 0,
  filterContent,
  columnMenu,
  createLabel,
  onCreateClick,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  hasFilters,
  onClearFilters,
  children,
}: AffiliateAdminListShellProps) {
  const { page, perPage, onPageChange, onPerPageChange } = pagination;

  return (
    <Card className="shadow-sm">
      <CardContent className="border-b bg-muted/30 p-4 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="min-w-0 w-full max-w-full lg:max-w-md lg:flex-1">
            <SearchInput
              value={search}
              onChange={onSearchChange}
              onSearch={onSearch}
              placeholder={searchPlaceholder}
              buttonLabel={t("Search")}
            />
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
            <Select
              value={String(perPage)}
              onValueChange={(v) => {
                const n = parseInt(v, 10) || 10;
                onPerPageChange(n);
                onPageChange(1);
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
            {filterContent ? (
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
                  {filterContent}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {columnMenu}
            {createLabel && onCreateClick ? (
              <Button size="sm" type="button" onClick={onCreateClick}>
                <Plus className="mr-1 h-4 w-4" />
                {createLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>

      {error ? <div className="px-6 py-4 text-sm text-destructive">{error}</div> : null}

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">{t("Loading...")}</div>
      ) : itemCount === 0 ? (
        <div className="p-6">
          <NoRecordsFound
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            hasFilters={hasFilters}
            onClearFilters={onClearFilters}
          />
          {createLabel && onCreateClick ? (
            <div className="mt-4 flex justify-center">
              <Button type="button" onClick={onCreateClick}>
                <Plus className="mr-2 h-4 w-4" />
                {createLabel}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        children
      )}

      {!loading && itemCount > 0 ? (
        <div className="border-t p-4">
          <Pagination
            page={page}
            lastPage={paginatedLastPage}
            total={paginatedTotal}
            from={paginatedFrom}
            to={paginatedTo}
            onPageChange={onPageChange}
          />
        </div>
      ) : null}
    </Card>
  );
}
