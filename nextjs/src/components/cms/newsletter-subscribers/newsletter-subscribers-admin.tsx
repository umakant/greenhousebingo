"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableActionButton } from "@/components/ui/table-action-button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";


type SubscriberRow = {
  id: string;
  email: string;
  subscribedAt: string;
  ipAddress?: string | null;
  country?: string | null;
  city?: string | null;
  region?: string | null;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
};

export default function NewsletterSubscribersAdmin() {
  const { settings } = useAppSettings();
  const fmtDate = (s: string) => fmtDateLib(s, settings);
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<SubscriberRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [email, setEmail] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = email.trim() ? `/api/newsletter-subscribers?email=${encodeURIComponent(email.trim())}` : "/api/newsletter-subscribers";
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Failed to load subscribers.");
      setRows((json?.subscribers ?? []) as SubscriberRow[]);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [email]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    if (!(await appConfirm(t("Delete this subscriber?")))) return;
    try {
      const res = await fetch(`/api/newsletter-subscribers/${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Delete failed.");
      toast.success(t("Deleted."));
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed.");
    }
  };

  const exportCsv = async () => {
    try {
      const url = email.trim()
        ? `/api/newsletter-subscribers/export?email=${encodeURIComponent(email.trim())}`
        : "/api/newsletter-subscribers/export";
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e?.message || "Export failed.");
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
            <CardTitle>{t("Subscribers")}</CardTitle>
            <CardDescription>{t("People who subscribed via the public landing page.")}</CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />
            {t("Export CSV")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 w-full md:max-w-md">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("Filter by email...")} />
            <Button type="button" variant="outline" onClick={load} disabled={loading}>
              {t("Search")}
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Email")}</TableHead>
                  <TableHead>{t("Subscribed at")}</TableHead>
                  <TableHead>{t("Location")}</TableHead>
                  <TableHead>{t("Device")}</TableHead>
                  <TableHead className="text-right">{t("Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      {t("Loading...")}
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      {t("No subscribers found.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.email}</TableCell>
                      <TableCell className="text-muted-foreground">{fmtDate(r.subscribedAt)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {[r.city, r.region, r.country].filter(Boolean).join(", ") || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{[r.browser, r.os, r.device].filter(Boolean).join(" · ") || "-"}</TableCell>
                      <TableCell className="text-right">
                        <TableActionButton
                          label={t("Actions")}
                          items={[
                            {
                              label: t("Delete"),
                              destructive: true,
                              onSelect: () => remove(r.id),
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

