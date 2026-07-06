"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseJsonResponse } from "@/lib/safe-fetch-json";
import { cn } from "@/lib/utils";

type CommentRow = { id: string; authorName: string; body: string; createdAt: string };

function formatCommentWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function PublicBlogCommentsSection({ postSlug, className }: { postSlug: string; className?: string }) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [hp, setHp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const u = new URL("/api/storefront/public/blog-comments", window.location.origin);
      u.searchParams.set("postSlug", postSlug);
      const res = await fetch(u.toString(), { credentials: "same-origin" });
      const data = await parseJsonResponse<{ ok?: boolean; comments?: CommentRow[]; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Could not load comments.");
      setComments(Array.isArray(data.comments) ? data.comments : []);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Could not load comments.");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [postSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/storefront/public/blog-comments", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postSlug,
          authorName: authorName.trim(),
          body: body.trim(),
          website: hp.trim() || undefined,
        }),
      });
      if (res.status === 204) {
        setSubmitting(false);
        return;
      }
      const data = await parseJsonResponse<{ ok?: boolean; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Could not submit.");
      setSubmitMessage(data.message ?? "Submitted.");
      setAuthorName("");
      setBody("");
      void load();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={cn("mt-14 border-t border-border/70 pt-12", className)} aria-labelledby="pf-blog-comments-heading">
      <h2 id="pf-blog-comments-heading" className="text-xl font-semibold tracking-tight">
        Comments
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Approved comments appear below. New submissions are reviewed by the store before they are published.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading comments…</p>
      ) : loadError ? (
        <p className="mt-6 text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : comments.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No comments yet. Be the first to share your thoughts.</p>
      ) : (
        <ul className="mt-8 space-y-6">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-border/60 bg-muted/20 px-4 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-foreground">{c.authorName}</span>
                <time className="text-xs text-muted-foreground" dateTime={c.createdAt}>
                  {formatCommentWhen(c.createdAt)}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form className="mt-10 space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <p className="text-sm font-medium text-foreground">Add a comment</p>
        <input
          type="text"
          name="website"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
        />
        <div className="space-y-2">
          <Label htmlFor="pf-blog-comment-name">Name</Label>
          <Input
            id="pf-blog-comment-name"
            name="authorName"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            maxLength={160}
            required
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pf-blog-comment-body">Comment</Label>
          <Textarea
            id="pf-blog-comment-body"
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={4000}
            required
            className="resize-y"
          />
        </div>
        {submitError ? (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}
        {submitMessage ? (
          <p className="text-sm text-muted-foreground" role="status">
            {submitMessage}
          </p>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit comment"}
        </Button>
      </form>
    </section>
  );
}
