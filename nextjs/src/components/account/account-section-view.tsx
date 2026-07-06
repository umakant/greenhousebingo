"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import NoRecordsFound from "@/components/no-records-found";
import { Pagination } from "@/components/ui/pagination";
import { FileQuestion } from "lucide-react";
import { t } from "@/lib/admin-t";

type ApiSection = "bank-accounts" | "chart-of-accounts";

const SECTION_API_MAP: Record<ApiSection, string> = {
  "bank-accounts": "/api/account/bank-accounts",
  "chart-of-accounts": "/api/account/chart-of-accounts",
};

const BANK_ACCOUNTS_COLUMNS = [
  { key: "account_number", label: t("Account Number") },
  { key: "account_name", label: t("Account Name") },
  { key: "bank_name", label: t("Bank Name") },
  { key: "current_balance", label: t("Current Balance") },
  { key: "is_active", label: t("Active") },
];

const CHART_COLUMNS = [
  { key: "account_code", label: t("Code") },
  { key: "account_name", label: t("Account Name") },
  { key: "normal_balance", label: t("Normal Balance") },
  { key: "current_balance", label: t("Current Balance") },
  { key: "is_active", label: t("Active") },
];

function formatMoney(val: unknown): string {
  const n = Number(typeof val === "string" ? val.replace(/,/g, "") : val);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function AccountSectionView({ section, title }: { section: string; title: string }) {
  const apiSection = section as ApiSection;
  const apiUrl = SECTION_API_MAP[apiSection];

  if (!apiUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {t("This section mirrors Laravel Account module. Full CRUD and reports will be added incrementally. See docs/ACCOUNTING-PARITY.md.")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const columns = section === "bank-accounts" ? BANK_ACCOUNTS_COLUMNS : CHART_COLUMNS;
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = React.useState(0);
  const [lastPage, setLastPage] = React.useState(1);

  const load = React.useCallback(
    (opts?: { nextPage?: number }) => {
      setLoading(true);
      setError(null);
      const p = opts?.nextPage ?? page;
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("per_page", String(perPage));
      if (search.trim()) params.set("search", search.trim());
      fetch(`${apiUrl}?${params.toString()}`, { credentials: "include", cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load");
          return res.json();
        })
        .then((json: { data?: Record<string, unknown>[]; total?: number; last_page?: number }) => {
          setData(Array.isArray(json.data) ? json.data : []);
          setTotal(Number(json.total) ?? 0);
          setLastPage(Number(json.last_page) ?? 1);
          if (opts?.nextPage != null) setPage(opts.nextPage);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Error"))
        .finally(() => setLoading(false));
    },
    [apiUrl, page, perPage, search]
  );

  React.useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => load({ nextPage: 1 });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SearchInput
              value={search}
              onChange={setSearch}
              onSearch={handleSearch}
              placeholder={t("Search...")}
              buttonLabel={t("Search")}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-destructive text-sm mb-4">{error}</p>
        )}
        {loading ? (
          <p className="text-muted-foreground py-8 text-center">{t("Loading...")}</p>
        ) : data.length === 0 ? (
          <NoRecordsFound
            icon={FileQuestion}
            title={t("No records found")}
            description={t("Data will appear when records exist. Create them from Laravel or add APIs here.")}
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key} className="text-left font-medium px-4 py-3">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={(row.id as string) ?? idx} className="border-t">
                      {columns.map((col) => {
                        const val = row[col.key];
                        if (col.key === "current_balance" && (typeof val === "string" || typeof val === "number")) {
                          return (
                            <td key={col.key} className="px-4 py-3">
                              {formatMoney(val)}
                            </td>
                          );
                        }
                        if (col.key === "is_active") {
                          return (
                            <td key={col.key} className="px-4 py-3">
                              {val ? t("Yes") : t("No")}
                            </td>
                          );
                        }
                        return (
                          <td key={col.key} className="px-4 py-3">
                            {val != null ? String(val) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {lastPage > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t("Showing")} {(page - 1) * perPage + 1} {t("to")} {Math.min(page * perPage, total)} {t("of")} {total}
                </p>
                <Pagination
                  page={page}
                  lastPage={lastPage}
                  total={total}
                  from={(page - 1) * perPage + 1}
                  to={Math.min(page * perPage, total)}
                  onPageChange={(p) => load({ nextPage: p })}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
