"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  ExternalLink,
  Loader2,
  MessageSquare,
  UserCircle,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type DashboardPayload = {
  summary: {
    assignedCourseCount: number;
    activeEnrollmentCount: number;
    openTicketCount: number;
    upcomingSessionCount: number;
  };
  profile: {
    displayName: string;
    headline: string | null;
    avatarUrl: string | null;
    profileComplete: boolean;
  };
  courses: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    deliveryType: string;
    role: string | null;
    isPrimary: boolean;
    activeEnrollmentCount: number;
  }>;
  upcomingSessions: Array<{
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    meetingUrl: string | null;
    meetingProvider: string;
    course: { id: string; title: string; slug: string } | null;
  }>;
  openTickets: Array<{
    id: string;
    ticketCode: string;
    subject: string;
    status: string;
    createdAt: string;
    lmsCourse?: { id: string; title: string } | null;
    lmsStudent?: { name: string } | null;
  }>;
};

function formatStatus(v: string) {
  return v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");
}

function formatWhen(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";
  return `${start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "IN";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function LmsInstructorHomeClient() {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<DashboardPayload | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lms/instructor/dashboard", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        dashboard?: DashboardPayload;
        message?: string;
      };
      if (!res.ok || !json.ok || !json.dashboard) {
        throw new Error(json.message ?? "Failed to load instructor dashboard");
      }
      setData(json.dashboard);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load instructor workspace</CardTitle>
          <CardDescription>Try refreshing the page.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => void reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { summary, profile, courses, upcomingSessions, openTickets } = data;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/80">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={profile.displayName} /> : null}
              <AvatarFallback>{initials(profile.displayName)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">Welcome back, {profile.displayName}</h2>
              {profile.headline ? (
                <p className="mt-1 text-sm text-muted-foreground">{profile.headline}</p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  Your instructor workspace for assigned courses, learner messages, and live sessions.
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/lms/instructor/profile">
                <UserCircle className="mr-2 h-4 w-4" />
                My profile
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/lms/instructor/courses">
                <BookOpen className="mr-2 h-4 w-4" />
                My courses
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/lms/instructor/course-support">
                <MessageSquare className="mr-2 h-4 w-4" />
                Learner questions
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {!profile.profileComplete ? (
        <Card className=" bg-amber-50/50 dark: dark:bg-amber-950/20">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Complete your instructor profile</p>
              <p className="text-sm text-muted-foreground">
                Add a headline, bio, and photo so learners recognize you on course pages.
              </p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/lms/instructor/profile">Update profile</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Assigned courses"
          value={summary.assignedCourseCount}
          sub="Courses you teach"
          icon={<BookOpen className="h-4 w-4" />}
          href="/lms/instructor/courses"
        />
        <DashboardStatCard
          label="Active learners"
          value={summary.activeEnrollmentCount}
          sub="Across your courses"
          icon={<Users className="h-4 w-4" />}
        />
        <DashboardStatCard
          label="Open questions"
          value={summary.openTicketCount}
          sub="Awaiting your reply"
          icon={<MessageSquare className="h-4 w-4" />}
          href="/lms/instructor/course-support"
        />
        <DashboardStatCard
          label="Upcoming sessions"
          value={summary.upcomingSessionCount}
          sub="Scheduled live classes"
          icon={<Video className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">My courses</CardTitle>
              <CardDescription>Courses where you are assigned as an instructor.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/lms/instructor/courses">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No course assignments yet. An admin can link you from each course roster.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {courses.slice(0, 5).map((course) => (
                  <li key={course.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{course.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatStatus(course.status)} · {formatStatus(course.deliveryType)}
                        {course.isPrimary ? " · Primary" : ""}
                        {course.role ? ` · ${course.role}` : ""}
                        {" · "}
                        {course.activeEnrollmentCount} active learner
                        {course.activeEnrollmentCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/lms/instructor/course-support?courseId=${course.id}`}>Questions</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming live sessions</CardTitle>
            <CardDescription>Scheduled classes on courses you teach.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No upcoming live sessions.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {upcomingSessions.map((session) => (
                  <li key={session.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium">{session.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {session.course?.title ?? "Course"} · {formatWhen(session.startsAt, session.endsAt)}
                        </p>
                      </div>
                      {session.meetingUrl ? (
                        <Button size="sm" variant="outline" asChild>
                          <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1 h-3.5 w-3.5" />
                            Join
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Learner questions</CardTitle>
            <CardDescription>Open support tickets from your assigned courses.</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/lms/instructor/course-support">Open inbox</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {openTickets.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No open learner questions right now.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {openTickets.map((ticket) => (
                <li key={ticket.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.lmsCourse?.title ?? "Course"}
                      {ticket.lmsStudent?.name ? ` · ${ticket.lmsStudent.name}` : ""}
                      {" · "}
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{formatStatus(ticket.status)}</Badge>
                    <Button size="sm" asChild>
                      <Link href={`/lms/instructor/course-support?courseId=${ticket.lmsCourse?.id ?? ""}`}>
                        Reply
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
