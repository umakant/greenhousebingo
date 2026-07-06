"use client";

import * as React from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";

import { appConfirm } from "@/lib/app-confirm";
import { EM_WORKSPACE_NOTES_CHANGED_EVENT } from "@/lib/em-workspace-notes-events";
import { EmMatterWorkspaceShell } from "@/components/expense-management/em-matter-workspace-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { useTranslation } from "@/contexts/translation-context";
import { formatDateTime as fmtDateTimeLib } from "@/lib/format-date";
import { cn } from "@/lib/utils";

export type EmWorkspaceNoteRow = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string | null;
  createdByUserId: string | null;
  authorName: string;
};

function notifyNotesChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EM_WORKSPACE_NOTES_CHANGED_EVENT));
  }
}

function formatWhen(iso: string, settings: Record<string, string>) {
  return fmtDateTimeLib(iso, settings);
}

export function EmMatterNotesClient({
  permissions,
  currentUserId,
}: {
  permissions: string[];
  currentUserId?: string | null;
}) {
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);
  const appSettings = useAppSettingsOptional();
  const settings = appSettings?.settings ?? {};

  const canManage =
    permissions.includes("*") || permissions.includes("manage-expense-management");

  const [notes, setNotes] = React.useState<EmWorkspaceNoteRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/expense-management/workspace-notes?per_page=100", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as {
        data?: EmWorkspaceNoteRow[];
        error?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error || t("Failed to load notes."));
      setNotes(Array.isArray(json?.data) ? json.data : []);
    } catch (e: unknown) {
      setNotes([]);
      setLoadError(e instanceof Error ? e.message : t("Failed to load notes."));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function addNote() {
    const text = draft.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/expense-management/workspace-notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: text }),
      });
      const json = (await res.json().catch(() => null)) as { data?: EmWorkspaceNoteRow; error?: string } | null;
      if (!res.ok) throw new Error(json?.error || t("Failed to add note."));
      setDraft("");
      await load();
      notifyNotesChanged();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : t("Failed to add note."));
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(note: EmWorkspaceNoteRow) {
    setEditingId(note.id);
    setEditDraft(note.body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  async function saveEdit(id: string) {
    const text = editDraft.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/expense-management/workspace-notes/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: text }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || t("Failed to update note."));
      cancelEdit();
      await load();
      notifyNotesChanged();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : t("Failed to update note."));
    } finally {
      setSubmitting(false);
    }
  }

  async function removeNote(id: string) {
    if (!(await appConfirm(t("Delete this note?")))) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/expense-management/workspace-notes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || t("Failed to delete note."));
      if (editingId === id) cancelEdit();
      await load();
      notifyNotesChanged();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : t("Failed to delete note."));
    } finally {
      setSubmitting(false);
    }
  }

  function canEditNote(note: EmWorkspaceNoteRow) {
    if (canManage) return true;
    if (!currentUserId || !note.createdByUserId) return false;
    return note.createdByUserId === currentUserId;
  }

  return (
    <EmMatterWorkspaceShell active="notes" panelTitle={t("Notes")}>
      <div className="space-y-6">
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <Label htmlFor="em-new-note">{t("Add a note")}</Label>
          <Textarea
            id="em-new-note"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("Write an internal note for this operations workspace…")}
            rows={4}
            disabled={submitting}
            className="resize-y min-h-[100px] bg-background"
          />
          <div className="flex justify-end">
            <Button type="button" size="sm" disabled={submitting || !draft.trim()} onClick={() => void addNote()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("Add note")}
            </Button>
          </div>
        </div>

        {loadError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        ) : null}

        <div>
          <h3 className="text-sm font-medium text-foreground">{t("Activity log")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Internal notes for your organization. Newest entries appear first.")}
          </p>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t("Loading...")}
            </div>
          ) : notes.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("No notes yet. Add the first note above.")}</p>
          ) : (
            <ul className="mt-4 divide-y rounded-lg border">
              {notes.map((note) => {
                const isEditing = editingId === note.id;
                const edited =
                  note.updatedAt && note.updatedAt !== note.createdAt
                    ? t("edited")
                    : null;

                return (
                  <li key={note.id} className="p-4 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{note.authorName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatWhen(note.createdAt, settings)}
                          {edited ? (
                            <span className="ml-1">
                              · {edited} {formatWhen(note.updatedAt!, settings)}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      {canEditNote(note) && !isEditing ? (
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={t("Edit note")}
                            disabled={submitting}
                            onClick={() => startEdit(note)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label={t("Delete note")}
                            disabled={submitting}
                            onClick={() => void removeNote(note.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          rows={4}
                          disabled={submitting}
                          className="resize-y min-h-[80px]"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="outline" size="sm" disabled={submitting} onClick={cancelEdit}>
                            {t("Cancel")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={submitting || !editDraft.trim()}
                            onClick={() => void saveEdit(note.id)}
                          >
                            {t("Save")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className={cn("text-sm whitespace-pre-wrap text-foreground/90")}>{note.body}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </EmMatterWorkspaceShell>
  );
}
