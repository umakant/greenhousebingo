"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Pencil, Plus, Users, Video } from "lucide-react";
import { toast } from "sonner";

import { LmsCalendarExportActions } from "@/components/lms/lms-calendar-export-actions";
import { LmsGoogleCalendarConnectCard } from "@/components/lms/lms-google-calendar-connect-card";
import {
  LmsLiveSessionFormSheet,
  type LmsLiveSessionFormSession,
  type LmsLiveSessionSheetMode,
} from "@/components/lms/lms-live-session-form-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CourseOption = { id: string; title: string; slug: string };

type LiveSessionRow = {
  id: string;
  courseId: string;
  courseLessonId: string | null;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  meetingProvider: string;
  meetingUrl: string | null;
  capacity: number | null;
  status: string;
  seatsUsed: number;
  seatsRemaining: number | null;
  course?: { id: string; title: string; slug: string };
};

type AttendanceRow = {
  id: string;
  enrollmentId: string;
  status: string;
  joinedAt: string | null;
  student: { id: string; name: string | null; email: string | null };
};

const PROVIDERS = [
  { value: "ZOOM", label: "Zoom" },
  { value: "GOOGLE_MEET", label: "Google Meet" },
  { value: "MICROSOFT_TEAMS", label: "Microsoft Teams" },
  { value: "OTHER", label: "Other / manual link" },
] as const;

const ATTENDANCE_STATUSES = ["REGISTERED", "ATTENDED", "ABSENT"] as const;

function toFormSession(s: LiveSessionRow): LmsLiveSessionFormSession {
  return {
    id: s.id,
    courseId: s.courseId,
    title: s.title,
    description: s.description,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    meetingProvider: s.meetingProvider,
    meetingUrl: s.meetingUrl,
    capacity: s.capacity,
    status: s.status,
  };
}

