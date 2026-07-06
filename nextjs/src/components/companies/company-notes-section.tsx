"use client";

import * as React from "react";
import Link from "next/link";

import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { useTranslation } from "@/contexts/translation-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";

export type CompanyNoteRow = {
  id: string;
  source: "task" | "bug";
  project_name: string;
  context_title: string;
  body: string;
  created_at: string;
};

type Props = {
  companyId: string;
};

export default function CompanyNotesSection({ companyId }: Props) {
  const { t } = useTranslation();
  const appSettings = useAppSettingsOptional();
  const settings = appSettings?.settings ?? {};
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);

  const [rows, setRows] = React.useState<CompanyNoteRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/notes`, { cache: "no-store" });
      const json = (await res.json()) as { notes?: CompanyNoteRow[]; error?: string };
      if (!res.ok) throw new Error(json.error || t("Failed to load notes."));
      setRows(Array.isArray(json.notes) ? json.notes : []);
    } catch (e: unknown) {
      console.error(e);
      setRows([]);
      setLoadError(e instanceof Error ? e.message : t("Failed to load notes."));
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
          <div className="font-medium">{t("Notes")}</div>
          <p className="mt-1 text-xs text-muted-foreground">{t("Company notes tab description")}</p>
        </div>
      </div>
      {loadError ? (
        <div className="px-4 py-10 text-center text-sm text-destructive">{loadError}</div>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-3 text-left font-medium">{t("Source")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Project")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Context")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Note")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Date")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  {t("Loading...")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  {t("No notes yet")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-accent/20">
                  <td className="px-4 py-3">
                    {r.source === "task" ? t("Task comment") : t("Bug comment")}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.project_name}</td>
                  <td className="max-w-[160px] px-4 py-3">
                    <span className="line-clamp-2" title={r.context_title}>
                      {r.context_title}
                    </span>
                  </td>
                  <td className="max-w-[min(28rem,50vw)] px-4 py-3 text-muted-foreground">
                    <span className="line-clamp-3 whitespace-pre-wrap" title={r.body}>
                      {r.body}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        {t("Notes link hint")}{" "}
        <Link href="/projects" className="text-primary hover:underline">
          {t("Projects")}
        </Link>
      </div>
    </div>
  );
}
