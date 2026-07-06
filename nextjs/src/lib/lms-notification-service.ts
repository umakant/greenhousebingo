import "server-only";

import { LmsEnrollmentStatus, LmsLiveSessionStatus } from "@prisma/client";

import {
  LMS_EMAIL_TEMPLATE,
  LMS_SMS_SETTING_KEY,
  type LmsNotificationReferenceType,
} from "@/lib/lms-notification-keys";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/send-sms";
import { isCompanyEmailNotificationEnabled, sendTemplatedEmailAsync } from "@/lib/send-templated-email";
import { getSettingsForOwner } from "@/lib/settings-service";

import { lmsMyLearningCoursePath } from "@/lib/lms-my-learning-path";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");

function fmtDateTime(d: Date): string {
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function isSmsEnabled(settings: Record<string, string>, key: string): boolean {
  const v = settings[key];
  if (v === undefined || v === null || v === "") return false;
  const s = String(v).trim().toLowerCase();
  return s === "on" || s === "true" || s === "1" || s === "yes";
}

async function alreadySent(params: {
  organizationId: bigint;
  templateKey: string;
  channel: string;
  referenceType: LmsNotificationReferenceType;
  referenceId: bigint;
  userId: bigint | null;
}): Promise<boolean> {
  const row = await prisma.lmsNotificationLog.findFirst({
    where: {
      organizationId: params.organizationId,
      templateKey: params.templateKey,
      channel: params.channel,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      userId: params.userId,
    },
    select: { id: true },
  });
  return Boolean(row);
}

async function markSent(params: {
  organizationId: bigint;
  templateKey: string;
  channel: string;
  referenceType: LmsNotificationReferenceType;
  referenceId: bigint;
  userId: bigint | null;
}) {
  try {
    await prisma.lmsNotificationLog.create({
      data: {
        organizationId: params.organizationId,
        templateKey: params.templateKey,
        channel: params.channel,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        userId: params.userId,
      },
    });
  } catch {
    /* duplicate — already sent */
  }
}

async function dispatchToStudent(params: {
  organizationId: bigint;
  studentUserId: bigint;
  emailTemplate: string;
  smsSettingKey: string;
  referenceType: LmsNotificationReferenceType;
  referenceId: bigint;
  variables: Record<string, string>;
  smsBody: string;
  /** Distinguish 24h vs 1h reminders (and similar) in the dedupe log. */
  dedupeSuffix?: string;
}) {
  const emailLogKey = params.dedupeSuffix
    ? `${params.emailTemplate}:${params.dedupeSuffix}`
    : params.emailTemplate;
  const smsLogKey = params.dedupeSuffix
    ? `${params.smsSettingKey}:${params.dedupeSuffix}`
    : params.smsSettingKey;
  const student = await prisma.user.findFirst({
    where: { id: params.studentUserId },
    select: { id: true, name: true, email: true, mobileNo: true },
  });
  if (!student) return;

  const settings = await getSettingsForOwner(params.organizationId);
  const vars = {
    name: student.name ?? "Learner",
    email: student.email ?? "",
    ...params.variables,
  };

  if (student.email?.trim() && isCompanyEmailNotificationEnabled(settings, params.emailTemplate)) {
    const sent = await alreadySent({
      organizationId: params.organizationId,
      templateKey: emailLogKey,
      channel: "email",
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      userId: params.studentUserId,
    });
    if (!sent) {
      sendTemplatedEmailAsync({
        templateName: params.emailTemplate,
        mailTo: [student.email.trim()],
        ownerId: params.organizationId,
        variables: vars,
      });
      await markSent({
        organizationId: params.organizationId,
        templateKey: emailLogKey,
        channel: "email",
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        userId: params.studentUserId,
      });
    }
  }

  const phone = student.mobileNo?.trim();
  if (phone && isSmsEnabled(settings, params.smsSettingKey)) {
    const sent = await alreadySent({
      organizationId: params.organizationId,
      templateKey: smsLogKey,
      channel: "sms",
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      userId: params.studentUserId,
    });
    if (!sent) {
      const r = await sendSms(phone, params.smsBody);
      if (r.ok) {
        await markSent({
          organizationId: params.organizationId,
          templateKey: smsLogKey,
          channel: "sms",
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          userId: params.studentUserId,
        });
      }
    }
  }
}

/** Notify learner after a new course enrollment is created. */
export async function notifyLmsEnrollmentConfirmation(params: {
  organizationId: bigint;
  enrollmentId: bigint;
}) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: params.enrollmentId, organizationId: params.organizationId },
    include: {
      course: { select: { id: true, title: true, slug: true } },
      student: { select: { id: true } },
    },
  });
  if (!enrollment?.student) return;

  const courseUrl = APP_URL
    ? `${APP_URL}${lmsMyLearningCoursePath(enrollment.course)}`
    : lmsMyLearningCoursePath(enrollment.course);

  await dispatchToStudent({
    organizationId: params.organizationId,
    studentUserId: enrollment.studentUserId,
    emailTemplate: LMS_EMAIL_TEMPLATE.enrollmentConfirmation,
    smsSettingKey: LMS_SMS_SETTING_KEY.enrollmentConfirmation,
    referenceType: "enrollment",
    referenceId: params.enrollmentId,
    variables: {
      course_title: enrollment.course.title,
      course_url: courseUrl,
      enrolled_at: fmtDateTime(enrollment.enrolledAt),
    },
    smsBody: `You are enrolled in "${enrollment.course.title}". Open your course: ${courseUrl}`,
  });
}

