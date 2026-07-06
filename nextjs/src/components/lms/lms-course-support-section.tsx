"use client";

import * as React from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LessonOption = { id: string; title: string };

type ThreadEntry = {
  at: string;
  author: string;
  role: string;
  body: string;
};

type TicketRow = {
  id: string;
  ticketCode: string;
  subject: string;
  status: string;
  createdAt: string;
  lmsLesson?: { id: string; title: string } | null;
  thread?: ThreadEntry[];
};

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "closed") return "secondary";
  if (status === "in_progress") return "default";
  return "outline";
}

export function LmsCourseSupportSection({
  courseId,
  lessons,
  activeLessonId,
}: {
  courseId: string;
  lessons: LessonOption[];
  activeLessonId?: string | null;
}) {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<TicketRow[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<TicketRow | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [lessonId, setLessonId] = React.useState<string>(activeLessonId ?? "");
  const [reply, setReply] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (activeLessonId) setLessonId(activeLessonId);
  }, [activeLessonId]);

  const reloadList = React.useCallback(async () => {
    const res = await fetch(
      `/api/lms/student/course-support?courseId=${encodeURIComponent(courseId)}`,
      { credentials: "include", cache: "no-store" },
    );
    const data = (await res.json()) as { ok?: boolean; items?: TicketRow[] };
    if (res.ok && data.ok && Array.isArray(data.items)) setItems(data.items);
    else setItems([]);
  }, [courseId]);

  const loadDetail = React.useCallback(async (ticketId: string) => {
    const res = await fetch(`/api/lms/student/course-support/${encodeURIComponent(ticketId)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json()) as { ok?: boolean; ticket?: TicketRow };
    if (res.ok && data.ok && data.ticket) {
      setDetail(data.ticket);
      setSelectedId(ticketId);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      await reloadList();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadList]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/lms/student/course-support", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          lessonId: lessonId || undefined,
          subject,
          message,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; ticket?: TicketRow };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Submit failed");
      toast.success("Question submitted");
      setSubject("");
      setMessage("");
      setShowForm(false);
      await reloadList();
      if (data.ticket) void loadDetail(data.ticket.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/lms/student/course-support/${encodeURIComponent(selectedId)}/reply`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: reply }),
        },
      );
      const data = (await res.json()) as { ok?: boolean; message?: string; ticket?: TicketRow };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Reply failed");
      setReply("");
      if (data.ticket) setDetail(data.ticket);
      await reloadList();
      toast.success("Reply sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reply failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Course questions
        </CardTitle>
        <CardDescription>
          Ask your instructor a question about this course. Replies appear in the same thread.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={showForm ? "secondary" : "default"} onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "Ask a question"}
          </Button>
        </div>

        {showForm ? (
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-3 rounded-lg border border-border/60 p-4">
            <div className="space-y-2">
              <Label htmlFor="lms-st-subj">Subject</Label>
              <Input
                id="lms-st-subj"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Help with assignment 2"
                disabled={submitting}
                required
              />
            </div>
            {lessons.length > 0 ? (
              <div className="space-y-2">
                <Label>Related lesson (optional)</Label>
                <Select value={lessonId || "__none__"} onValueChange={(v) => setLessonId(v === "__none__" ? "" : v)} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lesson" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— General course question —</SelectItem>
                    {lessons.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="lms-st-msg">Your question</Label>
              <Textarea
                id="lms-st-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                disabled={submitting}
                required
                minLength={5}
              />
            </div>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit question
            </Button>
          </form>
        ) : null}

        {!loading && items.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground">No questions yet for this course.</p>
        ) : null}

        {items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    selectedId === t.id ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"
                  }`}
                  onClick={() => void loadDetail(t.id)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium truncate">{t.subject}</span>
                    <Badge variant={statusVariant(t.status)} className="text-[10px] shrink-0">
                      {t.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {t.ticketCode}
                    {t.lmsLesson ? ` · ${t.lmsLesson.title}` : ""}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {detail ? (
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">{detail.subject}</h4>
              <Badge variant={statusVariant(detail.status)}>{detail.status.replace("_", " ")}</Badge>
            </div>
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {(detail.thread ?? []).map((entry, i) => (
                <li key={i} className="rounded-md bg-background border border-border/50 p-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{entry.author}</span>
                    <span>{entry.role}{entry.at ? ` · ${new Date(entry.at).toLocaleString()}` : ""}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap">{entry.body}</p>
                </li>
              ))}
            </ul>
            {detail.status !== "closed" ? (
              <form onSubmit={(e) => void handleReply(e)} className="space-y-2">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Add a follow-up…"
                  rows={2}
                  disabled={submitting}
                />
                <Button type="submit" size="sm" disabled={submitting || !reply.trim()}>
                  Send reply
                </Button>
              </form>
            ) : (
              <p className="text-xs text-muted-foreground">This ticket is closed.</p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
