"use client";

import * as React from "react";
import { Mail, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableActionButton } from "@/components/ui/table-action-button";
import { SearchInput } from "@/components/ui/search-input";
import { PerPageSelector } from "@/components/ui/per-page-selector";
import { Pagination } from "@/components/ui/pagination";
import { FilterButton } from "@/components/ui/filter-button";
import NoRecordsFound from "@/components/no-records-found";
import { getPackageAlias } from "@/utils/package-alias";
import { t } from "@/lib/admin-t";


type EmailTemplateRow = {
  id: string;
  name: string;
  from: string;
  moduleName: string;
};

export default function EmailTemplatesAdmin() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [filters, setFilters] = React.useState({ name: "", module_name: "" });
  const [showFilters, setShowFilters] = React.useState(false);
  const [perPage, setPerPage] = React.useState(10);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [from, setFrom] = React.useState(0);
  const [to, setTo] = React.useState(0);
  const [sortField, setSortField] = React.useState<string>("");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const [rows, setRows] = React.useState<EmailTemplateRow[]>([]);
  const [allModules, setAllModules] = React.useState<string[]>([]);

  const activeFilterCount = React.useMemo(() => [filters.module_name].filter(Boolean).length, [filters]);

  const load = React.useCallback(
    async (opts?: { page?: number; perPage?: number }) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (filters.name.trim()) qs.set("name", filters.name.trim());
        if (filters.module_name) qs.set("module_name", filters.module_name);
        qs.set("page", String(opts?.page ?? page));
        qs.set("per_page", String(opts?.perPage ?? perPage));
        if (sortField) qs.set("sort", sortField);
        qs.set("direction", sortDirection);

        const res = await fetch(`/api/email-templates?${qs.toString()}`, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as unknown;
        const obj = (json && typeof json === "object" ? (json as Record<string, unknown>) : null) as any;
        if (!res.ok || !obj?.ok) throw new Error(obj?.message || "Failed to load email templates.");

        setRows((obj.emailTemplates?.data ?? []) as EmailTemplateRow[]);
        setAllModules((obj.allModules ?? []) as string[]);

        setPage(Number(obj.emailTemplates?.current_page ?? 1));
        setLastPage(Number(obj.emailTemplates?.last_page ?? 1));
        setTotal(Number(obj.emailTemplates?.total ?? 0));
        setFrom(Number(obj.emailTemplates?.from ?? 0));
        setTo(Number(obj.emailTemplates?.to ?? 0));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [filters, page, perPage, sortDirection, sortField],
  );

  React.useEffect(() => {
    void load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    setPage(1);
    void load({ page: 1 });
  };

  const clearFilters = () => {
    const next = { name: "", module_name: "" };
    setFilters(next);
    setShowFilters(false);
    setPage(1);
    setSortField("");
    setSortDirection("asc");
    void (async () => {
      // ensure state is applied before load
      await Promise.resolve();
      await load({ page: 1 });
    })();
  };

  const handleSort = (field: string) => {
    const direction = sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(direction);
    setPage(1);
    void (async () => {
      await Promise.resolve();
      await load({ page: 1 });
    })();
  };

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      <Card className="shadow-sm">
        <CardContent className="p-6 border-b bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <SearchInput
                value={filters.name}
                onChange={(v) => setFilters((p) => ({ ...p, name: v }))}
                onSearch={applyFilters}
                placeholder={t("Search email templates...")}
              />
            </div>
            <div className="flex items-center gap-3">
              <PerPageSelector
                value={perPage}
                onChange={(n) => {
                  setPerPage(n);
                  setPage(1);
                  void load({ page: 1, perPage: n });
                }}
              />
              <div className="relative">
                <FilterButton showFilters={showFilters} onToggle={() => setShowFilters((s) => !s)} />
                {activeFilterCount > 0 ? (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {activeFilterCount}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>

        {showFilters ? (
          <CardContent className="p-6 bg-primary/5 border-b">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">{t("Module")}</label>
                <select
                  value={filters.module_name}
                  onChange={(e) => setFilters((p) => ({ ...p, module_name: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">{t("Filter by module")}</option>
                  {allModules.map((m) => (
                    <option key={m} value={m}>
                      {getPackageAlias(m)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button size="sm" onClick={applyFilters}>
                  {t("Apply")}
                </Button>
                <Button size="sm" variant="outline" onClick={clearFilters}>
                  {t("Clear")}
                </Button>
              </div>
            </div>
          </CardContent>
        ) : null}

        <CardContent className="p-0">
          <div className="overflow-y-auto max-h-[70vh] w-full">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
                      {t("Name")}
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("module_name")}>
                      {t("Module")}
                    </TableHead>
                    <TableHead>{t("From")}</TableHead>
                    <TableHead className="text-right">{t("Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-sm text-muted-foreground">
                        {t("Loading...")}
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <NoRecordsFound
                          icon={Mail}
                          title={t("No email templates found")}
                          description={t("Email templates will appear here.")}
                          hasFilters={!!(filters.name || filters.module_name)}
                          onClearFilters={clearFilters}
                          className="h-auto"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.moduleName ? getPackageAlias(r.moduleName) : "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.from || "-"}</TableCell>
                        <TableCell className="text-right">
                          <TableActionButton
                            label={t("Edit")}
                            primaryHref={`/email-templates/${r.id}/edit`}
                            items={[
                              { label: t("Edit"), href: `/email-templates/${r.id}/edit`, icon: <Pencil className="h-4 w-4" /> },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>

        <CardContent className="px-4 py-2 border-t bg-muted/10">
          <Pagination
            page={page}
            lastPage={lastPage}
            total={total}
            from={from}
            to={to}
            onPageChange={(p) => {
              setPage(p);
              void load({ page: p });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

