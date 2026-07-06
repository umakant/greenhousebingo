"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  MoreVertical,
  Play,
} from "lucide-react";
import { toast } from "sonner";

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
import { formatDurationLabel, type MyLearningCourseCard, type MyLearningTab } from "@/lib/lms-my-learning-hub-types";
import { lmsMyLearningCoursePath } from "@/lib/lms-my-learning-path";
import { cn } from "@/lib/utils";

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
  recommended: MyLearningCourseCard[];
  deadlines: Array<{
    courseId: string;
    title: string;
    dueDate: string;
    daysRemaining: number;
    href: string;
  }>;
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

function formatDueDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-white/40" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="text-primary transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold tabular-nums">{percent}%</span>
      </div>
    </div>
  );
}

function CourseThumb({ title, coverImageUrl }: { title: string; coverImageUrl: string | null }) {
  if (coverImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-100 to-indigo-100 text-indigo-400">
      <GraduationCap className="h-8 w-8 opacity-70" aria-hidden />
      <span className="sr-only">{title}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: MyLearningTab }) {
  const map: Record<MyLearningTab, { label: string; className: string }> = {
    in_progress: { label: "In Progress", className: "bg-sky-100 text-sky-800" },
    not_started: { label: "Not Started", className: "bg-muted text-muted-foreground" },
    completed: { label: "Completed", className: "bg-emerald-100 text-emerald-800" },
    overdue: { label: "Overdue", className: "bg-red-100 text-red-800" },
  };
  const s = map[status];
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", s.className)}>{s.label}</span>;
}

