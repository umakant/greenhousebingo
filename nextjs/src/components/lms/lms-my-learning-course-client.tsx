"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  FileText,
  Loader2,
  MonitorPlay,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

import { LmsCourseReviewsSection } from "@/components/lms/lms-course-reviews-section";
import { LmsLessonPdfViewer } from "@/components/lms/lms-lesson-pdf-viewer";
import { LmsCourseSupportSection } from "@/components/lms/lms-course-support-section";
import { LmsCalendarExportActions } from "@/components/lms/lms-calendar-export-actions";
import { LmsCourseAccessDenied } from "@/components/lms/lms-course-access-denied";
import { LmsLessonVideoPlayer } from "@/components/lms/lms-lesson-video-player";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { CourseProgressSnapshot } from "@/lib/lms-progress-snapshot";

type LessonRow = {
  id: string;
  title: string;
  lessonType: string;
  bodyText?: string | null;
  pdfDocumentUrl?: string | null;
  externalLiveUrl?: string | null;
  liveStartsAt?: string | null;
  liveEndsAt?: string | null;
  durationSeconds?: number | null;
};

type SectionRow = { id: string; title: string; lessons: LessonRow[] };

function flattenLessons(sections: SectionRow[]): LessonRow[] {
  const out: LessonRow[] = [];
  for (const s of sections) {
    for (const l of s.lessons) out.push(l);
  }
  return out;
}

function findLesson(sections: SectionRow[], lessonId: string): LessonRow | null {
  for (const s of sections) {
    for (const l of s.lessons) {
      if (l.id === lessonId) return l;
    }
  }
  return null;
}

function getNextLesson(sections: SectionRow[], currentId: string): LessonRow | null {
  const flat = flattenLessons(sections);
  const idx = flat.findIndex((l) => l.id === currentId);
  if (idx < 0 || idx >= flat.length - 1) return null;
  return flat[idx + 1] ?? null;
}

function formatLessonDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function postLessonProgress(
  courseId: string,
  lessonId: string,
  action: "engage" | "complete" | "uncomplete",
): Promise<CourseProgressSnapshot | null> {
  const res = await fetch("/api/lms/student/lesson-progress", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, lessonId, action }),
  });
  const json = (await res.json().catch(() => null)) as {
    ok?: boolean;
    message?: string;
    progress?: CourseProgressSnapshot;
  } | null;
  if (!res.ok || !json?.ok) {
    throw new Error(json?.message ?? "Progress update failed.");
  }
  return json.progress ?? null;
}

