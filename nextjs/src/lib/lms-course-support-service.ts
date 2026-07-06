import "server-only";

import { LmsEnrollmentStatus } from "@prisma/client";

import {
  appendLmsTicketReply,
  parseLmsTicketThread,
} from "@/lib/lms-course-support-thread";
import { prisma } from "@/lib/prisma";
import { serializeLmsStTicket, type LmsStTicketRow } from "@/lib/lms-course-support-serialize";

export const LMS_TICKET_ACCOUNT_TYPE = "lms_student";

function makeTicketCode(): string {
  return `LMS${String(Date.now()).slice(-8)}`;
}

export async function assertStudentEnrolled(params: {
  organizationId: bigint;
  courseId: bigint;
  studentUserId: bigint;
}) {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      organizationId: params.organizationId,
      courseId: params.courseId,
      studentUserId: params.studentUserId,
      status: { in: [LmsEnrollmentStatus.ACTIVE, LmsEnrollmentStatus.COMPLETED] },
    },
    select: { id: true },
  });
  if (!enrollment) throw new Error("You must be enrolled in this course to open a support ticket.");
}

export async function assertInstructorOnCourse(params: {
  organizationId: bigint;
  courseId: bigint;
  userId: bigint;
}) {
  const row = await prisma.courseInstructor.findFirst({
    where: {
      organizationId: params.organizationId,
      courseId: params.courseId,
      instructorProfile: { userId: params.userId },
    },
    select: { id: true },
  });
  if (!row) throw new Error("You are not assigned as an instructor for this course.");
}

async function primaryInstructorUserId(organizationId: bigint, courseId: bigint): Promise<bigint | null> {
  const row = await prisma.courseInstructor.findFirst({
    where: { organizationId, courseId },
    orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
    select: { instructorProfile: { select: { userId: true } } },
  });
  return row?.instructorProfile.userId ?? null;
}

const ticketInclude = {
  category: { select: { id: true, name: true, color: true } },
  lmsCourse: { select: { id: true, title: true } },
  lmsLesson: { select: { id: true, title: true } },
  lmsStudent: { select: { id: true, name: true, email: true } },
} as const;

export async function createLmsCourseSupportTicket(params: {
  organizationId: bigint;
  courseId: bigint;
  lessonId?: bigint | null;
  studentUserId: bigint;
  subject: string;
  message: string;
  studentName: string;
  studentEmail: string;
}) {
  await assertStudentEnrolled({
    organizationId: params.organizationId,
    courseId: params.courseId,
    studentUserId: params.studentUserId,
  });

  if (params.lessonId) {
    const lesson = await prisma.courseLesson.findFirst({
      where: {
        id: params.lessonId,
        courseId: params.courseId,
        organizationId: params.organizationId,
      },
      select: { id: true },
    });
    if (!lesson) throw new Error("Lesson not found in this course.");
  }

  const text = params.message.trim();
  if (text.length < 5) throw new Error("Message must be at least 5 characters.");

  const assignee = await primaryInstructorUserId(params.organizationId, params.courseId);

  const description = appendLmsTicketReply(null, {
    at: new Date(),
    author: params.studentName,
    role: "student",
    body: text,
  });

  const ticket = await prisma.stTicket.create({
    data: {
      ticketCode: makeTicketCode(),
      accountType: LMS_TICKET_ACCOUNT_TYPE,
      name: params.studentName,
      email: params.studentEmail,
      subject: params.subject.trim(),
      status: "open",
      description,
      attachments: [],
      organizationId: params.organizationId,
      createdBy: params.studentUserId,
      lmsCourseId: params.courseId,
      lmsLessonId: params.lessonId ?? undefined,
      lmsStudentUserId: params.studentUserId,
      assignedStaffUserId: assignee ?? undefined,
    },
    include: ticketInclude,
  });

  return serializeLmsStTicket(ticket as LmsStTicketRow);
}

export async function listLmsCourseSupportTicketsForStudent(params: {
  organizationId: bigint;
  courseId: bigint;
  studentUserId: bigint;
}) {
  const rows = await prisma.stTicket.findMany({
    where: {
      organizationId: params.organizationId,
      lmsCourseId: params.courseId,
      lmsStudentUserId: params.studentUserId,
      accountType: LMS_TICKET_ACCOUNT_TYPE,
    },
    include: ticketInclude,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((r) => serializeLmsStTicket(r as LmsStTicketRow));
}

export async function listLmsCourseSupportTicketsForInstructor(params: {
  organizationId: bigint;
  instructorUserId: bigint;
  courseId?: bigint | null;
}) {
  const assignments = await prisma.courseInstructor.findMany({
    where: {
      organizationId: params.organizationId,
      instructorProfile: { userId: params.instructorUserId },
      ...(params.courseId ? { courseId: params.courseId } : {}),
    },
    select: { courseId: true },
  });
  const courseIds = assignments.map((a) => a.courseId);
  if (courseIds.length === 0) return [];

  const rows = await prisma.stTicket.findMany({
    where: {
      organizationId: params.organizationId,
      accountType: LMS_TICKET_ACCOUNT_TYPE,
      lmsCourseId: { in: courseIds },
    },
    include: ticketInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  return rows.map((r) => serializeLmsStTicket(r as LmsStTicketRow));
}

export async function getLmsCourseSupportTicket(params: {
  organizationId: bigint;
  ticketId: bigint;
}) {
  const ticket = await prisma.stTicket.findFirst({
    where: {
      id: params.ticketId,
      organizationId: params.organizationId,
      accountType: LMS_TICKET_ACCOUNT_TYPE,
    },
    include: ticketInclude,
  });
  if (!ticket) return null;
  return serializeLmsStTicket(ticket as LmsStTicketRow);
}

export async function replyToLmsCourseSupportTicket(params: {
  organizationId: bigint;
  ticketId: bigint;
  authorUserId: bigint;
  authorName: string;
  role: "student" | "instructor";
  message: string;
  status?: string;
}) {
  const ticket = await prisma.stTicket.findFirst({
    where: {
      id: params.ticketId,
      organizationId: params.organizationId,
      accountType: LMS_TICKET_ACCOUNT_TYPE,
    },
    select: {
      id: true,
      description: true,
      status: true,
      lmsCourseId: true,
      lmsStudentUserId: true,
    },
  });
  if (!ticket || !ticket.lmsCourseId) throw new Error("Ticket not found.");

  if (params.role === "student") {
    if (ticket.lmsStudentUserId !== params.authorUserId) {
      throw new Error("You can only reply to your own tickets.");
    }
    await assertStudentEnrolled({
      organizationId: params.organizationId,
      courseId: ticket.lmsCourseId,
      studentUserId: params.authorUserId,
    });
  } else {
    await assertInstructorOnCourse({
      organizationId: params.organizationId,
      courseId: ticket.lmsCourseId,
      userId: params.authorUserId,
    });
  }

  const text = params.message.trim();
  if (text.length < 1) throw new Error("Reply cannot be empty.");

  const description = appendLmsTicketReply(ticket.description, {
    at: new Date(),
    author: params.authorName,
    role: params.role,
    body: text,
  });

  const nextStatus =
    params.status ??
    (params.role === "instructor" && ticket.status === "open" ? "in_progress" : ticket.status);

  const updated = await prisma.stTicket.update({
    where: { id: ticket.id },
    data: {
      description,
      status: nextStatus,
      updatedAt: new Date(),
    },
    include: ticketInclude,
  });

  return serializeLmsStTicket(updated as LmsStTicketRow);
}

export { parseLmsTicketThread };
