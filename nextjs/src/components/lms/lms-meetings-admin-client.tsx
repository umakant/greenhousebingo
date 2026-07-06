"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Video,
  VideoOff,
} from "lucide-react";
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
import { SearchInput } from "@/components/ui/search-input";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LIVE_JOIN_EARLY_MINUTES = 15;

type CourseOption = { id: string; title: string; slug: string };

type MeetingRow = {
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
  seatsUsed: number;
  course?: { id: string; title: string; slug: string };
};

type TimeFilter = "upcoming" | "today" | "past" | "all";

const PROVIDERS: Record<string, string> = {
  ZOOM: "Zoom",
  GOOGLE_MEET: "Google Meet",
  MICROSOFT_TEAMS: "Microsoft Teams",
  OTHER: "Other",
};

const STATUS_OPTIONS = ["SCHEDULED", "COMPLETED", "CANCELLED"] as const;

function toFormSession(row: MeetingRow): LmsLiveSessionFormSession {
  return {
    id: row.id,
    courseId: row.courseId,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    meetingProvider: row.meetingProvider,
    meetingUrl: row.meetingUrl,
    capacity: row.capacity,
    status: row.status,
  };
}

function providerLabel(p: string) {
  return PROVIDERS[p] ?? p.replace(/_/g, " ");
}

function formatStatus(v: string) {
  return v.charAt(0) + v.slice(1).toLowerCase();
}

function formatWhen(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  return `${start.toLocaleString()} – ${end.toLocaleString()}`;
}

