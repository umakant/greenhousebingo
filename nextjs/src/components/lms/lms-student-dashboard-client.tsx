"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BookOpen,
  Calendar,
  ChevronRight,
  GraduationCap,
  HelpCircle,
  Loader2,
  MoreVertical,
  Play,
  TrendingUp,
  Trophy,
  Video,
} from "lucide-react";

import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { LmsEventsUpcomingCard, useLmsEventsSummary } from "@/components/lms/lms-events-summary-widget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatDurationLabel,
  type MyLearningCourseCard,
  type MyLearningTab,
} from "@/lib/lms-my-learning-hub-types";
import { lmsMyLearningCoursePath } from "@/lib/lms-my-learning-path";
import { cn } from "@/lib/utils";

type DashboardSummary = {
  enrolledCourseCount: number;
  accessibleCourseCount: number;
  averageProgressPercent: number;
  completedCourseCount: number;
};

type EnrolledCourseMeta = {
  courseId: string;
  publishedLessonCount: number;
};

type UpcomingSession = {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  liveStartsAt: string | null;
  liveEndsAt: string | null;
  externalLiveUrl: string | null;
};

type CertificateItem = {
  id: string;
  courseTitle: string;
  issuedAt: string | null;
};

type HubPayload = {
  summary: {
    enrolledCount: number;
    completedCount: number;
    inProgressCount: number;
    overdueCount: number;
    notStartedCount: number;
    overallProgressPercent: number;
  };
  continueLearning: {
    courseId: string;
    courseTitle: string;
    lessonId: string;
    lessonTitle: string;
    href: string;
  } | null;
  tabs: Record<MyLearningTab, MyLearningCourseCard[]>;
};

const TAB_LABELS: Record<MyLearningTab, string> = {
  in_progress: "In Progress",
  not_started: "Not Started",
  completed: "Completed",
  overdue: "Overdue",
};

