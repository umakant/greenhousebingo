"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableActionButton } from "@/components/ui/table-action-button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency as fmtCurrencyLib } from "@/lib/format-currency";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";

type TemplateRow = {
  id: string;
  name: string;
  total_amount: number;
  created_at: string | null;
};

export function SalesProposalTemplatesAdmin({ permissions }: { permissions: string[] }) {
  const router = useRouter();
  const canManage =
    permissions.includes("*") ||
    permissions.includes("manage-sales-proposals");
  const { settings } = useAppSettings();
  const formatCurrency = (n: number) => fmtCurrencyLib(n, settings);
  const formatDate = (s: string | null) => {
    if (!s) return "—";
    try {
      return fmtDateLib(s.slice(0, 10), settings);
    } catch {
      return s;
    }
  };

  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<TemplateRow[]>([]);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/sales-proposal-templates?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        templates?: { data: TemplateRow[]; meta: { total: number } };
      };
      if (!res.ok || !json?.ok) throw new Error(t("Failed to load templates."));
      setItems(json.templates?.data ?? []);
      setTotal(json.templates?.meta?.total ?? 0);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("Failed to load templates."));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("Delete this proposal template?"))) return;
    try {
      const res = await fetch(`/api/sales-proposal-templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !json?.ok) throw new Error(json?.message ?? t("Failed to delete template."));
      toast.success(t("Template deleted."));
      void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("Failed to delete template."));
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4 md:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                void load();
              }
            }}
            placeholder={t("Start typing to search")}
            className="pl-9"
          />
        </div>

        {canManage ? (
          <Button type="button" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
            <Link href="/sales-proposal-templates/create">
              <Plus className="mr-1 h-4 w-4" />
              {t("Add Proposal Template")}
            </Link>
          </Button>
        ) : null}

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">{t("Id")}</th>
                <th className="px-4 py-3">{t("Name")}</th>
                <th className="px-4 py-3">{t("Total")}</th>
                <th className="px-4 py-3">{t("Date")}</th>
                <th className="px-4 py-3 text-right">{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    {t("Loading...")}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    {t("No data available in table")}
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 tabular-nums">{row.id}</td>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(row.total_amount)}</td>
                    <td className="px-4 py-3">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {canManage ? (
                        <TableActionButton
                          label={t("Action")}
                          items={[
                            {
                              label: t("Edit"),
                              icon: <Pencil className="h-4 w-4" />,
                              href: `/sales-proposal-templates/${row.id}/edit`,
                            },
                            {
                              label: t("Use Template"),
                              onSelect: () => router.push(`/sales-proposals?create=1&template=${row.id}`),
                            },
                            {
                              label: t("Delete"),
                              icon: <Trash2 className="h-4 w-4" />,
                              destructive: true,
                              onSelect: () => void handleDelete(row.id),
                            },
                          ]}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>{t("Show")}</span>
            <Select
              value={String(perPage)}
              onValueChange={(v) => {
                setPerPage(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>{t("entries")}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              {t("Showing")} {from} {t("to")} {to} {t("of")} {total} {t("entries")}
            </span>
            <div className="flex gap-1">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
                {t("Previous")}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>
                {t("Next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
