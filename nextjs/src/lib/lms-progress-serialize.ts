import type { CourseProgressSnapshot } from "@/lib/lms-progress-snapshot";

/** JSON-safe progress snapshot for API responses (per enrollment / student). */
export function serializeCourseProgressSnapshot(snap: CourseProgressSnapshot) {
  return {
    enrollmentId: snap.enrollmentId,
    courseId: snap.courseId,
    coursePercent: snap.coursePercent,
    completedLessonCount: snap.completedLessonCount,
    publishedLessonCount: snap.publishedLessonCount,
    isCourseComplete:
      snap.publishedLessonCount > 0 && snap.completedLessonCount >= snap.publishedLessonCount,
    sections: snap.sections.map((s) => ({
      sectionId: s.sectionId,
      title: s.title,
      sortOrder: s.sortOrder,
      publishedLessonCount: s.publishedLessonCount,
      completedLessonCount: s.completedLessonCount,
      progressPercent: s.progressPercent,
      isComplete: s.isComplete,
    })),
    lessons: snap.lessons.map((l) => ({
      lessonId: l.lessonId,
      sectionId: l.sectionId,
      title: l.title,
      sortOrder: l.sortOrder,
      completed: l.completed,
      completedAt: l.completedAt,
      lastEngagedAt: l.lastEngagedAt,
    })),
  };
}
