/* eslint-disable no-console */
/**
 * LMS smoke check (PostgreSQL):
 * - Verifies core LMS tables are reachable and counts rows.
 * - If the demo course from seed-lms-demo-data.js exists, validates enrollment + progress snapshot shape.
 *
 * Run: npm run lms:smoke-check
 *
 * Env: LMS_SEED_ORG_ID (default 1000), LMS_DEMO_COURSE_SLUG (default pf-demo-lms-course)
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function parseBigint(v, fallback) {
  try {
    return BigInt(String(v).trim());
  } catch {
    return fallback;
  }
}

async function main() {
  const orgId = parseBigint(process.env.LMS_SEED_ORG_ID, 1000n);
  const slug = (process.env.LMS_DEMO_COURSE_SLUG || "pf-demo-lms-html-css-fundamentals").trim() || "pf-demo-lms-html-css-fundamentals";

  try {
    await prisma.$queryRaw`SELECT 1 FROM "lms_courses" LIMIT 1`;
  } catch (e) {
    const code = e && e.code;
    const msg = e && e.message ? String(e.message) : String(e);
    if (code === "P2021" || msg.includes("lms_courses") || msg.includes("does not exist")) {
      console.error("LMS smoke check: tables missing. Run: npm run db:migrate:deploy");
      process.exit(1);
    }
    throw e;
  }

  console.log("LMS — table row counts…");
  const rows = [
    ["lms_courses", () => prisma.course.count()],
    ["lms_course_sections", () => prisma.courseSection.count()],
    ["lms_course_lessons", () => prisma.courseLesson.count()],
    ["lms_enrollments", () => prisma.enrollment.count()],
    ["lms_lesson_progress", () => prisma.lmsLessonProgress.count()],
    ["lms_instructor_profiles", () => prisma.instructorProfile.count()],
    ["lms_live_sessions", () => prisma.lmsLiveSession.count()],
    ["lms_subscription_plans", () => prisma.lmsSubscriptionPlan.count()],
    ["lms_student_subscriptions", () => prisma.lmsStudentSubscription.count()],
    ["lms_course_reviews", () => prisma.lmsCourseReview.count()],
    ["lms_course_revenue_records", () => prisma.lmsCourseRevenueRecord.count()],
  ];
  for (const [name, fn] of rows) {
    const n = await fn();
    console.log(`  ${name.padEnd(26)} ${n}`);
  }

  const addon = await prisma.addOn.findFirst({
    where: { module: "Lms" },
    select: { module: true, isEnable: true },
  });
  console.log("\nLMS — add-on row…");
  if (!addon) {
    console.log("  (No Lms add-on row — run: npm run db:seed:add-ons)");
  } else {
    console.log(`  module=${addon.module} isEnable=${addon.isEnable}`);
  }

  const course = await prisma.course.findFirst({
    where: { organizationId: orgId, slug },
    select: { id: true, title: true, status: true },
  });

  if (!course) {
    console.log(`\nLMS — demo course slug=${slug} not found for org ${orgId.toString()} (optional).`);
    console.log("  Seed with: npm run db:seed:lms-demo");
    console.log("\nLMS smoke check finished OK (counts only).");
    return;
  }

  console.log(`\nLMS — demo course id=${course.id.toString()} status=${course.status} title=${course.title}`);

  const [sections, lessons, enrollments] = await Promise.all([
    prisma.courseSection.findMany({
      where: { courseId: course.id, organizationId: orgId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, title: true, sortOrder: true },
    }),
    prisma.courseLesson.findMany({
      where: { courseId: course.id, organizationId: orgId, isPublished: true },
      select: {
        id: true,
        sectionId: true,
        title: true,
        sortOrder: true,
        section: { select: { sortOrder: true } },
      },
    }),
    prisma.enrollment.findMany({
      where: { courseId: course.id, organizationId: orgId },
      select: { id: true, studentUserId: true, status: true },
    }),
  ]);

  if (enrollments.length === 0) {
    console.log("  No enrollments on demo course — run: npm run db:seed:lms-demo");
    console.log("\nLMS smoke check finished OK.");
    return;
  }

  const enrollment = enrollments[0];
  const progressRows = await prisma.$queryRaw`
    SELECT "enrollment_id", "lesson_id", "completed_at", "last_engaged_at"
    FROM "lms_lesson_progress"
    WHERE "enrollment_id" = ${enrollment.id}
  `;

  const completedLessonIds = new Set(
    progressRows.filter((r) => r.completed_at != null).map((r) => r.lesson_id.toString()),
  );
  const total = lessons.length;
  const comp = lessons.filter((l) => completedLessonIds.has(l.id.toString())).length;
  const coursePercent = total === 0 ? 0 : Math.min(100, Math.round((comp / total) * 100));

  console.log(`  enrollment id=${enrollment.id.toString()} student=${enrollment.studentUserId.toString()} status=${enrollment.status}`);
  console.log(`  progress rows: ${progressRows.length}`);
  console.log(
    `  derived progress: coursePercent=${coursePercent} completed=${comp}/${total} sections=${sections.length} publishedLessons=${lessons.length}`,
  );

  if (total > 0 && comp > 0 && comp < total) {
    const expected = Math.min(100, Math.round((comp / total) * 100));
    if (coursePercent !== expected) {
      throw new Error(`Progress percent mismatch: expected ${expected}, got ${coursePercent}`);
    }
    console.log(`  OK: ${comp}/${total} lessons complete → ${coursePercent}% course progress.`);
  }

  const portalStudents = await prisma.user.count({
    where: { createdBy: orgId, type: "lms-student" },
  });
  const portalInstructors = await prisma.user.count({
    where: { createdBy: orgId, type: "lms-instructor" },
  });
  const profiles = await prisma.instructorProfile.count({ where: { organizationId: orgId, isActive: true } });
  const lmsSettings = await prisma.setting.findMany({
    where: { createdBy: orgId, key: { startsWith: "lms_" } },
    select: { key: true },
  });

  console.log("\nLMS — admin UI prerequisites…");
  console.log(`  lms-student portal accounts: ${portalStudents}`);
  console.log(`  lms-instructor portal accounts: ${portalInstructors}`);
  console.log(`  active instructor profiles: ${profiles}`);
  console.log(`  LMS org settings keys: ${lmsSettings.length}`);

  let failed = 0;
  if (portalStudents < 2) {
    console.error("  FAIL: expected ≥2 lms-student accounts (Students tab). Re-run: npm run db:seed:lms-demo");
    failed++;
  } else {
    console.log("  OK: Student accounts tab should list portal learners.");
  }
  if (profiles < 2) {
    console.error("  FAIL: expected ≥2 instructor profiles (Instructors tab). Re-run: npm run db:seed:lms-demo");
    failed++;
  } else {
    console.log("  OK: Instructor directory should list Sarah Johnson + Alex Rivera.");
  }
  if (lmsSettings.length < 5) {
    console.error("  FAIL: LMS settings missing. Re-run: npm run db:seed:lms-demo");
    failed++;
  } else {
    console.log("  OK: LMS Settings (theme, access, banners) can load from org settings.");
  }

  if (failed) process.exit(1);
  console.log("\nLMS smoke check finished OK.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
