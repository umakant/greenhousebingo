"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Download, BarChart3, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";


function ResponseCellValue({ value }: { value: unknown }) {
  const s = value == null ? "" : String(value);
  if (s.startsWith("data:image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={s} alt="" className="max-h-20 max-w-[200px] object-contain rounded border bg-white" />
    );
  }
  return <span className="truncate block max-w-xs" title={s}>{s || "—"}</span>;
}

interface ResponseRow {
  id: string;
  formId: string;
  responseData: Record<string, any>;
  submitterIp: string | null;
  createdAt: string;
}

function PaginationBar({ page, lastPage, onChange }: { page: number; lastPage: number; onChange: (p: number) => void }) {
  if (lastPage <= 1) return null;
  const pages: (number | "...")[] = [];
  if (lastPage <= 7) {
    for (let i = 1; i <= lastPage; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 4) pages.push("...");
    for (let i = Math.max(2, page - 2); i <= Math.min(lastPage - 1, page + 2); i++) pages.push(i);
    if (page < lastPage - 3) pages.push("...");
    pages.push(lastPage);
  }
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1} className="px-3">Previous</Button>
      {pages.map((p, i) =>
        p === "..." ? <span key={`e-${i}`} className="px-2 text-muted-foreground text-sm">…</span> : (
          <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="w-8 px-0" onClick={() => onChange(p as number)}>{p}</Button>
        )
      )}
      <Button variant="outline" size="sm" onClick={() => onChange(page + 1)} disabled={page >= lastPage} className="px-3">Next</Button>
    </div>
  );
}

export default function FormBuilderResponses({ formId, permissions }: { formId: string; permissions: string[] }) {
  const router = useRouter();
  const { settings } = useAppSettings();
  const fmtDate = (d: string) => fmtDateLib(d, settings);
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-formbuilder");

  const [rows, setRows] = React.useState<ResponseRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [columns, setColumns] = React.useState<string[]>([]);

  async function load(p = 1) {
    setLoading(true);
    try {
      const res = await fetch(`/api/form-builder/forms/${formId}/responses?page=${p}&per_page=20`);
      const json = await res.json();
      const data: ResponseRow[] = json.data ?? [];
      setRows(data);
      setTotal(json.total ?? 0);
      setLastPage(json.last_page ?? 1);
      setPage(p);
      // Derive column keys from first response
      if (data.length > 0) {
        setColumns(Object.keys(data[0].responseData ?? {}));
      }
    } catch { toast.error(t("Failed to load responses")); } finally { setLoading(false); }
  }

  React.useEffect(() => { void load(); }, [formId]); // eslint-disable-line

  async function del(id: string) {
    if (!(await appConfirm(t("Delete this response?")))) return;
    const res = await fetch(`/api/form-builder/forms/${formId}/responses?response_id=${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error(t("Delete failed")); return; }
    toast.success(t("Response deleted"));
    await load(page);
  }

  async function clearAll() {
    if (!(await appConfirm(t("Delete ALL responses for this form? This cannot be undone.")))) return;
    const res = await fetch(`/api/form-builder/forms/${formId}/responses`, { method: "DELETE" });
    if (!res.ok) { toast.error(t("Delete failed")); return; }
    toast.success(t("All responses deleted"));
    await load(1);
  }

  function exportCSV() {
    if (rows.length === 0) return;
    const headers = [...columns, "Submitted At", "IP"];
    const csvRows = rows.map(r => {
      const vals = columns.map(c => {
        const v = r.responseData[c];
        return typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : String(v ?? "");
      });
      vals.push(fmtDate(r.createdAt));
      vals.push(r.submitterIp ?? "");
      return vals.join(",");
    });
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `form-responses-${formId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const from = total === 0 ? 0 : (page - 1) * 20 + 1;
  const to = Math.min(total, page * 20);

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardContent className="p-4 border-b bg-gray-50/50">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push("/form-builder")}>
                <ArrowLeft className="h-4 w-4 mr-1" />{t("Back")}
              </Button>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <BarChart3 className="h-4 w-4" />
                <span>{total} {t("responses")}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {rows.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-1" />{t("Export CSV")}
                </Button>
              )}
              {can("delete-formbuilder-form") && total > 0 && (
                <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={clearAll}>
                  <Trash2 className="h-4 w-4 mr-1" />{t("Clear All")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground border-b">
                <tr>
                  <th className="text-left font-medium px-4 py-3">#</th>
                  {columns.map(c => (
                    <th key={c} className="text-left font-medium px-4 py-3 whitespace-nowrap">{c}</th>
                  ))}
                  <th className="text-left font-medium px-4 py-3">{t("Submitted At")}</th>
                  {can("delete-formbuilder-form") && <th className="text-right font-medium px-4 py-3">{t("Actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={columns.length + 3} className="px-4 py-10 text-center text-muted-foreground">{t("Loading...")}</td></tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 3} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <BarChart3 className="h-10 w-10 text-gray-300" />
                        <p>{t("No responses yet. Share your form link to start collecting responses.")}</p>
                      </div>
                    </td>
                  </tr>
                ) : rows.map((row, idx) => (
                  <tr key={row.id} className="border-b hover:bg-accent/20">
                    <td className="px-4 py-3 text-muted-foreground">{from + idx}</td>
                    {columns.map(c => (
                      <td key={c} className="px-4 py-3 max-w-xs align-top">
                        <ResponseCellValue value={row.responseData[c]} />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {fmtDate(row.createdAt)}
                    </td>
                    {can("delete-formbuilder-form") && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => del(row.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-500 hover:text-red-600"
                          title={t("Delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>

        <CardContent className="px-4 py-3 border-t bg-gray-50/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">{t("Showing")} {from}–{to} {t("of")} {total} {t("results")}</div>
            <PaginationBar page={page} lastPage={lastPage} onChange={load} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
