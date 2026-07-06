import { parseLmsTicketThread } from "@/lib/lms-course-support-thread";
import { serializeStTicket } from "@/lib/support-ticket-serialize";

export type LmsStTicketRow = Parameters<typeof serializeStTicket>[0] & {
  lmsCourseId?: bigint | null;
  lmsLessonId?: bigint | null;
  lmsStudentUserId?: bigint | null;
  lmsCourse?: { id: bigint; title: string } | null;
  lmsLesson?: { id: bigint; title: string } | null;
  lmsStudent?: { id: bigint; name: string | null; email: string | null } | null;
};

export function serializeLmsStTicket(t: LmsStTicketRow) {
  const base = serializeStTicket(t);
  return {
    ...base,
    lmsCourseId: t.lmsCourseId != null ? String(t.lmsCourseId) : null,
    lmsLessonId: t.lmsLessonId != null ? String(t.lmsLessonId) : null,
    lmsStudentUserId: t.lmsStudentUserId != null ? String(t.lmsStudentUserId) : null,
    lmsCourse: t.lmsCourse
      ? { id: String(t.lmsCourse.id), title: t.lmsCourse.title }
      : null,
    lmsLesson: t.lmsLesson
      ? { id: String(t.lmsLesson.id), title: t.lmsLesson.title }
      : null,
    lmsStudent: t.lmsStudent
      ? {
          id: String(t.lmsStudent.id),
          name: t.lmsStudent.name?.trim() || "Learner",
          email: t.lmsStudent.email,
        }
      : null,
    thread: parseLmsTicketThread(t.description),
  };
}
