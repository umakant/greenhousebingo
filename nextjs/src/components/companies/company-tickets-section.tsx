"use client";

import * as React from "react";
import Link from "next/link";

import { TableActionButton } from "@/components/ui/table-action-button";
import { Eye } from "lucide-react";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { useTranslation } from "@/contexts/translation-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";

export type CompanyTicketRow = {
  id: string;
  ticket_id: string;
  title: string;
  status: string;
  priority: string;
  category_name: string | null;
  created_at: string;
};

type Props = {
  companyId: string;
};

export default function CompanyTicketsSection({ companyId }: Props) {
  const { t } = useTranslation();
  const appSettings = useAppSettingsOptional();
  const settings = appSettings?.settings ?? {};
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);

  const [rows, setRows] = React.useState<CompanyTicketRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/tickets`, { cache: "no-store" });
      const json = (await res.json()) as { tickets?: CompanyTicketRow[]; error?: string };
      if (!res.ok) throw new Error(json.error || t("Failed to load tickets."));
      setRows(Array.isArray(json.tickets) ? json.tickets : []);
    } catch (e: unknown) {
      console.error(e);
      setRows([]);
      setLoadError(e instanceof Error ? e.message : t("Failed to load tickets."));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, [companyId]);

  return (
    <div className="rounded-xl border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <div className="font-medium">{t("Tickets")}</div>
          <p className="mt-1 text-xs text-muted-foreground">{t("Company tickets tab description")}</p>
        </div>
      </div>
      {loadError ? (
        <div className="px-4 py-10 text-center text-sm text-destructive">{loadError}</div>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-3 text-left font-medium">{t("Ticket ID")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Title")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Category")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Priority")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Status")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Created")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  {t("Loading...")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  {t("No tickets yet")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-accent/20">
                  <td className="px-4 py-3 font-mono text-xs">{r.ticket_id}</td>
                  <td className="max-w-[220px] px-4 py-3 font-medium">
                    <span className="line-clamp-2" title={r.title}>
                      {r.title}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.category_name ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{r.priority}</td>
                  <td className="px-4 py-3 capitalize">{r.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <TableActionButton
                      label={t("View")}
                      primaryHref={`/helpdesk-tickets/${r.id}`}
                      items={[
                        {
                          label: t("View"),
                          href: `/helpdesk-tickets/${r.id}`,
                          icon: <Eye className="h-4 w-4" />,
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        {t("Tickets link hint")}{" "}
        <Link href="/helpdesk-tickets" className="text-primary hover:underline">
          {t("Support Tickets")}
        </Link>
      </div>
    </div>
  );
}
