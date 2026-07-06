"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { LmsStarRatingDisplay } from "@/components/lms/lms-star-rating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseJsonResponse } from "@/lib/safe-fetch-json";

type Row = {
  id: string;
  rating: number;
  body: string;
  status: string;
  createdAt: string;
  author: { name: string; email?: string } | null;
};

export function LmsCourseReviewsModeration({ courseId }: { courseId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/lms/courses/${encodeURIComponent(courseId)}/reviews?moderation=1`,
        { credentials: "include", cache: "no-store" },
      );
      const data = await parseJsonResponse<{ ok?: boolean; items?: Row[]; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed to load reviews");
      setRows(data.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = useCallback(
    async (reviewId: string, status: "APPROVED" | "REJECTED") => {
      try {
        const res = await fetch(
          `/api/lms/courses/${encodeURIComponent(courseId)}/reviews/${encodeURIComponent(reviewId)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          },
        );
        const data = await parseJsonResponse<{ ok?: boolean; message?: string }>(res);
        if (!res.ok || !data.ok) throw new Error(data.message ?? "Update failed");
        void load();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    },
    [courseId, load],
  );

  const pending = rows.filter((r) => r.status === "PENDING");

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/15 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Course reviews</p>
        {pending.length > 0 ? (
          <Badge variant="secondary">{pending.length} pending</Badge>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Learner reviews are hidden until approved. Rejected reviews stay private; learners may resubmit.
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
        <p className="text-xs text-muted-foreground">No reviews for this course yet.</p>
      ) : null}
      <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {rows.map((r) => (
          <li key={r.id} className="rounded-md border border-border/50 bg-background p-3 text-xs shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-foreground">{r.author?.name ?? "Learner"}</span>
              <Badge
                variant={
                  r.status === "PENDING" ? "secondary" : r.status === "APPROVED" ? "default" : "destructive"
                }
              >
                {r.status}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <LmsStarRatingDisplay rating={r.rating} />
              <span className="text-[10px] text-muted-foreground">
                {new Date(r.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap text-muted-foreground">{r.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.status !== "APPROVED" ? (
                <Button type="button" size="sm" variant="secondary" onClick={() => void setStatus(r.id, "APPROVED")}>
                  Approve
                </Button>
              ) : null}
              {r.status !== "REJECTED" ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void setStatus(r.id, "REJECTED")}>
                  Reject
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