function isJoinOpen(startsAt: string, endsAt: string, now = new Date()) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  const early = new Date(start.getTime() - LIVE_JOIN_EARLY_MINUTES * 60_000);
  return now >= early && now <= end;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function LmsMeetingsAdminClient() {
  const [loading, setLoading] = React.useState(true);
  const [sessions, setSessions] = React.useState<MeetingRow[]>([]);
  const [courses, setCourses] = React.useState<CourseOption[]>([]);
  const [search, setSearch] = React.useState("");
  const [courseFilter, setCourseFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [timeFilter, setTimeFilter] = React.useState<TimeFilter>("upcoming");

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetMode, setSheetMode] = React.useState<LmsLiveSessionSheetMode>("create");
  const [sheetSession, setSheetSession] = React.useState<LmsLiveSessionFormSession | null>(null);

  const loadSessions = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lms/live-sessions", { credentials: "include", cache: "no-store" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        items?: MeetingRow[];
        message?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Failed to load meetings");
        setSessions([]);
        return;
      }
      setSessions(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const openCreateSheet = React.useCallback(() => {
    setSheetMode("create");
    setSheetSession(null);
    setSheetOpen(true);
  }, []);

  const openEditSheet = React.useCallback((row: MeetingRow) => {
    setSheetMode("edit");
    setSheetSession(toFormSession(row));
    setSheetOpen(true);
  }, []);

  const stats = React.useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const scheduled = sessions.filter((s) => s.status === "SCHEDULED");
    const upcoming = scheduled.filter((s) => new Date(s.startsAt) >= now);
    const today = scheduled.filter((s) => {
      const start = new Date(s.startsAt);
      return start >= todayStart && start <= todayEnd;
    });
    const thisWeek = scheduled.filter((s) => {
      const start = new Date(s.startsAt);
      return start >= todayStart && start <= weekEnd;
    });
    const missingLink = scheduled.filter((s) => !s.meetingUrl?.trim());
    return { upcoming: upcoming.length, today: today.length, thisWeek: thisWeek.length, missingLink: missingLink.length };
  }, [sessions]);

  const filtered = React.useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const q = search.trim().toLowerCase();
    return sessions
      .filter((s) => {
        if (courseFilter && s.courseId !== courseFilter) return false;
        if (statusFilter && s.status !== statusFilter) return false;

        const start = new Date(s.startsAt);
        if (timeFilter === "upcoming") {
          if (s.status !== "SCHEDULED" || start < now) return false;
        } else if (timeFilter === "today") {
          if (start < todayStart || start > todayEnd) return false;
        } else if (timeFilter === "past") {
          if (start >= now && s.status === "SCHEDULED") return false;
        }

        if (!q) return true;
        return (
          s.title.toLowerCase().includes(q) ||
          (s.course?.title.toLowerCase().includes(q) ?? false) ||
          providerLabel(s.meetingProvider).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const cmp = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
        return timeFilter === "past" ? -cmp : cmp;
      });
  }, [sessions, search, courseFilter, statusFilter, timeFilter]);

  async function copyMeetingLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Meeting link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <div className="space-y-6">
      <LmsGoogleCalendarConnectCard returnTo="/lms/meetings" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarDays} label="Upcoming" value={stats.upcoming} hint="Scheduled sessions ahead" />
        <StatCard icon={Clock} label="Today" value={stats.today} hint="Sessions starting today" />
        <StatCard icon={Video} label="This week" value={stats.thisWeek} hint="Next 7 days" />
        <StatCard icon={VideoOff} label="Missing link" value={stats.missingLink} hint="Scheduled without URL" />
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Meetings
            </CardTitle>
            <CardDescription>
              Live sessions and office hours across your courses. Schedule video links, export to calendar, and join
              when it&apos;s time. Manage attendance from{" "}
              <Link href="/lms/classes" className="font-medium text-primary hover:underline">
                Classes
              </Link>
              .
            </CardDescription>
          </div>
          <Button type="button" onClick={openCreateSheet}>
            <Plus className="mr-2 h-4 w-4" />
            New meeting
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="min-w-0 flex-1 lg:max-w-sm">
              <SearchInput
                value={search}
                onChange={setSearch}
                onSearch={() => setSearch(search)}
                placeholder="Search meetings…"
                buttonLabel="Search"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[180px] space-y-1.5">
                <Label className="text-xs">Course</Label>
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
              <div className="min-w-[160px] space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All statuses</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatStatus(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading meetings…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <Video className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium">No meetings found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {timeFilter === "upcoming"
                  ? "Schedule a live session to get started."
                  : "Try a different filter or create a new meeting."}
              </p>
              <Button type="button" size="sm" className="mt-4" onClick={openCreateSheet}>
                <Plus className="mr-2 h-4 w-4" />
                New meeting
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meeting</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Calendar</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => {
                    const joinOpen = isJoinOpen(s.startsAt, s.endsAt);
                    const hasLink = Boolean(s.meetingUrl?.trim());
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => openEditSheet(s)}
                            className="text-left font-medium text-primary hover:underline"
                          >
                            {s.title}
                          </button>
                          {s.seatsUsed > 0 ? (
                            <p className="text-xs text-muted-foreground">{s.seatsUsed} enrolled</p>
                          ) : null}
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
                        <TableCell className="whitespace-nowrap text-xs">{formatWhen(s.startsAt, s.endsAt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{providerLabel(s.meetingProvider)}</TableCell>
                        <TableCell>
                          {hasLink ? (
                            <div className="flex flex-wrap gap-1">
                              {joinOpen ? (
                                <Button type="button" size="sm" variant="default" asChild>
                                  <a href={s.meetingUrl!} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                                    Join
                                  </a>
                                </Button>
                              ) : null}
                              <Button type="button" size="sm" variant="outline" onClick={() => void copyMeetingLink(s.meetingUrl!)}>
                                <Copy className="mr-1 h-3.5 w-3.5" />
                                Copy
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No link</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <MeetingStatusBadge status={s.status} joinOpen={joinOpen && hasLink} />
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
                        <TableCell className="text-right">
                          <Button type="button" size="sm" variant="ghost" onClick={() => openEditSheet(s)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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

function StatCard(props: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint: string;
}) {
  const Icon = props.icon;
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{props.value}</p>
          <p className="text-sm font-medium">{props.label}</p>
          <p className="text-xs text-muted-foreground">{props.hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MeetingStatusBadge(props: { status: string; joinOpen: boolean }) {
  if (props.joinOpen) {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Live now</Badge>;
  }
  const variant = props.status === "CANCELLED" ? "destructive" : props.status === "COMPLETED" ? "secondary" : "default";
  return <Badge variant={variant}>{formatStatus(props.status)}</Badge>;
}
