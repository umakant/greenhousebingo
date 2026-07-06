"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { LmsStarRatingDisplay, LmsStarRatingInput } from "@/components/lms/lms-star-rating";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type ReviewRow = {
  id: string;
  rating: number;
  body: string;
  status: string;
  createdAt: string;
  author: { name: string; avatar: string | null } | null;
};

type Summary = {
  averageRating: number | null;
  approvedCount: number;
};

export function LmsCourseReviewsSection({
  courseId,
  canSubmit = true,
  showSubmitForm = true,
}: {
  courseId: string;
  /** Allow review form (enrolled learners on course page). */
  canSubmit?: boolean;
  showSubmitForm?: boolean;
}) {
  const [loading, setLoading] = React.useState(true);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [items, setItems] = React.useState<ReviewRow[]>([]);
  const [myReview, setMyReview] = React.useState<ReviewRow | null>(null);
  const [canSubmitReview, setCanSubmitReview] = React.useState(false);
  const [rating, setRating] = React.useState(5);
  const [body, setBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lms/courses/${encodeURIComponent(courseId)}/reviews`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        summary?: Summary;
        items?: ReviewRow[];
        myReview?: ReviewRow | null;
        canSubmit?: boolean;
        message?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed to load reviews");
      setSummary(data.summary ?? null);
      setItems(data.items ?? []);
      setMyReview(data.myReview ?? null);
      setCanSubmitReview(Boolean(data.canSubmit) && canSubmit);
      if (data.myReview) {
        setRating(data.myReview.rating);
        setBody(data.myReview.body);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load reviews");
    } finally {
      setLoading(false);
    }
  }, [courseId, canSubmit]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lms/courses/${encodeURIComponent(courseId)}/reviews`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Submit failed");
      toast.success(data.message ?? "Review submitted for moderation");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reviews</CardTitle>
        <CardDescription>
          {summary?.approvedCount
            ? `${summary.approvedCount} review${summary.approvedCount === 1 ? "" : "s"}`
            : "No reviews yet"}
          {summary?.averageRating != null ? ` · ${summary.averageRating.toFixed(1)} average` : ""}
        </CardDescription>
        {summary?.averageRating != null ? (
          <div className="flex items-center gap-2 pt-1">
            <LmsStarRatingDisplay rating={summary.averageRating} size="md" />
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading reviews…
          </div>
        ) : null}

        {showSubmitForm && canSubmitReview ? (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 rounded-lg border border-border/60 p-4">
            <p className="text-sm font-medium">{myReview ? "Update your review" : "Write a review"}</p>
            <p className="text-xs text-muted-foreground">
              Reviews are moderated before they appear publicly. You must be enrolled in this course.
            </p>
            <LmsStarRatingInput value={rating} onChange={setRating} disabled={submitting} />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share what you learned and how the course helped you…"
              rows={4}
              disabled={submitting}
              maxLength={5000}
            />
            {myReview?.status === "PENDING" ? (
              <Badge variant="secondary">Your review is pending approval</Badge>
            ) : null}
            {myReview?.status === "REJECTED" ? (
              <Badge variant="destructive">Previous review was not approved — you can resubmit</Badge>
            ) : null}
            <Button type="submit" size="sm" disabled={submitting || body.trim().length < 10}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit review
            </Button>
          </form>
        ) : null}

        {!loading && items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No approved reviews yet.</p>
        ) : null}

        <ul className="space-y-4">
          {items.map((r) => (
            <li key={r.id} className="rounded-lg border border-border/50 bg-muted/10 p-4">
              <ReviewHeader review={r} />
              <p className="mt-2 text-sm whitespace-pre-wrap">{r.body}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ReviewHeader({ review: r }: { review: ReviewRow }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{r.author?.name ?? "Learner"}</span>
        <LmsStarRatingDisplay rating={r.rating} />
      </div>
      <span className="text-xs text-muted-foreground">
        {new Date(r.createdAt).toLocaleDateString()}
      </span>
    </div>
  );
}