export function LmsClassesAdminClient() {
  const [loading, setLoading] = React.useState(true);
  const [sessions, setSessions] = React.useState<LiveSessionRow[]>([]);
  const [courses, setCourses] = React.useState<CourseOption[]>([]);
  const [courseFilter, setCourseFilter] = React.useState("");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetMode, setSheetMode] = React.useState<LmsLiveSessionSheetMode>("create");
  const [sheetSession, setSheetSession] = React.useState<LmsLiveSessionFormSession | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [attendance, setAttendance] = React.useState<AttendanceRow[]>([]);
  const [attendanceLoading, setAttendanceLoading] = React.useState(false);

  const loadSessions = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (courseFilter) params.set("courseId", courseFilter);
      const qs = params.toString();
      const res = await fetch(`/api/lms/live-sessions${qs ? `?${qs}` : ""}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: LiveSessionRow[]; message?: string } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Failed to load sessions");
        setSessions([]);
        return;
      }
      setSessions(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [courseFilter]);

  React.useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch("/api/lms/courses", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: CourseOption[] } | null;
      if (res.ok && data?.ok && Array.isArray(data.items)) {
        setCourses(data.items.map((c) => ({ id: c.id, title: c.title, slug: c.slug })));
      }
    })();
  }, []);

  const loadAttendance = React.useCallback(async (sessionId: string) => {
    setAttendanceLoading(true);
    try {
      const res = await fetch(`/api/lms/live-sessions/${sessionId}/attendance`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: AttendanceRow[] } | null;
      if (res.ok && data?.ok) setAttendance(data.items ?? []);
      else setAttendance([]);
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedId) void loadAttendance(selectedId);
    else setAttendance([]);
  }, [selectedId, loadAttendance]);

  const selected = sessions.find((s) => s.id === selectedId) ?? null;

  const openCreateSheet = React.useCallback(() => {
    setSheetMode("create");
    setSheetSession(null);
    setSheetOpen(true);
  }, []);

  const openEditSheet = React.useCallback((session: LiveSessionRow) => {
    setSheetMode("edit");
    setSheetSession(toFormSession(session));
    setSheetOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      <LmsGoogleCalendarConnectCard returnTo="/lms/classes" />
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Live sessions
            </CardTitle>
            <CardDescription>
              Schedule live classes attached to courses. Set meeting links (Zoom, Google Meet, etc.), capacity limits,
              and track attendance per session.
            </CardDescription>
          </div>
          <Button type="button" onClick={openCreateSheet}>
            <Plus className="mr-2 h-4 w-4" />
            New session
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <Label className="text-xs">Filter by course</Label>
              <Select value={courseFilter || "__all__"} onValueChange={(v) => setCourseFilter(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All courses</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading sessions…
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No live sessions scheduled yet.</p>
          ) : (
            <SessionsTable
              sessions={sessions}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onEdit={openEditSheet}
            />
          )}
        </CardContent>
      </Card>

      {selected ? (
        <AttendanceCard
          session={selected}
          attendance={attendance}
          loading={attendanceLoading}
          onSeed={async () => {
            const res = await fetch(`/api/lms/live-sessions/${selected.id}/attendance`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "seed" }),
            });
            const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
            if (!res.ok || !data?.ok) {
              toast.error(data?.message ?? "Could not seed roster");
              return;
            }
            toast.success("Roster loaded from active enrollments");
            void loadAttendance(selected.id);
            void loadSessions();
          }}
          onStatusChange={async (attendanceId, status) => {
            const res = await fetch(`/api/lms/live-sessions/${selected.id}/attendance`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ attendanceId, status }),
            });
            const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
            if (!res.ok || !data?.ok) {
              toast.error(data?.message ?? "Could not update attendance");
              return;
            }
            void loadAttendance(selected.id);
            void loadSessions();
          }}
        />
      ) : null}

      <LmsLiveSessionFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        session={sheetSession}
        courses={courses}
        onSaved={() => void loadSessions()}
      />
    </div>
  );
}

function SessionsTable(props: {
  sessions: LiveSessionRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (session: LiveSessionRow) => void;
}) {
  const { sessions, selectedId, onSelect, onEdit } = props;
  return (
    <div className="overflow-x-auto rounded-md border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Session</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>When</TableHead>
            <TableHead>Seats</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Calendar</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((s) => (
            <TableRow key={s.id} className={selectedId === s.id ? "bg-muted/50" : undefined}>
              <TableCell>
                <SessionTitleCell session={s} onEdit={() => onEdit(s)} />
              </TableCell>
              <TableCell className="text-sm">
                {s.course ? (
                  <Link href={`/lms/courses?edit=${s.course.id}`} className="hover:underline">
                    {s.course.title}
                  </Link>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-xs whitespace-nowrap">
                {new Date(s.startsAt).toLocaleString()} – {new Date(s.endsAt).toLocaleTimeString()}
              </TableCell>
              <TableCell className="text-xs">
                {s.capacity != null ? (
                  <span>
                    {s.seatsUsed}/{s.capacity}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{s.seatsUsed} enrolled</span>
                )}
              </TableCell>
              <TableCell>
                <SessionStatusBadge status={s.status} />
              </TableCell>
              <TableCell>
                <LmsCalendarExportActions
                  session={{
                    id: s.id,
                    title: s.title,
                    description: s.description,
                    startsAt: s.startsAt,
                    endsAt: s.endsAt,
                    meetingUrl: s.meetingUrl,
                    courseTitle: s.course?.title ?? null,
                  }}
                  icsHref={`/api/lms/live-sessions/${s.id}/calendar.ics`}
                />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(s)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button type="button" size="sm" variant={selectedId === s.id ? "secondary" : "outline"} onClick={() => onSelect(s.id)}>
                    <Users className="mr-1 h-3.5 w-3.5" />
                    Attendance
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SessionTitleCell({ session: s, onEdit }: { session: LiveSessionRow; onEdit: () => void }) {
  return (
    <MotionSafeSessionTitleWrap>
      <button
        type="button"
        onClick={onEdit}
        className="text-left font-medium text-primary hover:underline"
      >
        {s.title}
      </button>
      {s.meetingProvider ? (
        <span className="text-xs text-muted-foreground">{providerLabel(s.meetingProvider)}</span>
      ) : null}
    </MotionSafeSessionTitleWrap>
  );
}

function MotionSafeSessionTitleWrap({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function providerLabel(p: string) {
  return PROVIDERS.find((x) => x.value === p)?.label ?? p;
}

function SessionStatusBadge({ status }: { status: string }) {
  const variant = status === "CANCELLED" ? "destructive" : status === "COMPLETED" ? "secondary" : "default";
  return <Badge variant={variant}>{status}</Badge>;
}

function AttendanceCard(props: {
  session: LiveSessionRow;
  attendance: AttendanceRow[];
  loading: boolean;
  onSeed: () => void;
  onStatusChange: (attendanceId: string, status: string) => void;
}) {
  const { session, attendance, loading, onSeed, onStatusChange } = props;
  const attended = attendance.filter((a) => a.status === "ATTENDED").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Attendance — {session.title}</CardTitle>
        <CardDescription>
          {attended} attended · {attendance.length} on roster
          {session.meetingUrl ? (
            <span className="ml-2">
              ·{" "}
              <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer" className="underline">
                Meeting link
              </a>
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button type="button" size="sm" variant="secondary" onClick={() => void onSeed()}>
          Load roster from enrollments
        </Button>
        {loading ? (
          <MotionSafeAttendanceLoading />
        ) : attendance.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attendance records. Load the roster or wait for learners to join.</p>
        ) : (
          <AttendanceTable rows={attendance} onStatusChange={onStatusChange} />
        )}
      </CardContent>
    </Card>
  );
}

function MotionSafeAttendanceLoading() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading attendance…
    </div>
  );
}

function AttendanceTable(props: {
  rows: AttendanceRow[];
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Learner</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="text-sm font-medium">{r.student.name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{r.student.email}</div>
              </TableCell>
              <TableCell>
                <Select value={r.status} onValueChange={(v) => props.onStatusChange(r.id, v)}>
                  <SelectTrigger className="h-8 w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTENDANCE_STATUSES.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-xs whitespace-nowrap">
                {r.joinedAt ? new Date(r.joinedAt).toLocaleString() : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
