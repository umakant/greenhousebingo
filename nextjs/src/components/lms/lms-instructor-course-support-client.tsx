"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ThreadEntry = { at: string; author: string; role: string; body: string };

type TicketRow = {
  id: string;
  ticketCode: string;
  subject: string;
  status: string;
  createdAt: string;
  lmsCourse?: { id: string; title: string } | null;
  lmsLesson?: { id: string; title: string } | null;
  lmsStudent?: { name: string } | null;
  thread?: ThreadEntry[];
};

type CourseOption = { id: string; title: string };

export function LmsInstructorCourseSupportClient({
  courses,
  initialCourseId,
}: {
  courses: CourseOption[];
  initialCourseId?: string | null;
}) {
  const [courseFilter, setCourseFilter] = React.useState(initialCourseId ?? "all");
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<TicketRow[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<TicketRow | null>(null);
  const [reply, setReply] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const qs =
        courseFilter && courseFilter !== "all"
          ? `?courseId=${encodeURIComponent(courseFilter)}`
          : "";
      const res = await fetch(`/api/lms/instructor/course-support${qs}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as { ok?: boolean; items?: TicketRow[]; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Load failed");
      setItems(data.items ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [courseFilter]);

  const loadDetail = React.useCallback(async (ticketId: string) => {
    const res = await fetch(`/api/lms/instructor/course-support/${encodeURIComponent(ticketId)}`, {
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
    void reload();
  }, [reload]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/lms/instructor/course-support/${encodeURIComponent(selectedId)}/reply`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: reply }),
        },
      );
      const data = (await res.json()) as { ok?: boolean; ticket?: TicketRow; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Reply failed");
      setReply("");
      if (data.ticket) setDetail(data.ticket);
      await reload();
      toast.success("Reply sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reply failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function closeTicket() {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/lms/instructor/course-support/${encodeURIComponent(selectedId)}/reply`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Marked resolved by instructor.", status: "closed" }),
        },
      );
      const data = (await res.json()) as { ok?: boolean; ticket?: TicketRow; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Update failed");
      if (data.ticket) setDetail(data.ticket);
      await reload();
      toast.success("Ticket closed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Learner questions</CardTitle>
          <CardDescription>Support tickets linked to your assigned courses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {courses.length > 1 ? (
            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assigned courses</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open questions.</p>
          ) : (
            <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {items.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                      selectedId === t.id ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"
                    }`}
                    onClick={() => void loadDetail(t.id)}
                  >
                    <div className="font-medium truncate">{t.subject}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t.lmsStudent?.name ?? "Learner"} · {t.lmsCourse?.title}
                      {t.lmsLesson ? ` · ${t.lmsLesson.title}` : ""}
                    </div>
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {t.status.replace("_", " ")}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversation</CardTitle>
        </CardHeader>
        <CardContent>
          {!detail ? (
            <p className="text-sm text-muted-foreground">Select a ticket to view and reply.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">{detail.subject}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {detail.ticketCode} · {detail.lmsStudent?.name}
                  {detail.lmsCourse ? (
                    <>
                      {" "}
                      ·{" "}
                      <Link
                        href={`/lms/courses?edit=${detail.lmsCourse.id}`}
                        className="underline underline-offset-2"
                      >
                        {detail.lmsCourse.title}
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
              <ul className="space-y-3 max-h-72 overflow-y-auto">
                {(detail.thread ?? []).map((entry, i) => (
                  <li
                    key={i}
                    className={`rounded-md border p-3 text-sm ${
                      entry.role === "instructor" ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/20"
                    }`}
                  >
                    <div className="text-xs text-muted-foreground flex justify-between gap-2">
                      <span className="font-medium text-foreground">{entry.author}</span>
                      <span>{entry.role}</span>
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
                    placeholder="Write your response…"
                    rows={4}
                    disabled={submitting}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="sm" disabled={submitting || !reply.trim()}>
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Send reply
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={submitting} onClick={() => void closeTicket()}>
                      Close ticket
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-xs text-muted-foreground">Ticket closed.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
