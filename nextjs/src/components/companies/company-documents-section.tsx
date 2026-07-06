"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { useAppSettings } from "@/contexts/app-settings-context";
import { useTranslation } from "@/contexts/translation-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";

export type CompanyDocumentRow = {
  id: string;
  name: string;
  file_name: string;
  collection_name: string;
  mime_type: string;
  size: number;
  url: string;
  created_at: string;
};

type Props = {
  companyId: string;
};

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CompanyDocumentsSection({ companyId }: Props) {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);

  const [rows, setRows] = React.useState<CompanyDocumentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/documents`, { cache: "no-store" });
      const json = (await res.json()) as { documents?: CompanyDocumentRow[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to load documents");
      setRows(Array.isArray(json.documents) ? json.documents : []);
    } catch (e: unknown) {
      console.error(e);
      setRows([]);
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
          <div className="font-medium">{t("Documents")}</div>
          <p className="mt-1 text-xs text-muted-foreground">{t("Company documents tab description")}</p>
        </div>
      </div>
      <CompanySectionError message={loadError} />
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-3 text-left font-medium">{t("Name")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("File")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Collection")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Type")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("Size")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("Uploaded")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("Open")}</th>
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
                  {t("No documents yet")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-accent/20">
                  <td className="max-w-[200px] px-4 py-3 font-medium">
                    <span className="line-clamp-2" title={r.name}>
                      {r.name}
                    </span>
                  </td>
                  <td className="max-w-[180px] px-4 py-3 font-mono text-xs text-muted-foreground">
                    <span className="line-clamp-1" title={r.file_name}>
                      {r.file_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.collection_name || "—"}</td>
                  <td className="max-w-[140px] truncate px-4 py-3 text-xs text-muted-foreground" title={r.mime_type}>
                    {r.mime_type}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBytes(r.size)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {t("Open")}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        {t("Documents link hint")}{" "}
        <Link href="/media-library" className="text-primary hover:underline">
          {t("Media Library")}
        </Link>
      </div>
    </div>
  );
}