function formatLastAccessed(iso: string | null): string {
  if (!iso) return "Not started yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Recently";
  return `Last accessed ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function formatSessionDate(iso: string): { month: string; day: string; weekday: string } {
  const d = new Date(iso);
  return {
    month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    day: String(d.getDate()).padStart(2, "0"),
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase(),
  };
}

function formatSessionTime(start: string, end: string | null): string {
  const s = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const startStr = s.toLocaleTimeString(undefined, opts);
  if (!end) return startStr;
  const e = new Date(end);
  return `${startStr} – ${e.toLocaleTimeString(undefined, opts)}`;
}

function CourseThumb({ title, coverImageUrl }: { title: string; coverImageUrl: string | null }) {
  if (coverImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-100 to-indigo-100 text-indigo-500">
      <GraduationCap className="h-8 w-8 opacity-70" aria-hidden />
      <span className="sr-only">{title}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: MyLearningTab }) {
  const map: Record<MyLearningTab, { label: string; className: string }> = {
    in_progress: { label: "In Progress", className: "bg-violet-100 text-violet-800" },
    not_started: { label: "Not Started", className: "bg-muted text-muted-foreground" },
    completed: { label: "Completed", className: "bg-emerald-100 text-emerald-800" },
    overdue: { label: "Overdue", className: "bg-red-100 text-red-800" },
  };
  const s = map[status];
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", s.className)}>{s.label}</span>;
}

export function LmsStudentDashboardClient() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [hub, setHub] = React.useState<HubPayload | null>(null);
  const [dashSummary, setDashSummary] = React.useState<DashboardSummary | null>(null);
  const [lessonCounts, setLessonCounts] = React.useState<Map<string, number>>(new Map());
  const [upcoming, setUpcoming] = React.useState<UpcomingSession[]>([]);
  const [certificates, setCertificates] = React.useState<CertificateItem[]>([]);
  const [tab, setTab] = React.useState<MyLearningTab>("in_progress");
  const { summary: eventsSummary } = useLmsEventsSummary();

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [hubRes, dashRes] = await Promise.all([
          fetch("/api/lms/my-learning", { credentials: "include", cache: "no-store" }),
          fetch("/api/lms/student/dashboard", { credentials: "include", cache: "no-store" }),
        ]);
        const hubData = (await hubRes.json().catch(() => null)) as ({ ok?: boolean } & Partial<HubPayload>) | null;
        const dashData = (await dashRes.json().catch(() => null)) as {
          ok?: boolean;
          message?: string;
          summary?: DashboardSummary;
          enrolledCourses?: EnrolledCourseMeta[];
          upcomingSessions?: UpcomingSession[];
          certificates?: { items?: CertificateItem[] };
        } | null;

        if (cancelled) return;
        if (!hubRes.ok || !hubData?.ok || !hubData.summary || !hubData.tabs) {
          setErr("Could not load dashboard.");
          return;
        }
        if (!dashRes.ok || !dashData?.ok) {
          setErr(dashData?.message ?? "Could not load dashboard.");
          return;
        }

        setHub(hubData as HubPayload);
        setDashSummary(dashData.summary ?? null);
        setUpcoming(Array.isArray(dashData.upcomingSessions) ? dashData.upcomingSessions : []);
        setCertificates(Array.isArray(dashData.certificates?.items) ? dashData.certificates!.items! : []);
        const counts = new Map<string, number>();
        for (const c of dashData.enrolledCourses ?? []) {
          counts.set(c.courseId, c.publishedLessonCount);
        }
        setLessonCounts(counts);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your dashboard…
      </div>
    );
  }

  if (err || !hub || !dashSummary) {
    return <p className="text-sm text-destructive">{err ?? "Could not load dashboard."}</p>;
  }

  const { continueLearning, tabs, summary: _hubSummary } = hub;
  const avgProgress = dashSummary.averageProgressPercent;

  return (
    <div className="space-y-6 pb-20">
      {/* Page intro */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Track your learning progress, enroll in courses, and earn certificates.
          </p>
        </div>
        <Button asChild className="shrink-0 gap-1 shadow-sm">
          <Link href="/lms/events">
            Browse Events
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Stat cards — same layout as Expense Management dashboard */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DashboardStatCard
          label="Enrolled Courses"
          value={dashSummary.enrolledCourseCount}
          sub={`${dashSummary.accessibleCourseCount} active enrollment${dashSummary.accessibleCourseCount === 1 ? "" : "s"}`}
          icon={<BookOpen className="h-8 w-8" />}
          href="/lms/my-learning"
        />
        <DashboardStatCard
          label="Average Progress"
          value={`${avgProgress}%`}
          sub="Keep up the good work!"
          icon={<TrendingUp className="h-8 w-8" />}
          href="/lms/my-learning"
        />
        <DashboardStatCard
          label="Completed Courses"
          value={dashSummary.completedCourseCount}
          sub={`${certificates.length || dashSummary.completedCourseCount} certificate${(certificates.length || dashSummary.completedCourseCount) === 1 ? "" : "s"} earned`}
          icon={<Trophy className="h-8 w-8" />}
          href="#certificates"
        />
        <DashboardStatCard
          label="Upcoming Sessions"
          value={upcoming.length}
          sub={`Live class${upcoming.length === 1 ? "" : "es"} this month`}
          icon={<Calendar className="h-8 w-8" />}
          href="#live-sessions"
        />
      </div>

      {/* Hero CTA */}
      <section className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 via-indigo-50/80 to-sky-50 p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
              <GraduationCap className="h-9 w-9 text-violet-600" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Keep learning, stay prepared!</h2>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                Complete your training to stay compliant and ready for every mission.
              </p>
            </div>
          </div>
          {continueLearning ? (
            <Button asChild size="lg" className="shrink-0 gap-2 shadow-md">
              <Link href={continueLearning.href}>
                <Play className="h-4 w-4 fill-current" />
                Continue Learning
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="shrink-0 gap-2 shadow-md">
              <Link href="/lms/my-learning">
                <Play className="h-4 w-4 fill-current" />
                Browse Courses
              </Link>
            </Button>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        {/* Your courses */}
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Your Courses</h3>
            <p className="text-sm text-muted-foreground">
              Progress is based on published lessons marked complete.
            </p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as MyLearningTab)}>
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
              {(Object.keys(TAB_LABELS) as MyLearningTab[]).map((key) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="rounded-none border-b-2 border-transparent px-4 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  {TAB_LABELS[key]} ({tabs[key].length})
                </TabsTrigger>
              ))}
            </TabsList>

            {(Object.keys(TAB_LABELS) as MyLearningTab[]).map((key) => (
              <TabsContent key={key} value={key} className="mt-4 space-y-3">
                {tabs[key].length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
                    No {TAB_LABELS[key].toLowerCase()} courses yet.{" "}
                    <Link href="/lms/my-learning" className="text-primary hover:underline">
                      Browse the catalog
                    </Link>
                  </div>
                ) : (
                  tabs[key].map((course) => (
                    <CourseRow
                      key={course.courseId}
                      course={course}
                      lessonCount={lessonCounts.get(course.courseId) ?? 0}
                      onContinue={() => router.push(course.href)}
                    />
                  ))
                )}
                {tabs[key].length > 0 ? (
                  <Link
                    href="/lms/my-learning"
                    className="flex items-center justify-center gap-1 py-2 text-sm font-medium text-primary hover:underline"
                  >
                    View All My Courses
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </TabsContent>
            ))}
          </Tabs>
        </section>

        {/* Right sidebar */}
        <aside className="space-y-4">
          <Card id="live-sessions" className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Upcoming Live Sessions</CardTitle>
              <Link href="/lms/student/calendar" className="text-xs font-medium text-primary hover:underline">
                View Calendar
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming live sessions.</p>
              ) : (
                upcoming.slice(0, 4).map((s) => (
                  <LiveSessionRow key={`${s.courseId}-${s.lessonId}`} session={s} />
                ))
              )}
            </CardContent>
          </Card>

          <Card id="certificates" className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Certificates</CardTitle>
              <Link href="/lms/certificates" className="text-xs font-medium text-primary hover:underline">
                Event certificates
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {certificates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center">
                  <Award className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden />
                  <p className="mt-2 text-sm font-medium">No certificates yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Complete a course to earn your first certificate.
                  </p>
                </div>
              ) : (
                certificates.slice(0, 3).map((cert) => (
                  <CertificateRow key={cert.id} cert={cert} />
                ))
              )}
            </CardContent>
          </Card>

          {eventsSummary ? <LmsEventsUpcomingCard summary={eventsSummary} className="shadow-sm" /> : null}
        </aside>
      </div>

      {/* Quick links bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:pl-[var(--sidebar-width,0px)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-1 px-4 py-2 sm:gap-4">
          <QuickLink href="/lms/events" icon={Calendar} label="Browse Events" />
          <QuickLink href="/lms/my-learning" icon={BookOpen} label="Browse All Courses" />
          <QuickLink href="/lms/my-events" icon={Calendar} label="My Events" />
          <QuickLink href="/lms/certificates" icon={Award} label="Certificates" />
          <QuickLink href="/lms/support" icon={HelpCircle} label="Training Support" />
        </div>
      </div>
    </div>
  );
}

function CourseRow(props: {
  course: MyLearningCourseCard;
  lessonCount: number;
  onContinue: () => void;
}) {
  const { course, lessonCount } = props;
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-center">
      <div className="h-24 w-full shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-32">
        <CourseThumb title={course.title} coverImageUrl={course.coverImageUrl} />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold leading-snug">{course.title}</h4>
          <StatusBadge status={course.status} />
        </div>
        {course.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {course.totalDurationMinutes > 0 ? (
            <span>{formatDurationLabel(course.totalDurationMinutes).replace(" total", "")}</span>
          ) : null}
          {lessonCount > 0 ? <span>{lessonCount} Lessons</span> : null}
        </div>
        {course.status !== "not_started" && course.status !== "completed" ? (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{formatLastAccessed(course.lastAccessedAt)}</span>
              <span className="font-medium tabular-nums">{course.progressPercent}%</span>
            </div>
            <Progress value={course.progressPercent} className="h-2" />
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
        <Button type="button" size="sm" onClick={props.onContinue}>
          {course.status === "completed" ? "Review" : "Continue"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={course.href}>Open course</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function LiveSessionRow({ session }: { session: UpcomingSession }) {
  if (!session.liveStartsAt) return null;
  const dateParts = formatSessionDate(session.liveStartsAt);
  return (
    <div className="flex gap-3 rounded-lg border border-border/60 p-3">
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-violet-50 text-violet-700">
        <span className="text-[10px] font-semibold leading-none">{dateParts.month}</span>
        <span className="text-lg font-bold leading-tight">{dateParts.day}</span>
        <span className="text-[9px] font-medium leading-none opacity-80">{dateParts.weekday}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-semibold">{session.lessonTitle}</p>
        <p className="text-xs text-muted-foreground">{formatSessionTime(session.liveStartsAt, session.liveEndsAt)}</p>
        <p className="text-xs text-muted-foreground">{session.courseTitle}</p>
        {session.externalLiveUrl ? (
          <Button asChild size="sm" variant="secondary" className="mt-1 h-7 text-xs">
            <a href={session.externalLiveUrl} target="_blank" rel="noopener noreferrer">
              <Video className="mr-1 h-3 w-3" />
              Live Class
            </a>
          </Button>
        ) : (
          <Button asChild size="sm" variant="secondary" className="mt-1 h-7 text-xs">
            <Link href={lmsMyLearningCoursePath({ id: session.courseId, slug: session.courseSlug })}>
              Live Class
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function CertificateRow({ cert }: { cert: CertificateItem }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <Award className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{cert.courseTitle}</p>
          {cert.issuedAt ? (
            <p className="text-xs text-muted-foreground">
              Issued {new Date(cert.issuedAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            </p>
          ) : null}
          <button
            type="button"
            className="mt-1 text-xs font-medium text-primary hover:underline"
            onClick={() => {
              /* download coming soon */
            }}
          >
            Download Certificate
          </button>
        </div>
        <span className="shrink-0 self-start rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
          Earned
        </span>
      </div>
    </div>
  );
}

function QuickLink(props: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  const Icon = props.icon;
  return (
    <Link
      href={props.href}
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground sm:text-sm"
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {props.label}
    </Link>
  );
}
