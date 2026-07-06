"use client";

import * as React from "react";
import { Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export type LmsLiveSessionSheetMode = "create" | "edit";

export type LmsLiveSessionCourseOption = { id: string; title: string; slug: string };

export type LmsLiveSessionFormSession = {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  meetingProvider: string;
  meetingUrl: string | null;
  capacity: number | null;
  status: string;
};

const PROVIDERS = [
  { value: "ZOOM", label: "Zoom" },
  { value: "GOOGLE_MEET", label: "Google Meet" },
  { value: "MICROSOFT_TEAMS", label: "Microsoft Teams" },
  { value: "OTHER", label: "Other / manual link" },
] as const;

const STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED"] as const;

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

type LmsLiveSessionFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: LmsLiveSessionSheetMode;
  session?: LmsLiveSessionFormSession | null;
  courses: LmsLiveSessionCourseOption[];
  onSaved: () => void;
};

export function LmsLiveSessionFormSheet({
  open,
  onOpenChange,
  mode: initialMode,
  session: initialSession,
  courses,
  onSaved,
}: LmsLiveSessionFormSheetProps) {
  const [mode, setMode] = React.useState<LmsLiveSessionSheetMode>(initialMode);
  const [sessionId, setSessionId] = React.useState<string | undefined>();
  const [submitting, setSubmitting] = React.useState(false);

  const [courseId, setCourseId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startsAt, setStartsAt] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [meetingProvider, setMeetingProvider] = React.useState<string>("ZOOM");
  const [meetingUrl, setMeetingUrl] = React.useState("");
  const [capacity, setCapacity] = React.useState("");
  const [status, setStatus] = React.useState<string>("SCHEDULED");
  const [syncLesson, setSyncLesson] = React.useState(true);

  const resetCreate = React.useCallback(() => {
    setCourseId("");
    setTitle("");
    setDescription("");
    setStartsAt("");
    setEndsAt("");
    setMeetingProvider("ZOOM");
    setMeetingUrl("");
    setCapacity("");
    setStatus("SCHEDULED");
    setSyncLesson(true);
  }, []);

  const loadFromSession = React.useCallback((s: LmsLiveSessionFormSession) => {
    setCourseId(s.courseId);
    setTitle(s.title);
    setDescription(s.description ?? "");
    setStartsAt(toDatetimeLocal(s.startsAt));
    setEndsAt(toDatetimeLocal(s.endsAt));
    setMeetingProvider(s.meetingProvider || "ZOOM");
    setMeetingUrl(s.meetingUrl ?? "");
    setCapacity(s.capacity != null ? String(s.capacity) : "");
    setStatus(s.status || "SCHEDULED");
    setSyncLesson(false);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setSubmitting(false);
    if (initialMode === "edit" && initialSession) {
      setSessionId(initialSession.id);
      loadFromSession(initialSession);
      return;
    }
    setSessionId(undefined);
    resetCreate();
  }, [open, initialMode, initialSession, loadFromSession, resetCreate]);

  const sheetTitle =
    mode === "create"
      ? "New live session"
      : title.trim()
        ? `Edit live session — ${title.trim().slice(0, 48)}`
        : "Edit live session";

  const courseLabel = courses.find((c) => c.id === courseId)?.title;

  async function submit() {
    if (mode === "create" && !courseId) {
      toast.error("Course is required.");
      return;
    }
    if (!title.trim() || !startsAt || !endsAt) {
      toast.error("Title, start, and end are required.");
      return;
    }
    const startIso = fromDatetimeLocalValue(startsAt);
    const endIso = fromDatetimeLocalValue(endsAt);
    if (!startIso || !endIso) {
      toast.error("Invalid date/time.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "create") {
        const res = await fetch("/api/lms/live-sessions", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            title: title.trim(),
            description: description.trim() || null,
            startsAt: startIso,
            endsAt: endIso,
            meetingProvider,
            meetingUrl: meetingUrl.trim() || null,
            capacity: capacity.trim() ? Number(capacity) : null,
            syncLesson,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          session?: { id: string };
          message?: string;
        } | null;
        if (!res.ok || !data?.ok) {
          toast.error(data?.message ?? "Could not create session");
          return;
        }
        toast.success("Live session created");
        onSaved();
        if (data.session?.id) {
          setMode("edit");
          setSessionId(data.session.id);
        } else {
          onOpenChange(false);
        }
        return;
      }

      if (!sessionId) {
        toast.error("Session not found.");
        return;
      }
      const res = await fetch(`/api/lms/live-sessions/${sessionId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          startsAt: startIso,
          endsAt: endIso,
          meetingProvider,
          meetingUrl: meetingUrl.trim() || null,
          capacity: capacity.trim() ? Number(capacity) : null,
          status,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not update session");
        return;
      }
      toast.success("Live session saved");
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl lg:max-w-2xl">
        <SheetHeader className="shrink-0 border-b px-6 py-4 text-left">
          <SheetTitle>{sheetTitle}</SheetTitle>
          <SheetDescription>
            Attach to a course and optionally add a matching curriculum lesson for learners.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="grid gap-4 px-6 py-4">
            <div className="space-y-1.5">
              <Label>Course</Label>
              {mode === "edit" ? (
                <Input value={courseLabel ?? "—"} readOnly disabled className="bg-muted" />
              ) : (
                <Select value={courseId || "__none__"} onValueChange={(v) => setCourseId(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select…</SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Week 3 live workshop" />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Starts</Label>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Ends</Label>
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>
            {mode === "edit" ? (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st.charAt(0) + st.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Meeting provider</Label>
              <Select value={meetingProvider} onValueChange={setMeetingProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Meeting link</Label>
              <Input
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://zoom.us/j/… or https://meet.google.com/…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Session capacity (optional)</Label>
              <Input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Unlimited if empty"
              />
            </div>
            {mode === "create" ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={syncLesson}
                  onChange={(e) => setSyncLesson(e.target.checked)}
                  className="rounded"
                />
                Add published live lesson to course curriculum
              </label>
            ) : null}
          </div>
        </ScrollArea>

        <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" disabled={submitting} onClick={() => void submit()}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "create" ? "Creating…" : "Saving…"}
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                {mode === "create" ? "Create session" : "Save changes"}
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
