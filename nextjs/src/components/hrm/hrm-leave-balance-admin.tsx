"use client";

import * as React from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { HrmProjectsStyleListPage, type HrmViewMode } from "@/components/hrm/hrm-projects-style-list";
import { t } from "@/lib/admin-t";


type LeaveType = { id: string; name: string; daysAllowed: number };
type BalanceRow = {
  id: string;
  firstName: string;
  lastName?: string | null;
  employeeId?: string | null;
  balances: { leaveTypeId: string; leaveTypeName: string; allowed: number; used: number; remaining: number }[];
};

export default function HrmLeaveBalanceAdmin({ permissions: _permissions }: { permissions: string[] }) {
  const [items, setItems] = React.useState<BalanceRow[]>([]);
  const [leaveTypes, setLeaveTypes] = React.useState<LeaveType[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [year, setYear] = React.useState(String(new Date().getFullYear()));
  const [viewMode, setViewMode] = React.useState<HrmViewMode>("list");
  const [perPage, setPerPage] = React.useState(10);

  async function load(opts?: { nextPage?: number; nextPerPage?: number; nextSearch?: string; nextYear?: string }) {
    const p = opts?.nextPage ?? page;
    const pp = opts?.nextPerPage ?? perPage;
    const q = opts?.nextSearch !== undefined ? opts.nextSearch : search;
    const y = opts?.nextYear ?? year;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(pp), year: y });
      if (q.trim()) params.set("employee_search", q.trim());
      const res = await fetch(`/api/hrm/leave-balance?${params}`, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
      setPage(p);
      if (opts?.nextPerPage != null) setPerPage(pp);
      if (opts?.nextYear != null) setYear(y);
      setLeaveTypes(json.leave_types ?? []);
      setLastPage(typeof json.last_page === "number" ? json.last_page : Math.max(1, Math.ceil((json.total ?? 0) / pp)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const yearOptions = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 1 + i));
  const colCount = Math.max(1, leaveTypes.length) + 1;

  return (
    <div className="w-full min-w-0 space-y-4">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      <HrmProjectsStyleListPage
        searchPlaceholder={t("Search employees...")}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={() => {
          const q = searchInput.trim();
          setSearch(q);
          void load({ nextPage: 1, nextSearch: q });
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        perPage={perPage}
        onPerPageChange={(n) => void load({ nextPage: 1, nextPerPage: n })}
        activeFilterCount={0}
        filtersMenuContent={
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("Year")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={year}
              onValueChange={(v) => {
                setYear(v);
                void load({ nextPage: 1, nextYear: v });
              }}
            >
              {yearOptions.map((y) => (
                <DropdownMenuRadioItem key={y} value={y}>
                  {y}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        }
        onRefresh={() => void load()}
        refreshing={loading}
        page={page}
        lastPage={lastPage}
        total={total}
        from={from}
        to={to}
        onPageChange={(p) => void load({ nextPage: p })}
      >
        {viewMode === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Employee")}</th>
                  {leaveTypes.map((lt) => (
                    <th key={lt.id} className="whitespace-nowrap px-3 py-3 text-center font-medium text-muted-foreground">
                      {lt.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-10 text-center text-muted-foreground">
                      {t("Loading...")}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <BarChart3 className="h-10 w-10 text-gray-300" />
                        <div>{t("No data found")}</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {row.firstName} {row.lastName ?? ""}
                        </div>
                        {row.employeeId ? <div className="text-xs text-muted-foreground">{row.employeeId}</div> : null}
                      </td>
                      {leaveTypes.map((lt) => {
                        const b = row.balances.find((x) => x.leaveTypeId === lt.id);
                        return (
                          <td key={lt.id} className="px-3 py-3 text-center">
                            {b ? (
                              <div className="space-y-0.5 text-xs">
                                <div className="font-medium text-green-700">
                                  {b.remaining}/{b.allowed}
                                </div>
                                <div className="text-muted-foreground">
                                  {t("Used")}: {b.used}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">{t("Loading...")}</div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <BarChart3 className="h-10 w-10 text-gray-300" />
                <div>{t("No data found")}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((row) => (
                  <Card key={row.id} className="border-border/60 shadow-sm">
                    <CardContent className="space-y-3 p-4">
                      <div>
                        <div className="font-semibold">
                          {row.firstName} {row.lastName ?? ""}
                        </div>
                        {row.employeeId ? <p className="text-xs text-muted-foreground">{row.employeeId}</p> : null}
                      </div>
                      <ul className="space-y-1.5 border-t pt-3 text-xs">
                        {leaveTypes.map((lt) => {
                          const b = row.balances.find((x) => x.leaveTypeId === lt.id);
                          return (
                            <li key={lt.id} className="flex justify-between gap-2">
                              <span className="text-muted-foreground">{lt.name}</span>
                              {b ? (
                                <span className="font-medium text-green-700">
                                  {b.remaining}/{b.allowed} ({t("used")} {b.used})
                                </span>
                              ) : (
                                <span>—</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </HrmProjectsStyleListPage>
    </div>
  );
}