export function LmsMyLearningCourseClient(props: {
  courseId: string;
  title: string;
  initialLessonId?: string | null;
}) {
  const { courseId, title, initialLessonId } = props;
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [accessDenied, setAccessDenied] = React.useState<{ code?: string; message?: string } | null>(null);
  const [sections, setSections] = React.useState<SectionRow[]>([]);
  const [active, setActive] = React.useState<LessonRow | null>(null);
  const [completing, setCompleting] = React.useState(false);
  const [progress, setProgress] = React.useState<CourseProgressSnapshot | null>(null);

  const loadProgress = React.useCallback(async () => {
    const res = await fetch(`/api/lms/student/courses/${encodeURIComponent(courseId)}/progress`, {
      credentials: "include",
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; progress?: CourseProgressSnapshot; code?: string } | null;
    if (res.ok && json?.ok && json.progress) setProgress(json.progress);
    else setProgress(null);
  }, [courseId]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setAccessDenied(null);
      try {
        const [learnRes] = await Promise.all([
          fetch(`/api/lms/courses/${encodeURIComponent(courseId)}/learn`, {
            credentials: "include",
            cache: "no-store",
          }),
          loadProgress(),
        ]);
        const json = (await learnRes.json().catch(() => null)) as {
          ok?: boolean;
          sections?: SectionRow[];
          message?: string;
          code?: string;
        } | null;
        if (cancelled) return;
        if (!learnRes.ok || !json?.ok || !Array.isArray(json.sections)) {
          setAccessDenied({ code: json?.code, message: json?.message });
          setSections([]);
          setActive(null);
          return;
        }
        setSections(json.sections);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, loadProgress]);

  const lessonDone = React.useMemo(() => {
    const m = new Map<string, boolean>();
    for (const row of progress?.lessons ?? []) {
      m.set(row.lessonId, row.completed);
    }
    return m;
  }, [progress]);

  const syncLessonUrl = React.useCallback(
    (lessonId: string | null) => {
      const base = window.location.pathname;
      if (!lessonId) {
        router.replace(base, { scroll: false });
        return;
      }
      router.replace(`${base}?lesson=${encodeURIComponent(lessonId)}`, { scroll: false });
    },
    [router],
  );

  const selectLesson = React.useCallback(
    (l: LessonRow) => {
      setActive(l);
      syncLessonUrl(l.id);
      void postLessonProgress(courseId, l.id, "engage")
        .then((p) => {
          if (p) setProgress(p);
        })
        .catch(() => {});
    },
    [courseId, syncLessonUrl],
  );

  React.useEffect(() => {
    if (!initialLessonId || sections.length === 0) return;
    const hit = findLesson(sections, initialLessonId);
    if (hit) setActive(hit);
  }, [initialLessonId, sections]);

  React.useEffect(() => {
    if (loading || sections.length === 0 || active || initialLessonId) return;
    const flat = flattenLessons(sections);
    if (flat.length === 0) return;
    const firstIncomplete = flat.find((l) => !lessonDone.get(l.id));
    const pick = firstIncomplete ?? flat[0];
    setActive(pick);
    syncLessonUrl(pick.id);
  }, [loading, sections, active, initialLessonId, lessonDone, syncLessonUrl]);

  const toggleLessonComplete = React.useCallback(async () => {
    if (!active) return;
    const done = lessonDone.get(active.id) ?? false;
    setCompleting(true);
    try {
      const p = await postLessonProgress(courseId, active.id, done ? "uncomplete" : "complete");
      if (p) setProgress(p);
      toast.success(done ? "Lesson marked incomplete." : "Lesson marked complete.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save progress.");
    } finally {
      setCompleting(false);
    }
  }, [active, courseId, lessonDone]);

  const completeAndContinue = React.useCallback(async () => {
    if (!active) return;
    setCompleting(true);
    try {
      const done = lessonDone.get(active.id) ?? false;
      if (!done) {
        const p = await postLessonProgress(courseId, active.id, "complete");
        if (p) setProgress(p);
      }
      const next = getNextLesson(sections, active.id);
      if (next) {
        selectLesson(next);
      } else {
        toast.success("Course complete! Great work.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save progress.");
    } finally {
      setCompleting(false);
    }
  }, [active, courseId, lessonDone, sections, selectLesson]);

  const allLessons = React.useMemo(
    () => flattenLessons(sections).map((l) => ({ id: l.id, title: l.title })),
    [sections],
  );

  const coursePercent = progress?.coursePercent ?? 0;
  const activeDone = active ? (lessonDone.get(active.id) ?? false) : false;
  const hasNext = active ? getNextLesson(sections, active.id) != null : false;

  if (accessDenied) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
          <Link href="/lms/my-learning">← My learning</Link>
        </Button>
        <LmsCourseAccessDenied
          code={accessDenied.code}
          message={accessDenied.message}
          courseTitle={title}
          showEnrollHint
          courseId={courseId}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading course…
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
          <Link href="/lms/my-learning">← My learning</Link>
        </Button>
        <p className="text-sm text-muted-foreground">No lessons published yet.</p>
      </div>
    );
  }

  return (
    <div className="-mx-3 -mt-2 flex min-h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-lg border border-border/80 bg-background shadow-sm sm:-mx-4 lg:flex-row">
      <CoursePlayerSidebar
        title={title}
        coursePercent={coursePercent}
        sections={sections}
        active={active}
        lessonDone={lessonDone}
        onSelectLesson={selectLesson}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 bg-slate-900 px-4 py-2.5 text-white dark:bg-slate-950">
          <Button variant="ghost" size="sm" className="text-white/80 hover:bg-white/10 hover:text-white" asChild>
            <Link href="/lms/my-learning">← Catalog</Link>
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1 bg-white text-slate-900 hover:bg-white/90"
            disabled={!active || completing}
            onClick={() => void completeAndContinue()}
          >
            {completing ? "Saving…" : hasNext ? "Complete and Continue" : activeDone ? "Course complete" : "Mark complete"}
            {hasNext ? <ChevronRight className="h-4 w-4" /> : null}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {active ? (
            <LessonContentPanel
              active={active}
              courseId={courseId}
              lessonDone={lessonDone}
              completing={completing}
              toggleLessonComplete={toggleLessonComplete}
              setProgress={setProgress}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
              Select a lesson from the sidebar to begin.
            </div>
          )}

          <div className="border-t border-border/60 p-4 md:p-6">
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
                  Reviews &amp; support
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-6">
                <LmsCourseReviewsSection courseId={courseId} />
                <LmsCourseSupportSection
                  courseId={courseId}
                  lessons={allLessons}
                  activeLessonId={active?.id ?? null}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoursePlayerSidebar(props: {
  title: string;
  coursePercent: number;
  sections: SectionRow[];
  active: LessonRow | null;
  lessonDone: Map<string, boolean>;
  onSelectLesson: (l: LessonRow) => void;
}) {
  const { title, coursePercent, sections, active, lessonDone, onSelectLesson } = props;
  const multiSection = sections.length > 1;

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-border/80 bg-muted/20 lg:w-[min(100%,320px)] lg:border-b-0 lg:border-r">
      <div className="border-b border-border/60 px-4 py-4">
        <h2 className="text-sm font-semibold leading-snug text-foreground">{title}</h2>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>{coursePercent}% complete</span>
          </div>
          <Progress value={coursePercent} className="h-1.5" />
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2" aria-label="Course lessons">
        {sections.map((sec) => (
          <div key={sec.id} className="mb-1">
            {multiSection ? (
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {sec.title}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {sec.lessons.map((l) => {
                const done = lessonDone.get(l.id) ?? false;
                const isActive = active?.id === l.id;
                const duration = formatLessonDuration(l.durationSeconds);
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => onSelectLesson(l)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-foreground hover:bg-muted/80",
                      )}
                    >
                      <span className="mt-0.5 shrink-0">
                        {done ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                        ) : isActive ? (
                          <Circle className="h-4 w-4 fill-primary/20 text-primary" aria-hidden />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/50" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 leading-snug">
                        {l.title}
                        {duration ? <span className="text-muted-foreground"> ({duration})</span> : null}
                      </span>
                      <LessonTypeIcon lessonType={l.lessonType} className="mt-0.5 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function LessonTypeIcon({ lessonType, className }: { lessonType: string; className?: string }) {
  if (lessonType === "VIDEO") return <MonitorPlay className={cn("h-4 w-4", className)} aria-hidden />;
  if (lessonType === "PDF") return <FileText className={cn("h-4 w-4", className)} aria-hidden />;
  if (lessonType === "LIVE_CLASS") return <Radio className={cn("h-4 w-4", className)} aria-hidden />;
  return <FileText className={cn("h-4 w-4", className)} aria-hidden />;
}

function LessonContentPanel(props: {
  active: LessonRow;
  courseId: string;
  lessonDone: Map<string, boolean>;
  completing: boolean;
  toggleLessonComplete: () => void;
  setProgress: React.Dispatch<React.SetStateAction<CourseProgressSnapshot | null>>;
}) {
  const { active, courseId, lessonDone, completing, toggleLessonComplete, setProgress } = props;
  const activeDone = lessonDone.get(active.id) ?? false;
  const duration = formatLessonDuration(active.durationSeconds);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <LessonTypeIcon lessonType={active.lessonType} className="h-5 w-5 shrink-0 text-primary" />
          <h3 className="text-lg font-semibold leading-snug">
            {active.title}
            {duration ? <span className="font-normal text-muted-foreground"> ({duration})</span> : null}
          </h3>
        </div>
        <Button
          type="button"
          size="sm"
          variant={activeDone ? "outline" : "secondary"}
          disabled={completing}
          onClick={() => void toggleLessonComplete()}
        >
          {completing ? "Saving…" : activeDone ? "Mark incomplete" : "Mark complete"}
        </Button>
      </div>

      <div className="space-y-4">
        {active.lessonType === "VIDEO" ? (
          <LmsLessonVideoPlayer
            courseId={courseId}
            lessonId={active.id}
            title={active.title}
            className="w-full"
            onPlaybackReady={() => {
              void postLessonProgress(courseId, active.id, "engage")
                .then((p) => {
                  if (p) setProgress(p);
                })
                .catch(() => {});
            }}
            onNativeVideoEnded={() => {
              void postLessonProgress(courseId, active.id, "complete")
                .then((p) => {
                  if (p) setProgress(p);
                })
                .catch(() => {});
            }}
          />
        ) : null}

        {active.lessonType === "TEXT" && active.bodyText ? (
          <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border/60 bg-card p-4 md:p-6">
            <div className="whitespace-pre-wrap text-sm">{active.bodyText}</div>
          </div>
        ) : null}

        {active.lessonType === "TEXT" && !active.bodyText ? (
          <p className="text-sm text-muted-foreground">No text content for this lesson.</p>
        ) : null}

        {active.lessonType === "PDF" ? (
          <LmsLessonPdfViewer
            documentUrl={active.pdfDocumentUrl ?? ""}
            title={active.title}
            className="w-full"
            onReady={() => {
              void postLessonProgress(courseId, active.id, "engage")
                .then((p) => {
                  if (p) setProgress(p);
                })
                .catch(() => {});
            }}
          />
        ) : null}

        {active.lessonType === "LIVE_CLASS" ? <LiveClassBlock active={active} courseId={courseId} /> : null}
      </div>
    </div>
  );
}

function LiveClassBlock({ active, courseId }: { active: LessonRow; courseId: string }) {
  const [linkedSession, setLinkedSession] = React.useState<{
    id: string;
    canJoin: boolean;
  } | null>(null);
  const [joining, setJoining] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void fetch(`/api/lms/student/live-sessions?courseId=${encodeURIComponent(courseId)}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then(
        (data: {
          ok?: boolean;
          items?: { id: string; courseLessonId: string | null; canJoin: boolean }[];
        }) => {
          if (cancelled || !data?.ok || !Array.isArray(data.items)) return;
          const hit = data.items.find((s) => s.courseLessonId === active.id);
          if (hit) setLinkedSession({ id: hit.id, canJoin: hit.canJoin });
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [courseId, active.id]);

  const joinSession = async () => {
    if (!linkedSession) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/lms/student/live-sessions/${linkedSession.id}/join`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; meetingUrl?: string; message?: string } | null;
      if (!res.ok || !data?.ok || !data.meetingUrl) {
        toast.error(data?.message ?? "Could not join session.");
        return;
      }
      window.open(data.meetingUrl, "_blank", "noopener,noreferrer");
      toast.success("Attendance recorded. Opening meeting…");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-card p-4 text-sm">
      {active.liveStartsAt ? (
        <p>
          <span className="text-muted-foreground">Starts:</span> {new Date(active.liveStartsAt).toLocaleString()}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {linkedSession ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!linkedSession.canJoin || joining}
            onClick={() => void joinSession()}
          >
            {joining ? "Joining…" : linkedSession.canJoin ? "Join live session" : "Join opens before start"}
          </Button>
        ) : active.externalLiveUrl ? (
          <Button variant="outline" size="sm" asChild>
            <a href={active.externalLiveUrl} target="_blank" rel="noopener noreferrer">
              Open session link
            </a>
          </Button>
        ) : (
          <p className="text-muted-foreground">No join link configured.</p>
        )}
        {active.liveStartsAt && active.liveEndsAt ? (
          <LmsCalendarExportActions
            session={{
              id: linkedSession?.id ?? active.id,
              title: active.title,
              startsAt: active.liveStartsAt,
              endsAt: active.liveEndsAt,
              meetingUrl: active.externalLiveUrl,
            }}
            studentCalendarApi={
              linkedSession ? `/api/lms/student/live-sessions/${linkedSession.id}/calendar` : undefined
            }
          />
        ) : null}
      </div>
    </div>
  );
}
