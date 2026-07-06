"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/translation-context";

type ApiItem = {
  id: string;
  createdAt: string;
  ip: string | null;
  userAgent: string;
  success: boolean;
};

export default function CompanyLoginActivitySection({
  companyId,
  hideChrome = false,
}: {
  companyId: string;
  /** When true, render only the table (for use inside a parent Card header). */
  hideChrome?: boolean;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<ApiItem[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          user_id: companyId,
          per_page: "20",
          page: "1",
        });
        const res = await fetch(`/api/login-history?${params}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          items?: ApiItem[];
          message?: string;
        } | null;
        if (cancelled) return;
        if (!res.ok || !json?.ok) {
          setError(json?.message ?? t("Failed to load login history."));
          setItems([]);
          return;
        }
        setItems(Array.isArray(json.items) ? json.items : []);
      } catch {
        if (!cancelled) {
          setError(t("Failed to load login history."));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, t]);

  const body = (
    <>
      {error ? (
        <div className={hideChrome ? "p-4 text-sm text-destructive" : "border-b p-4 text-sm text-destructive"}>
          {error}
        </div>
      ) : null}
      {!error ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium">{t("Date & time")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("IP address")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                    {t("Loading...")}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                    {t("No login history found.")}
                  </td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-accent/20">
                    <td className="whitespace-nowrap px-4 py-3">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.ip ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          r.success
                            ? "rounded-full bg-green-100 px-2 py-1 text-sm text-green-800"
                            : "rounded-full bg-red-100 px-2 py-1 text-sm text-red-800"
                        }
                      >
                        {r.success ? t("Success") : t("Failed")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );

  if (hideChrome) {
    return <div className="min-w-0">{body}</div>;
  }

  return (
    <div className="rounded-xl border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
        <div className="font-medium">{t("Sign-in activity")}</div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/login-history?user_id=${companyId}`}>{t("Open full login history")}</Link>
        </Button>
      </div>
      {body}
    </div>
  );
}
