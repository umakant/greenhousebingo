/**
 * Pure course / section / lesson progress aggregation (no Prisma, safe for client type imports + Vitest).
 */

export type LmsLessonProgressInput = {
  lesson_id: bigint;
  completed_at: Date | null;
  last_engaged_at: Date;
};

export type LessonProgressSummary = {
  lessonId: string;
  sectionId: string;
  title: string;
  sortOrder: number;
  completed: boolean;
  completedAt: string | null;
  lastEngagedAt: string | null;
};

export type SectionProgressSummary = {
  sectionId: string;
  title: string;
  sortOrder: number;
  publishedLessonCount: number;
  completedLessonCount: number;
  progressPercent: number;
  isComplete: boolean;
};

export type CourseProgressSnapshot = {
  enrollmentId: string;
  courseId: string;
  coursePercent: number;
  completedLessonCount: number;
  publishedLessonCount: number;
  sections: SectionProgressSummary[];
  lessons: LessonProgressSummary[];
};

/** Derive section + course completion from published lessons and per-enrollment `lms_lesson_progress` rows. */
export function buildCourseProgressSnapshot(params: {
  enrollmentId: bigint;
  courseId: bigint;
  sections: Array<{ id: bigint; title: string; sortOrder: number }>;
  publishedLessons: Array<{
    id: bigint;
    sectionId: bigint;
    title: string;
    sortOrder: number;
    sectionSortOrder: number;
  }>;
  progressRows: LmsLessonProgressInput[];
}): CourseProgressSnapshot {
  const completedLessonIds = new Set(
    params.progressRows.filter((r) => r.completed_at != null).map((r) => r.lesson_id.toString()),
  );
  const lastEngaged = new Map<string, Date>();
  const completedAt = new Map<string, Date>();
  for (const r of params.progressRows) {
    const lid = r.lesson_id.toString();
    lastEngaged.set(lid, r.last_engaged_at);
    if (r.completed_at) completedAt.set(lid, r.completed_at);
  }

  const sortedLessons = [...params.publishedLessons].sort((a, b) => {
    if (a.sectionSortOrder !== b.sectionSortOrder) return a.sectionSortOrder - b.sectionSortOrder;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id < b.id ? -1 : 1;
  });

  const lessons: LessonProgressSummary[] = sortedLessons.map((l) => {
    const lid = l.id.toString();
    return {
      lessonId: lid,
      sectionId: l.sectionId.toString(),
      title: l.title,
      sortOrder: l.sortOrder,
      completed: completedLessonIds.has(lid),
      completedAt: completedAt.get(lid)?.toISOString() ?? null,
      lastEngagedAt: lastEngaged.get(lid)?.toISOString() ?? null,
    };
  });

  const lessonsBySection = new Map<string, typeof sortedLessons>();
  for (const l of sortedLessons) {
    const sid = l.sectionId.toString();
    if (!lessonsBySection.has(sid)) lessonsBySection.set(sid, []);
    lessonsBySection.get(sid)!.push(l);
  }

  const sortedSections = [...params.sections].sort((a, b) => a.sortOrder - b.sortOrder || Number(a.id - b.id));

  const sections: SectionProgressSummary[] = sortedSections.map((sec) => {
    const sid = sec.id.toString();
    const les = lessonsBySection.get(sid) ?? [];
    const total = les.length;
    const comp = les.filter((l) => completedLessonIds.has(l.id.toString())).length;
    const progressPercent = total === 0 ? 0 : Math.min(100, Math.round((comp / total) * 100));
    return {
      sectionId: sid,
      title: sec.title,
      sortOrder: sec.sortOrder,
      publishedLessonCount: total,
      completedLessonCount: comp,
      progressPercent,
      isComplete: total > 0 && comp === total,
    };
  });

  const total = sortedLessons.length;
  const comp = sortedLessons.filter((l) => completedLessonIds.has(l.id.toString())).length;
  const coursePercent = total === 0 ? 0 : Math.min(100, Math.round((comp / total) * 100));

  return {
    enrollmentId: params.enrollmentId.toString(),
    courseId: params.courseId.toString(),
    coursePercent,
    completedLessonCount: comp,
    publishedLessonCount: total,
    sections,
    lessons,
  };
}
