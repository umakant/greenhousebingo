"use client";

import * as React from "react";
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";

import MediaPicker from "@/components/MediaPicker";
import { appConfirm } from "@/lib/app-confirm";
import { EmMatterWorkspaceShell } from "@/components/expense-management/em-matter-workspace-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/contexts/translation-context";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { formatDateTime as fmtDateTimeLib } from "@/lib/format-date";
import { EM_WORKSPACE_DOCUMENTS_CHANGED_EVENT } from "@/lib/em-workspace-events";
import { getImagePath } from "@/utils/image-path";

type DocRow = {
  id: string;
  title: string;
  fileUrl: string;
  createdAt: string;
  uploadedByName: string;
};

function notifyDocsChanged() {
  window.dispatchEvent(new Event(EM_WORKSPACE_DOCUMENTS_CHANGED_EVENT));
}

export function EmMatterDocumentsClient({ canEdit }: { canEdit: boolean }) {
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);
  const appSettings = useAppSettingsOptional();
  const settings = appSettings?.settings ?? {};

  const [docs, setDocs] = React.useState<DocRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [fileUrl, setFileUrl] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/expense-management/workspace-documents", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as { data?: DocRow[]; error?: string } | null;
      if (!res.ok) throw new Error(json?.error || t("Failed to load documents."));
      setDocs(json?.data ?? []);
    } catch (e: unknown) {
      setDocs([]);
      setError(e instanceof Error ? e.message : t("Failed to load documents."));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function addDocument() {
    const docTitle = title.trim();
    const url = fileUrl.trim();
    if (!docTitle || !url) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/expense-management/workspace-documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: docTitle, fileUrl: url }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || t("Failed to upload document."));
      setTitle("");
      setFileUrl("");
      await load();
      notifyDocsChanged();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("Failed to upload document."));
    } finally {
      setSubmitting(false);
    }
  }

  async function removeDoc(id: string) {
    if (!(await appConfirm(t("Delete this document?")))) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/expense-management/workspace-documents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(t("Failed to delete."));
      await load();
      notifyDocsChanged();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("Failed to delete."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <EmMatterWorkspaceShell active="documents" panelTitle={t("Documents")}>
      <div className="space-y-6">
        {canEdit ? (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
            <p className="text-sm font-medium">{t("Add document")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="em-doc-title">{t("Title")}</Label>
                <Input
                  id="em-doc-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={submitting}
                  placeholder={t("Document name")}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <MediaPicker
                  label={t("File")}
                  value={fileUrl}
                  onChange={(v) => setFileUrl(Array.isArray(v) ? v[0] ?? "" : v)}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                disabled={submitting || !title.trim() || !fileUrl.trim()}
                onClick={() => void addDocument()}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {t("Add document")}
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-sky-50/80 text-left">
                <th className="px-3 py-2 font-medium">{t("Title")}</th>
                <th className="px-3 py-2 font-medium">{t("Uploaded by")}</th>
                <th className="px-3 py-2 font-medium">{t("Date")}</th>
                <th className="px-3 py-2 font-medium">{t("File")}</th>
                {canEdit ? <th className="px-3 py-2 w-12" /> : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="px-3 py-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : docs.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="px-3 py-10 text-center text-muted-foreground">
                    {t("No records found")}
                  </td>
                </tr>
              ) : (
                docs.map((doc) => (
                  <tr key={doc.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{doc.title}</td>
                    <td className="px-3 py-2">{doc.uploadedByName}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDateTimeLib(doc.createdAt, settings)}</td>
                    <td className="px-3 py-2">
                      <a
                        href={getImagePath(doc.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t("Open")}
                      </a>
                    </td>
                    {canEdit ? (
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          disabled={submitting}
                          onClick={() => void removeDoc(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </EmMatterWorkspaceShell>
  );
}
