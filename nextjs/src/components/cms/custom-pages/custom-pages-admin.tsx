"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TableActionButton } from "@/components/ui/table-action-button";
import { t } from "@/lib/admin-t";


type CustomPageRow = {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  isDisabled: boolean;
  updatedAt: string;
};

export default function CustomPagesAdmin() {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<CustomPageRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [q, setQ] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = q.trim() ? `/api/custom-pages?title=${encodeURIComponent(q.trim())}` : "/api/custom-pages";
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Failed to load pages.");
      setRows((json?.pages ?? []) as CustomPageRow[]);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [q]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const deletePage = async (id: string) => {
    if (!(await appConfirm(t("Delete this custom page?")))) return;
    try {
      const res = await fetch(`/api/custom-pages/${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Delete failed.");
      toast.success(t("Deleted."));
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed.");
    }
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{t("Custom Pages")}</CardTitle>
            <CardDescription>{t("Create and manage public custom pages.")}</CardDescription>
          </div>
          <Button asChild>
            <Link href="/custom-pages/create">{t("Create page")}</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2 w-full md:max-w-md">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search by title...")} />
              <Button type="button" variant="outline" onClick={load} disabled={loading}>
                {t("Search")}
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Title")}</TableHead>
                  <TableHead>{t("Slug")}</TableHead>
                  <TableHead>{t("Status")}</TableHead>
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
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">
                      {t("No pages found.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell className="text-muted-foreground">/page/{r.slug}</TableCell>
                      <TableCell>
                        {r.isActive ? <Badge variant="default">{t("Active")}</Badge> : <Badge variant="secondary">{t("Inactive")}</Badge>}
                        {r.isDisabled ? <Badge variant="outline" className="ml-2">{t("Locked")}</Badge> : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <TableActionButton
                          label={t("Edit")}
                          primaryHref={`/custom-pages/${r.id}/edit`}
                          items={[
                            {
                              label: t("Edit"),
                              href: `/custom-pages/${r.id}/edit`,
                              icon: <Pencil className="h-4 w-4" />,
                            },
                            {
                              label: t("Delete"),
                              destructive: true,
                              disabled: r.isDisabled,
                              onSelect: () => deletePage(r.id),
                              icon: <Trash2 className="h-4 w-4" />,
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

