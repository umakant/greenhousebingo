#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Seed My Learning hub demo: 20 enrolled + 4 recommended courses with progress states.
 *
 * Usage:
 *   npm run db:seed:lms-my-learning:first-aid
 *   node ./scripts/seed-lms-my-learning-demo.js --email=crimson@mailsac.com
 *   node ./scripts/seed-lms-my-learning-demo.js --employee-email=staff@example.com --force
 */
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient, LmsEnrollmentStatus } = require("@prisma/client");
const {
  SEED_KEY,
  ENROLLED_COURSES,
  RECOMMENDED_COURSES,
  ALL_COURSES,
} = require("./lms-my-learning-demo-data");

const prisma = new PrismaClient({ log: ["error"] });
const FORCE = process.argv.includes("--force");

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const FILTER_COMPANY_EMAIL = readArg("--email");
const FILTER_COMPANY_NAME = readArg("--name");
const FILTER_EMPLOYEE_EMAIL = readArg("--employee-email");

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(23, 59, 59, 0);
  return d;
}

function daysAgo(n) {
  return daysFromNow(-n);
}

async function assertLmsSchema() {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "lms_courses" LIMIT 1`;
  } catch (e) {
    const msg = e && e.message ? String(e.message) : String(e);
    if (msg.includes("lms_courses") || msg.includes("does not exist")) {
      console.error("[lms-my-learning] LMS tables missing. Run: npm run db:migrate:deploy");
      process.exit(1);
    }
    throw e;
  }
}

async function ensureLmsAddon() {
  await prisma.addOn.updateMany({
    where: { module: "Lms" },
    data: { isEnable: true, updatedAt: new Date() },
  });
}

async function findCompany() {
  const where = { type: "company", isActive: true };
  if (FILTER_COMPANY_EMAIL) where.email = { equals: FILTER_COMPANY_EMAIL, mode: "insensitive" };
  if (FILTER_COMPANY_NAME) where.name = { contains: FILTER_COMPANY_NAME, mode: "insensitive" };
  return prisma.user.findFirst({
    where,
    orderBy: { id: "asc" },
    select: { id: true, name: true, email: true },
  });
}

async function findEmployeeUser(companyId) {
  if (FILTER_EMPLOYEE_EMAIL) {
    const u = await prisma.user.findFirst({
      where: {
        email: { equals: FILTER_EMPLOYEE_EMAIL, mode: "insensitive" },
        type: "staff",
        createdBy: companyId,
      },
      select: { id: true, email: true, name: true },
    });
    if (u) return u;
  }

  const hrm = await prisma.hrmEmployee.findFirst({
    where: { createdBy: companyId, userId: { not: null } },
    orderBy: { id: "asc" },
    select: { userId: true, firstName: true, lastName: true, email: true },
  });
  if (hrm?.userId) {
    const u = await prisma.user.findUnique({
      where: { id: hrm.userId },
      select: { id: true, email: true, name: true },
    });
    if (u) return u;
  }

  return prisma.user.findFirst({
    where: { type: "staff", createdBy: companyId, isActive: true },
    orderBy: { id: "asc" },
    select: { id: true, email: true, name: true },
  });
}

async function upsertCategory(orgId) {
  return prisma.courseCategory.upsert({
    where: { organizationId_slug: { organizationId: orgId, slug: "field-training" } },
    create: {
      organizationId: orgId,
      name: "Field Training",
      slug: "field-training",
      description: "Compliance and skills courses for First Aid Responders field staff.",
      sortOrder: 0,
    },
    update: { name: "Field Training", updatedAt: new Date() },
  });
}

async function upsertCourse(orgId, companyUserId, categoryId, def, enrollStudent) {
  const existing = await prisma.course.findFirst({
    where: { organizationId: orgId, slug: def.slug },
    select: { id: true },
  });

  if (existing && FORCE) {
    await prisma.courseLesson.deleteMany({ where: { courseId: existing.id } });
    await prisma.courseSection.deleteMany({ where: { courseId: existing.id } });
    await prisma.enrollment.deleteMany({ where: { courseId: existing.id } });
    await prisma.course.delete({ where: { id: existing.id } });
  }

  let course = existing
    ? await prisma.course.findUnique({ where: { id: existing.id } })
    : null;

  if (!course) {
    course = await prisma.course.create({
      data: {
        organizationId: orgId,
        categoryId,
        title: def.title,
        slug: def.slug,
        description: def.description,
        deliveryType: "VIDEO",
        isPublic: true,
        status: "PUBLISHED",
        coverImageUrl: def.coverImageUrl ?? null,
        createdById: companyUserId,
        updatedById: companyUserId,
      },
    });
  } else {
    course = await prisma.course.update({
      where: { id: course.id },
      data: {
        title: def.title,
        description: def.description,
        coverImageUrl: def.coverImageUrl ?? null,
        isPublic: true,
        status: "PUBLISHED",
        updatedAt: new Date(),
      },
    });
  }

  let section = await prisma.courseSection.findFirst({
    where: { courseId: course.id },
    select: { id: true },
  });
  if (!section) {
    section = await prisma.courseSection.create({
      data: {
        organizationId: orgId,
        courseId: course.id,
        title: "Course content",
        sortOrder: 0,
      },
    });
  }

  let lessons = await prisma.courseLesson.findMany({
    where: { courseId: course.id, isPublished: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });

  if (lessons.length === 0) {
    const lessonCount = 4;
    const durationEach = def.durationMinutes
      ? Math.round((def.durationMinutes * 60) / lessonCount)
      : 22 * 60 + 30;
    for (let i = 0; i < lessonCount; i++) {
      await prisma.courseLesson.create({
        data: {
          organizationId: orgId,
          courseId: course.id,
          sectionId: section.id,
          title: `Lesson ${i + 1}: ${def.title.split(" ").slice(0, 3).join(" ")}`,
          lessonType: i === 0 ? "VIDEO" : "TEXT",
          bodyText: `Training module ${i + 1} for ${def.title}.`,
          durationSeconds: durationEach,
          sortOrder: i,
          isPublished: true,
        },
      });
    }
    lessons = await prisma.courseLesson.findMany({
      where: { courseId: course.id, isPublished: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, sortOrder: true },
    });
  }

  if (!enrollStudent) return { course, lessons, enrollment: null };

  let accessEndsAt = null;
  if (def.dueInDays != null) accessEndsAt = daysFromNow(def.dueInDays);
  if (def.overdueDaysAgo != null) accessEndsAt = daysAgo(def.overdueDaysAgo);

  let enrollment = await prisma.enrollment.findFirst({
    where: { courseId: course.id, studentUserId: enrollStudent.id },
  });

  if (!enrollment) {
    enrollment = await prisma.enrollment.create({
      data: {
        organizationId: orgId,
        courseId: course.id,
        studentUserId: enrollStudent.id,
        status: LmsEnrollmentStatus.ACTIVE,
        accessEndsAt,
        enrolledAt: daysAgo(30 - (def.progress === "not_started" ? 5 : 20)),
      },
    });
  } else {
    enrollment = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { accessEndsAt, status: LmsEnrollmentStatus.ACTIVE, updatedAt: new Date() },
    });
  }

  await prisma.lmsLessonProgress.deleteMany({ where: { enrollmentId: enrollment.id } });

  const total = lessons.length;
  let completeCount = 0;
  if (def.progress === "completed") completeCount = total;
  else if (def.progress === "in_progress" && def.progressPercent) {
    completeCount = Math.min(total - 1, Math.round((def.progressPercent / 100) * total));
  } else if (def.progress === "overdue" && def.progressPercent) {
    completeCount = Math.min(total - 1, Math.round((def.progressPercent / 100) * total));
  }

  const now = new Date();
  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    const isComplete = i < completeCount;
    const engagedAt = daysAgo(isComplete ? 14 - i : 2);
    await prisma.lmsLessonProgress.create({
      data: {
        organizationId: orgId,
        enrollmentId: enrollment.id,
        lessonId: lesson.id,
        completedAt: isComplete ? engagedAt : null,
        lastEngagedAt: isComplete ? engagedAt : i === completeCount ? now : daysAgo(30),
      },
    });
  }

  if (def.progress === "not_started") {
    await prisma.lmsLessonProgress.deleteMany({ where: { enrollmentId: enrollment.id } });
  }

  return { course, lessons, enrollment };
}

async function seedLiveSessions(orgId) {
  const targets = ENROLLED_COURSES.filter((c) => c.progress === "in_progress").slice(0, 2);
  const starts = [daysFromNow(13), daysFromNow(20)];

  for (let i = 0; i < targets.length; i++) {
    const def = targets[i];
    const course = await prisma.course.findFirst({
      where: { organizationId: orgId, slug: def.slug },
      select: { id: true, title: true },
    });
    if (!course) continue;

    const section = await prisma.courseSection.findFirst({
      where: { courseId: course.id },
      select: { id: true },
    });
    if (!section) continue;

    const existing = await prisma.courseLesson.findFirst({
      where: { courseId: course.id, lessonType: "LIVE_CLASS" },
    });
    if (existing) continue;

    const start = starts[i];
    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    await prisma.courseLesson.create({
      data: {
        organizationId: orgId,
        courseId: course.id,
        sectionId: section.id,
        title: `${course.title} — Live Q&A`,
        lessonType: "LIVE_CLASS",
        bodyText: "Join the instructor for a live review session and Q&A.",
        liveStartsAt: start,
        liveEndsAt: end,
        externalLiveUrl: "https://meet.example.com/live-class",
        sortOrder: 99,
        isPublished: true,
      },
    });
  }
}

async function main() {
  await assertLmsSchema();

  const company = await findCompany();
  if (!company) {
    console.error("[lms-my-learning] Company not found. Use --email or --name.");
    process.exit(1);
  }

  const employee = await findEmployeeUser(company.id);
  if (!employee) {
    console.error("[lms-my-learning] No employee (staff) user found. Link an HRM employee or pass --employee-email.");
    process.exit(1);
  }

  console.log(`[lms-my-learning] Company: ${company.name} (${company.email})`);
  console.log(`[lms-my-learning] Learner: ${employee.name ?? employee.email} (${employee.email})`);

  await ensureLmsAddon();
  const category = await upsertCategory(company.id);

  for (const def of ENROLLED_COURSES) {
    await upsertCourse(company.id, company.id, category.id, def, employee);
  }
  for (const def of RECOMMENDED_COURSES) {
    await upsertCourse(company.id, company.id, category.id, def, null);
  }

  console.log(
    `[lms-my-learning] ✓ Seeded ${ENROLLED_COURSES.length} enrolled + ${RECOMMENDED_COURSES.length} recommended courses (${SEED_KEY}).`,
  );
  await seedLiveSessions(company.id);
  console.log("[lms-my-learning] Open /lms/my-learning or /lms/student/dashboard as the employee user.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
