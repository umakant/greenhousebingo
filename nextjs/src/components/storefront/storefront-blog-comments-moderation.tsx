"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { parseJsonResponse } from "@/lib/safe-fetch-json";

type Row = { id: string; authorName: string; body: string; status: string; createdAt: string };

export function StorefrontBlogCommentsModeration({
  editorOpen,
  editingId,
  buildApiUrl,
}: {
  editorOpen: boolean;
  editingId: string | null;
  buildApiUrl: (pathname: string, extraSearch?: Record<string, string | undefined>) => string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!editingId) return;
    setLoading(true);
    setError(null);
    try {
      const path = buildApiUrl(`/api/storefront/blog-posts/${editingId}/comments`);
      const res = await fetch(path, { credentials: "same-origin" });
      const data = await parseJsonResponse<{ ok?: boolean; comments?: Row[]; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed to load comments");
      setRows(data.comments ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, editingId]);

  useEffect(() => {
    if (!editorOpen || !editingId) {
      setRows([]);
      setError(null);
      return;
    }
    void load();
  }, [editorOpen, editingId, load]);

  const setStatus = useCallback(
    async (id: string, status: "approved" | "rejected" | "spam") => {
      try {
        const path = buildApiUrl(`/api/storefront/blog-comments/${id}`);
        const res = await fetch(path, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const data = await parseJsonResponse<{ ok?: boolean; message?: string }>(res);
        if (!res.ok || !data.ok) throw new Error(data.message ?? "Update failed");
        void load();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    },
    [buildApiUrl, load],
  );

  if (!editingId) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/15 p-4">
      <p className="text-sm font-medium">Reader comments</p>
      <p className="text-xs text-muted-foreground">
        Submissions from the public blog page are pending until you approve them. Approved comments appear on the live
        post.
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
          <span className="text-xs">Loading…</span>
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments on this post yet.</p>
      ) : null}
      <ul className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {rows.map((r) => (
          <li key={r.id} className="rounded-md border border-border/50 bg-background p-3 text-xs shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-foreground">{r.authorName}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                {r.status}
              </span>
            </div>
            <p className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap text-muted-foreground">{r.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.status.toLowerCase() !== "approved" ? (
                <Button type="button" size="sm" variant="secondary" onClick={() => void setStatus(r.id, "approved")}>
                  Approve
                </Button>
              ) : null}
              {r.status.toLowerCase() !== "rejected" ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void setStatus(r.id, "rejected")}>
                  Reject
                </Button>
              ) : null}
              {r.status.toLowerCase() !== "spam" ? (
                <Button type="button" size="sm" variant="ghost" className="text-muted-foreground" onClick={() => void setStatus(r.id, "spam")}>
                  Spam
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
