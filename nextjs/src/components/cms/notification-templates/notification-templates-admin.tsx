"use client";

import * as React from "react";
import { Bell, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchInput } from "@/components/ui/search-input";
import { PerPageSelector } from "@/components/ui/per-page-selector";
import { Pagination } from "@/components/ui/pagination";
import NoRecordsFound from "@/components/no-records-found";
import { getPackageAlias } from "@/utils/package-alias";
import { t } from "@/lib/admin-t";


type NotificationRow = {
  id: string;
  type: string;
  action: string;
  module?: string | null;
};

export default function NotificationTemplatesAdmin() {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<NotificationRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [allTypes, setAllTypes] = React.useState<string[]>([]);

  const [activeType, setActiveType] = React.useState("");
  const [searchValue, setSearchValue] = React.useState("");
  const [perPage, setPerPage] = React.useState(10);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [from, setFrom] = React.useState(0);
  const [to, setTo] = React.useState(0);
  const [sortField, setSortField] = React.useState<string>("");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const load = React.useCallback(async (opts?: {
    type?: string;
    page?: number;
    perPage?: number;
    sort?: string;
    direction?: "asc" | "desc";
  }) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      const type = (opts?.type ?? activeType) || "";
      if (type) qs.set("type", type);
      if (searchValue.trim()) qs.set("action", searchValue.trim());
      qs.set("page", String(opts?.page ?? page));
      qs.set("per_page", String(opts?.perPage ?? perPage));
      const sort = (opts?.sort ?? sortField).trim();
      const dir = opts?.direction ?? sortDirection;
      if (sort) qs.set("sort", sort);
      qs.set("direction", dir);
      const res = await fetch(`/api/notification-templates?${qs.toString()}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => null)) as unknown;
      const obj = (json && typeof json === "object" ? (json as Record<string, unknown>) : null) as any;
      if (!res.ok || !obj?.ok) throw new Error(obj?.message || "Failed to load notification templates.");
      setAllTypes((obj?.allTypes ?? []) as string[]);
      setActiveType(String(obj?.activeType ?? ""));
      setRows((obj?.notificationTemplates?.data ?? []) as NotificationRow[]);
      setPage(Number(obj?.notificationTemplates?.current_page ?? 1));
      setLastPage(Number(obj?.notificationTemplates?.last_page ?? 1));
      setTotal(Number(obj?.notificationTemplates?.total ?? 0));
      setFrom(Number(obj?.notificationTemplates?.from ?? 0));
      setTo(Number(obj?.notificationTemplates?.to ?? 0));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeType, page, perPage, searchValue, sortDirection, sortField]);

  React.useEffect(() => {
    void load({ page: 1 });
    // Initial fetch only. Listing `load` here re-ran whenever `page` (and other deps) changed,
    // resetting to page 1 and racing in-flight requests — leaving the table stuck on "Loading...".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (type: string) => {
    setActiveType(type);
    setPage(1);
    void load({ type, page: 1 });
  };

  const handleSearch = () => {
    setPage(1);
    void load({ page: 1 });
  };

  const handleSort = (field: string) => {
    const direction = sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(direction);
    setPage(1);
    void load({ page: 1, sort: field, direction });
  };

  const availableTypes = React.useMemo(() => [...allTypes], [allTypes]);

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      {availableTypes.length > 0 ? (
        <div className="mb-4">
          <Tabs value={activeType} onValueChange={handleTabChange}>
            <TabsList>
              {availableTypes.map((type) => (
                <TabsTrigger key={type} value={type} className="capitalize">
                  {getPackageAlias(type)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      ) : null}

      <Card className="shadow-sm">
        <CardContent className="p-6 border-b bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <SearchInput value={searchValue} onChange={setSearchValue} onSearch={handleSearch} placeholder={t("Search notification templates...")} />
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
              <Button type="button" variant="outline" onClick={() => load({ page: 1 })} disabled={loading}>
                {t("Refresh")}
              </Button>
            </div>
          </div>
        </CardContent>

        <CardContent className="p-0">
          <div className="overflow-y-auto max-h-[70vh] w-full">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("action")}>
                      {t("Subject")}
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("module")}>
                      {t("Module")}
                    </TableHead>
                    <TableHead className="text-right">{t("Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-sm text-muted-foreground">
                        {t("Loading...")}
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <NoRecordsFound icon={Bell} title={t("No notification templates found")} description={t("Notification templates will appear here.")} className="h-auto" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.action || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.module ? getPackageAlias(r.module) : "-"}</TableCell>
                        <TableCell className="text-right">
                          <TableActionButton
                            label={t("Edit")}
                            primaryHref={`/notification-templates/${r.id}/edit`}
                            items={[{ label: t("Edit"), href: `/notification-templates/${r.id}/edit`, icon: <Pencil className="h-4 w-4" /> }]}
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