function EnrolledCourseRow({ course, onContinue }: { course: MyLearningCourseCard; onContinue: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-center">
      <div className="h-24 w-full shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-32">
        <CourseThumb title={course.title} coverImageUrl={course.coverImageUrl} />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold leading-snug">{course.title}</h3>
          <StatusBadge status={course.status} />
        </div>
        {course.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {course.totalDurationMinutes > 0 ? (
            <span>{formatDurationLabel(course.totalDurationMinutes)}</span>
          ) : null}
          <span>{formatLastAccessed(course.lastAccessedAt)}</span>
        </div>
        {course.status !== "not_started" && course.status !== "completed" ? (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium tabular-nums">{course.progressPercent}%</span>
            </div>
            <Progress value={course.progressPercent} className="h-2" />
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
        {course.enrollmentId ? (
          <Button type="button" size="sm" onClick={onContinue}>
            {course.status === "completed" ? "Review" : "Continue"}
          </Button>
        ) : null}
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

function RecommendedCard({
  course,
  enrolling,
  onEnroll,
}: {
  course: MyLearningCourseCard;
  enrolling: boolean;
  onEnroll: () => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
      <div className="aspect-[16/10] w-full overflow-hidden">
        <CourseThumb title={course.title} coverImageUrl={course.coverImageUrl} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-semibold leading-snug">{course.title}</h3>
        {course.description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">{course.description}</p>
        ) : null}
        {course.totalDurationMinutes > 0 ? (
          <p className="text-xs text-muted-foreground">{formatDurationLabel(course.totalDurationMinutes)}</p>
        ) : null}
        <button
          type="button"
          className="mt-auto pt-2 text-left text-sm font-medium text-primary hover:underline"
          disabled={enrolling}
          onClick={onEnroll}
        >
          {enrolling ? "Enrolling…" : "Start Course"}
        </button>
      </div>
    </div>
  );
}

export function LmsMyLearningHubClient() {
  const router = useRouter();
  const [data, setData] = React.useState<HubPayload | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [enrollingId, setEnrollingId] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<MyLearningTab>("in_progress");
  const { summary: eventsSummary } = useLmsEventsSummary();

  const reload = React.useCallback(async () => {
    setErr(null);
    const res = await fetch("/api/lms/my-learning", { credentials: "include", cache: "no-store" });
    const json = (await res.json().catch(() => null)) as ({ ok?: boolean; message?: string } & Partial<HubPayload>) | null;
    if (!res.ok || !json?.ok || !json.summary) {
      setErr(json?.message ?? "Could not load My Learning.");
      setData(null);
      return;
    }
    setData(json as HubPayload);
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function handleEnroll(courseId: string, courseSlug: string) {
    setEnrollingId(courseId);
    try {
      const res = await fetch(`/api/lms/courses/${courseId}/self-enroll`, {
        method: "POST",
        credentials: "include",
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !body?.ok) {
        toast.error(body?.message ?? "Enrollment failed");
        return;
      }
      toast.success("You are enrolled");
      await reload();
      router.push(lmsMyLearningCoursePath({ id: courseId, slug: courseSlug }));
    } finally {
      setEnrollingId(null);
    }
  }

  if (data === null && !err) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your learning dashboard…
      </div>
    );
  }

  if (err || !data) {
    return <p className="text-sm text-destructive">{err ?? "Could not load My Learning."}</p>;
  }

  const { summary, continueLearning, tabs, recommended, deadlines } = data;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-indigo-50/80 to-violet-50 p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
              <GraduationCap className="h-9 w-9 text-indigo-600" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Keep learning, stay prepared</h2>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                Complete your training to stay compliant and ready for every mission.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4 sm:flex-row lg:items-center">
            <div className="text-center sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overall Progress</p>
              <p className="text-sm font-medium">
                {summary.completedCount} of {summary.enrolledCount} courses completed
              </p>
            </div>
            <ProgressRing percent={summary.overallProgressPercent} />
            {continueLearning ? (
              <Button asChild size="lg" className="shrink-0 gap-2 shadow-md">
                <Link href={continueLearning.href}>
                  <Play className="h-4 w-4 fill-current" />
                  Continue Learning
                </Link>
              </Button>
            ) : summary.enrolledCount === 0 && recommended.length > 0 ? (
              <Button
                type="button"
                size="lg"
                className="shrink-0 gap-2 shadow-md"
                onClick={() => void handleEnroll(recommended[0].courseId, recommended[0].slug)}
              >
                <Play className="h-4 w-4 fill-current" />
                Start Learning
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
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
                    No {TAB_LABELS[key].toLowerCase()} courses yet.
                  </div>
                ) : (
                  tabs[key].map((course) => (
                    <EnrolledCourseRow
                      key={course.courseId}
                      course={course}
                      onContinue={() => router.push(course.href)}
                    />
                  ))
                )}
                {tabs[key].length > 0 ? (
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-1 py-2 text-sm font-medium text-primary hover:underline"
                    onClick={() => setTab(key)}
                  >
                    View All {TAB_LABELS[key]} Courses
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
              </TabsContent>
            ))}
          </Tabs>

          {recommended.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recommended For You</h3>
                <Link href="/lms/my-learning" className="text-sm font-medium text-primary hover:underline">
                  View All
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4">
                {recommended.map((course) => (
                  <RecommendedCard
                    key={course.courseId}
                    course={course}
                    enrolling={enrollingId === course.courseId}
                    onEnroll={() => void handleEnroll(course.courseId, course.slug)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DashboardStatCard
              label="Enrolled Courses"
              value={summary.enrolledCount}
              sub="Active enrollments"
              icon={<BookOpen className="h-8 w-8" />}
              href="/lms/my-learning"
            />
            <DashboardStatCard
              label="Completed"
              value={summary.completedCount}
              sub="Courses finished"
              icon={<CheckCircle2 className="h-8 w-8" />}
              href="/lms/my-learning"
            />
            <DashboardStatCard
              label="In Progress"
              value={summary.inProgressCount}
              sub="Currently learning"
              icon={<Clock className="h-8 w-8" />}
              href="/lms/my-learning"
            />
            <DashboardStatCard
              label="Overdue"
              value={summary.overdueCount}
              sub="Needs attention"
              icon={<AlertCircle className="h-8 w-8" />}
              href="/lms/my-learning"
            />
          </div>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {deadlines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
              ) : (
                deadlines.map((d) => (
                  <Link
                    key={d.courseId}
                    href={d.href}
                    className="flex gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40"
                  >
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDueDate(d.dueDate)}</p>
                      <p
                        className={cn(
                          "text-xs font-medium",
                          d.daysRemaining <= 14 ? "text-red-600" : "text-amber-600",
                        )}
                      >
                        Due in {d.daysRemaining} day{d.daysRemaining === 1 ? "" : "s"}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {eventsSummary ? <LmsEventsUpcomingCard summary={eventsSummary} className="shadow-sm" /> : null}

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <QuickLink href="/lms/student/dashboard" icon={LayoutDashboard} label="LMS Dashboard" />
              <QuickLink href="/lms/events" icon={Calendar} label="Browse Events" />
              <QuickLink href="/lms/my-events" icon={Calendar} label="My Events" />
              <QuickLink href="/lms/my-learning" icon={BookOpen} label="Browse All Courses" />
              <QuickLink href="/lms/certificates" icon={GraduationCap} label="Event Certificates" />
              <QuickLink href="/lms/support" icon={HelpCircle} label="Training Support" />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function QuickLink(props: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  const Icon = props.icon;
  return (
    <Link
      href={props.href}
      className="flex items-center justify-between rounded-lg px-2 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50"
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        {props.label}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
    </Link>
  );
}