/** Notify learner when they complete a lesson. */
export async function notifyLmsLessonCompleted(params: {
  organizationId: bigint;
  studentUserId: bigint;
  courseId: bigint;
  lessonId: bigint;
  enrollmentId: bigint;
}) {
  const [course, lesson, snap] = await Promise.all([
    prisma.course.findFirst({
      where: { id: params.courseId, organizationId: params.organizationId },
      select: { title: true, slug: true, id: true },
    }),
    prisma.courseLesson.findFirst({
      where: { id: params.lessonId, courseId: params.courseId },
      select: { title: true },
    }),
    prisma.lmsLessonProgress.findUnique({
      where: {
        enrollmentId_lessonId: { enrollmentId: params.enrollmentId, lessonId: params.lessonId },
      },
      select: { completedAt: true },
    }),
  ]);
  if (!course || !lesson || !snap?.completedAt) return;

  const courseUrl = APP_URL
    ? `${APP_URL}${lmsMyLearningCoursePath(course)}`
    : lmsMyLearningCoursePath(course);

  await dispatchToStudent({
    organizationId: params.organizationId,
    studentUserId: params.studentUserId,
    emailTemplate: LMS_EMAIL_TEMPLATE.lessonCompleted,
    smsSettingKey: LMS_SMS_SETTING_KEY.lessonCompleted,
    referenceType: "lesson_progress",
    referenceId: params.lessonId,
    variables: {
      course_title: course.title,
      lesson_title: lesson.title,
      course_url: courseUrl,
      completed_at: fmtDateTime(snap.completedAt),
    },
    smsBody: `Lesson complete: "${lesson.title}" in ${course.title}. Continue: ${courseUrl}`,
  });
}

export type LiveSessionReminderWindow = "24h" | "1h";

const REMINDER_OFFSET_MS: Record<LiveSessionReminderWindow, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "1h": 60 * 60 * 1000,
};

/**
 * Send class reminders for sessions starting in a time window (deduped per learner + session + window).
 * Intended to be called from a scheduled job (`/api/lms/cron/live-session-reminders`).
 */
export async function sendLiveSessionReminders(params?: {
  organizationId?: bigint;
  window?: LiveSessionReminderWindow;
}) {
  const window = params?.window ?? "24h";
  const offset = REMINDER_OFFSET_MS[window];
  const now = Date.now();
  const windowStart = new Date(now + offset - 15 * 60 * 1000);
  const windowEnd = new Date(now + offset + 15 * 60 * 1000);
  const emailTemplate = LMS_EMAIL_TEMPLATE.classReminder;
  const smsKey = LMS_SMS_SETTING_KEY.classReminder;

  const sessions = await prisma.lmsLiveSession.findMany({
    where: {
      ...(params?.organizationId != null ? { organizationId: params.organizationId } : {}),
      status: LmsLiveSessionStatus.SCHEDULED,
      startsAt: { gte: windowStart, lte: windowEnd },
    },
    include: { course: { select: { id: true, title: true, slug: true } } },
    take: 200,
  });

  let sent = 0;
  for (const session of sessions) {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        organizationId: session.organizationId,
        courseId: session.courseId,
        status: LmsEnrollmentStatus.ACTIVE,
      },
      select: { id: true, studentUserId: true },
    });

    const startsLabel = fmtDateTime(session.startsAt);
    const meeting = session.meetingUrl?.trim() ?? "";
    const courseUrl = APP_URL
      ? `${APP_URL}${lmsMyLearningCoursePath(session.course)}`
      : lmsMyLearningCoursePath(session.course);

    for (const enr of enrollments) {
      await dispatchToStudent({
        organizationId: session.organizationId,
        studentUserId: enr.studentUserId,
        emailTemplate,
        smsSettingKey: smsKey,
        referenceType: "live_session",
        referenceId: session.id,
        dedupeSuffix: window,
        variables: {
          session_title: session.title,
          course_title: session.course.title,
          session_starts_at: startsLabel,
          meeting_url: meeting || courseUrl,
          reminder_window: window,
        },
        smsBody: `Reminder (${window}): "${session.title}" for ${session.course.title} starts ${startsLabel}.${meeting ? ` Join: ${meeting}` : ""}`,
      });
      sent++;
    }
  }

  return { sessions: sessions.length, recipients: sent, window };
}
