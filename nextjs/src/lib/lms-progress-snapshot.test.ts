import { describe, expect, it } from "vitest";

import { buildCourseProgressSnapshot } from "@/lib/lms-progress-snapshot";

const eid = 10n;
const cid = 20n;
const s1 = 100n;
const s2 = 101n;
const l1 = 1n;
const l2 = 2n;
const l3 = 3n;

describe("buildCourseProgressSnapshot", () => {
  it("returns 0% when there are no published lessons", () => {
    const snap = buildCourseProgressSnapshot({
      enrollmentId: eid,
      courseId: cid,
      sections: [{ id: s1, title: "A", sortOrder: 0 }],
      publishedLessons: [],
      progressRows: [],
    });
    expect(snap.coursePercent).toBe(0);
    expect(snap.publishedLessonCount).toBe(0);
    expect(snap.completedLessonCount).toBe(0);
    expect(snap.sections[0]?.progressPercent).toBe(0);
    expect(snap.sections[0]?.isComplete).toBe(false);
  });

  it("marks section with no published lessons as 0% (not complete)", () => {
    const snap = buildCourseProgressSnapshot({
      enrollmentId: eid,
      courseId: cid,
      sections: [
        { id: s1, title: "Empty", sortOrder: 0 },
        { id: s2, title: "Has lessons", sortOrder: 1 },
      ],
      publishedLessons: [
        {
          id: l1,
          sectionId: s2,
          title: "Only lesson",
          sortOrder: 0,
          sectionSortOrder: 1,
        },
      ],
      progressRows: [],
    });
    const empty = snap.sections.find((x) => x.sectionId === s1.toString());
    expect(empty?.publishedLessonCount).toBe(0);
    expect(empty?.progressPercent).toBe(0);
    expect(empty?.isComplete).toBe(false);
  });

  it("computes course and section percent when one of two lessons is completed", () => {
    const snap = buildCourseProgressSnapshot({
      enrollmentId: eid,
      courseId: cid,
      sections: [{ id: s1, title: "Module 1", sortOrder: 0 }],
      publishedLessons: [
        { id: l1, sectionId: s1, title: "A", sortOrder: 0, sectionSortOrder: 0 },
        { id: l2, sectionId: s1, title: "B", sortOrder: 1, sectionSortOrder: 0 },
      ],
      progressRows: [
        {
          lesson_id: l1,
          completed_at: new Date("2026-01-01T00:00:00.000Z"),
          last_engaged_at: new Date("2026-01-01T00:00:00.000Z"),
        },
        {
          lesson_id: l2,
          completed_at: null,
          last_engaged_at: new Date("2026-01-02T00:00:00.000Z"),
        },
      ],
    });
    expect(snap.coursePercent).toBe(50);
    expect(snap.completedLessonCount).toBe(1);
    expect(snap.publishedLessonCount).toBe(2);
    expect(snap.sections[0]?.progressPercent).toBe(50);
    expect(snap.sections[0]?.isComplete).toBe(false);
    expect(snap.lessons.find((x) => x.lessonId === l1.toString())?.completed).toBe(true);
    expect(snap.lessons.find((x) => x.lessonId === l2.toString())?.completed).toBe(false);
  });

  it("is complete at 100% when all lessons in all sections are completed", () => {
    const snap = buildCourseProgressSnapshot({
      enrollmentId: eid,
      courseId: cid,
      sections: [
        { id: s1, title: "S1", sortOrder: 0 },
        { id: s2, title: "S2", sortOrder: 1 },
      ],
      publishedLessons: [
        { id: l1, sectionId: s1, title: "L1", sortOrder: 0, sectionSortOrder: 0 },
        { id: l2, sectionId: s2, title: "L2", sortOrder: 0, sectionSortOrder: 1 },
        { id: l3, sectionId: s2, title: "L3", sortOrder: 1, sectionSortOrder: 1 },
      ],
      progressRows: [l1, l2, l3].map((lesson_id) => ({
        lesson_id,
        completed_at: new Date("2026-05-01T12:00:00.000Z"),
        last_engaged_at: new Date("2026-05-01T12:00:00.000Z"),
      })),
    });
    expect(snap.coursePercent).toBe(100);
    expect(snap.sections.every((s) => s.isComplete)).toBe(true);
  });

  it("orders lessons by section sort order then lesson sort order", () => {
    const snap = buildCourseProgressSnapshot({
      enrollmentId: eid,
      courseId: cid,
      sections: [
        { id: s2, title: "Second section", sortOrder: 1 },
        { id: s1, title: "First section", sortOrder: 0 },
      ],
      publishedLessons: [
        { id: l2, sectionId: s2, title: "Later sec", sortOrder: 0, sectionSortOrder: 1 },
        { id: l1, sectionId: s1, title: "Earlier sec", sortOrder: 0, sectionSortOrder: 0 },
      ],
      progressRows: [],
    });
    expect(snap.lessons.map((x) => x.title)).toEqual(["Earlier sec", "Later sec"]);
  });
});
