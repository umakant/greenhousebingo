import type { CourseLesson, CourseSection } from "@prisma/client";

export type SectionWithLessons = CourseSection & { lessons: CourseLesson[] };

export function serializeLesson(l: CourseLesson) {
  return {
    id: l.id.toString(),
    organizationId: l.organizationId.toString(),
    courseId: l.courseId.toString(),
    sectionId: l.sectionId.toString(),
    title: l.title,
    lessonType: l.lessonType,
    bodyText: l.bodyText,
    videoUrl: l.videoUrl,
    videoMetadata: l.videoMetadata,
    liveStartsAt: l.liveStartsAt?.toISOString() ?? null,
    liveEndsAt: l.liveEndsAt?.toISOString() ?? null,
    externalLiveUrl: l.externalLiveUrl,
    durationSeconds: l.durationSeconds,
    sortOrder: l.sortOrder,
    isPublished: l.isPublished,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt?.toISOString() ?? null,
  };
}

export function serializeSection(s: SectionWithLessons) {
  return {
    id: s.id.toString(),
    organizationId: s.organizationId.toString(),
    courseId: s.courseId.toString(),
    title: s.title,
    description: s.description,
    sortOrder: s.sortOrder,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt?.toISOString() ?? null,
    lessons: s.lessons.map(serializeLesson),
  };
}

/** Learner-safe lesson payload: no raw video URLs (use playback API); TEXT body only for TEXT lessons. */
export function serializeLessonForLearner(l: CourseLesson) {
  return {
    id: l.id.toString(),
    courseId: l.courseId.toString(),
    sectionId: l.sectionId.toString(),
    title: l.title,
    lessonType: l.lessonType,
    bodyText: l.lessonType === "TEXT" ? l.bodyText : null,
    pdfDocumentUrl: l.lessonType === "PDF" ? l.videoUrl : null,
    liveStartsAt: l.liveStartsAt?.toISOString() ?? null,
    liveEndsAt: l.liveEndsAt?.toISOString() ?? null,
    externalLiveUrl: l.lessonType === "LIVE_CLASS" ? l.externalLiveUrl : null,
    durationSeconds: l.durationSeconds,
    sortOrder: l.sortOrder,
  };
}

export function serializeSectionForLearner(s: SectionWithLessons) {
  return {
    id: s.id.toString(),
    courseId: s.courseId.toString(),
    title: s.title,
    description: s.description,
    sortOrder: s.sortOrder,
    lessons: s.lessons.map(serializeLessonForLearner),
  };
}
