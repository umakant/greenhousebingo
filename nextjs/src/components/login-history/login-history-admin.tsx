"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "@/contexts/translation-context";

type HistoryItem = {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  ip: string | null;
  userAgent: string;
  type: string;
  success: boolean;
  createdAt: string;
  date: string;
};

type ApiResponse = {
  ok: boolean;
  page: number;
  perPage: number;
  total: number;
  filteredUser: { id: string; name: string | null; email: string | null } | null;
  items: HistoryItem[];
  message?: string;
};

function truncate(str: string, max: number) {
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1)}…`;
}

export default function LoginHistoryAdmin({
  initialUserId,
}: {
  initialUserId?: string | null;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(25);
  const [total, setTotal] = React.useState(0);
  const [items, setItems] = React.useState<HistoryItem[]>([]);
  const [filteredUser, setFilteredUser] = React.useState<
    ApiResponse["filteredUser"]
  >(null);

  const userId = (initialUserId ?? "").trim();

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", String(perPage));
      if (userId) params.set("user_id", userId);
      const res = await fetch(`/api/login-history?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message ?? t("Failed to load login history."));
      }
      setItems(Array.isArray(json.items) ? json.items : []);
      setTotal(json.total);
      setFilteredUser(json.filteredUser ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Something went wrong."));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, userId, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {userId ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <div>
            {filteredUser ? (
              <span>
                {t("Showing sign-ins for")}{" "}
                <span className="font-medium text-foreground">
                  {filteredUser.name ?? filteredUser.email ?? `#${filteredUser.id}`}
                </span>
                {filteredUser.email && filteredUser.name ? (
                  <span className="text-muted-foreground">
                    {" "}
                    ({filteredUser.email})
                  </span>
                ) : null}
              </span>
            ) : (
              <span>
                {t("Filtered by user ID:")} {userId}
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/login-history">{t("Show all logins")}</Link>
          </Button>
        </div>
      ) : null}

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/40 text-muted-foreground">
            <TableRow className="border-b hover:bg-transparent">
              {!userId ? (
                <TableHead className="px-4 py-3 h-auto font-medium">{t("User")}</TableHead>
              ) : null}
              <TableHead className="px-4 py-3 h-auto font-medium">{t("Date & time")}</TableHead>
              <TableHead className="px-4 py-3 h-auto font-medium">{t("IP address")}</TableHead>
              <TableHead className="min-w-[200px] max-w-md px-4 py-3 h-auto font-medium">
                {t("User agent")}
              </TableHead>
              <TableHead className="px-4 py-3 h-auto font-medium">{t("Status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={userId ? 4 : 5}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  {t("Loading...")}
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={userId ? 4 : 5}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  {t("No login history found.")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id} className="border-b hover:bg-accent/20">
                  {!userId ? (
                    <TableCell className="px-4 py-3 align-top">
                      <div className="font-medium">
                        {row.userName ?? row.userEmail ?? "—"}
                      </div>
                      {row.userEmail && row.userName ? (
                        <div className="text-xs text-muted-foreground">
                          {row.userEmail}
                        </div>
                      ) : null}
                    </TableCell>
                  ) : null}
                  <TableCell className="px-4 py-3 align-top whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top font-mono text-xs">
                    {row.ip ?? "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top max-w-md">
                    <span
                      className="block break-all text-xs text-muted-foreground"
                      title={row.userAgent || undefined}
                    >
                      {row.userAgent ? truncate(row.userAgent, 120) : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top">
                    <span
                      className={
                        row.success
                          ? "rounded-full bg-green-100 px-2 py-1 text-sm text-green-800"
                          : "rounded-full bg-red-100 px-2 py-1 text-sm text-red-800"
                      }
                    >
                      {row.success ? t("Success") : t("Failed")}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm text-muted-foreground">
          <div>
            {t("Showing")} {from} {t("to")} {to} {t("of")} {total}{" "}
            {t("results")}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              value={String(perPage)}
              onChange={(e) => {
                const next = Number(e.target.value || "25");
                setPerPage(next);
                setPage(1);
              }}
            >
              <option value="10">{t("10 per page")}</option>
              <option value="25">{t("25 per page")}</option>
              <option value="50">{t("50 per page")}</option>
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("Previous")}
            </Button>
            <span className="text-xs tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t("Next")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
