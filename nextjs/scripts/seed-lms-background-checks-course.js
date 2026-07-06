#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Seed "Background Checks: Turning Screening into Funds" for a company tenant (production-safe upsert).
 *
 * Usage:
 *   npm run db:seed:lms-background-checks:first-aid-prod
 *   node ./scripts/seed-lms-background-checks-course.js --name="First Aid Responders"
 *   node ./scripts/seed-lms-background-checks-course.js --email=crimson@mailsac.com --force
 *
 * Env: none required (uses .env.local / .env for DATABASE_URL)
 */
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const { COURSE, COURSE_SLUG, SEED_KEY } = require("./lms-background-checks-course-data");

const prisma = new PrismaClient({ log: ["error"] });
const FORCE = process.argv.includes("--force");

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const FILTER_EMAIL = readArg("--email");
const FILTER_NAME = readArg("--name");

async function assertLmsSchema() {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "lms_courses" LIMIT 1`;
  } catch (e) {
    const msg = e && e.message ? String(e.message) : String(e);
    if (msg.includes("lms_courses") || msg.includes("does not exist")) {
      console.error("[lms-background-checks] LMS tables missing. Run: npm run db:migrate:deploy");
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

async function removeExistingCourse(orgId) {
  const existing = await prisma.course.findFirst({
    where: {
      organizationId: orgId,
      OR: [{ slug: COURSE_SLUG }, { title: { equals: COURSE.title, mode: "insensitive" } }],
    },
    select: { id: true },
  });
  if (!existing) return;

  await prisma.courseLesson.deleteMany({ where: { courseId: existing.id } });
  await prisma.courseSection.deleteMany({ where: { courseId: existing.id } });
  await prisma.courseInstructor.deleteMany({ where: { courseId: existing.id } });
  await prisma.courseTagOnCourse.deleteMany({ where: { courseId: existing.id } });
  await prisma.enrollment.deleteMany({ where: { courseId: existing.id } });
  await prisma.course.delete({ where: { id: existing.id } });
  console.log(`[lms-background-checks] Removed existing course #${existing.id} (--force)`);
}

async function upsertCategory(orgId) {
  const cat = COURSE.category;
  return prisma.courseCategory.upsert({
    where: { organizationId_slug: { organizationId: orgId, slug: cat.slug } },
    create: {
      organizationId: orgId,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      sortOrder: 0,
    },
    update: {
      name: cat.name,
      description: cat.description,
      updatedAt: new Date(),
    },
  });
}

async function upsertInstructorProfile(orgId, companyUserId) {
  const inst = COURSE.instructor;
  return prisma.instructorProfile.upsert({
    where: { organizationId_userId: { organizationId: orgId, userId: companyUserId } },
    create: {
      organizationId: orgId,
      userId: companyUserId,
      displayName: inst.displayName,
      headline: inst.headline,
      bio: inst.bio,
      expertise: inst.expertise,
      isActive: true,
      commissionPercent: 0,
    },
    update: {
      displayName: inst.displayName,
      headline: inst.headline,
      bio: inst.bio,
      expertise: inst.expertise,
      isActive: true,
      updatedAt: new Date(),
    },
  });
}

async function syncLesson(orgId, courseId, sectionId, sortOrder, lessonDef) {
  const existing = await prisma.courseLesson.findFirst({
    where: { courseId, sectionId, title: lessonDef.title },
    select: { id: true },
  });

  const data = {
    lessonType: lessonDef.lessonType,
    bodyText: lessonDef.bodyText ?? null,
    videoUrl: lessonDef.videoUrl ?? null,
    durationSeconds: lessonDef.durationSeconds ?? null,
    sortOrder,
    isPublished: lessonDef.isPublished !== false,
    updatedAt: new Date(),
  };

  if (existing) {
    await prisma.courseLesson.update({ where: { id: existing.id }, data });
    return existing.id;
  }

  const created = await prisma.courseLesson.create({
    data: {
      organizationId: orgId,
      courseId,
      sectionId,
      title: lessonDef.title,
      ...data,
    },
  });
  return created.id;
}

async function syncCurriculum(orgId, courseId) {
  let lessonCount = 0;

  for (let si = 0; si < COURSE.sections.length; si++) {
    const secDef = COURSE.sections[si];
    let section = await prisma.courseSection.findFirst({
      where: { courseId, title: secDef.title },
      select: { id: true },
    });

    if (!section) {
      section = await prisma.courseSection.create({
        data: {
          organizationId: orgId,
          courseId,
          title: secDef.title,
          sortOrder: si,
        },
      });
      console.log(`[lms-background-checks] Added section "${secDef.title}"`);
    } else {
      await prisma.courseSection.update({
        where: { id: section.id },
        data: { sortOrder: si, updatedAt: new Date() },
      });
    }

    for (let li = 0; li < secDef.lessons.length; li++) {
      await syncLesson(orgId, courseId, section.id, li, secDef.lessons[li]);
      lessonCount += 1;
    }
  }

  console.log(
    `[lms-background-checks] ✓ Synced curriculum for course #${courseId} — ${lessonCount} lessons`,
  );
  return lessonCount;
}

async function seedCourse(orgId, companyUserId) {
  const existing = await prisma.course.findFirst({
    where: { organizationId: orgId, slug: COURSE_SLUG },
    select: { id: true },
  });

  if (existing && !FORCE) {
    const count = await syncCurriculum(orgId, existing.id);
    console.log(
      `[lms-background-checks] Course already exists (#${existing.id}). Synced ${count} lessons (use --force to replace from scratch).`,
    );
    return existing.id;
  }

  if (existing && FORCE) {
    await removeExistingCourse(orgId);
  }

  const category = await upsertCategory(orgId);
  const instructorProfile = await upsertInstructorProfile(orgId, companyUserId);

  const course = await prisma.course.create({
    data: {
      organizationId: orgId,
      categoryId: category.id,
      title: COURSE.title,
      slug: COURSE.slug,
      description: COURSE.description,
      deliveryType: COURSE.deliveryType,
      isPublic: COURSE.isPublic,
      status: COURSE.status,
      createdById: companyUserId,
      updatedById: companyUserId,
    },
  });

  await prisma.courseInstructor.create({
    data: {
      organizationId: orgId,
      courseId: course.id,
      instructorProfileId: instructorProfile.id,
      role: "lead",
      isPrimary: true,
    },
  });

  for (let si = 0; si < COURSE.sections.length; si++) {
    const secDef = COURSE.sections[si];
    const section = await prisma.courseSection.create({
      data: {
        organizationId: orgId,
        courseId: course.id,
        title: secDef.title,
        sortOrder: si,
      },
    });

    for (let li = 0; li < secDef.lessons.length; li++) {
      const lesson = secDef.lessons[li];
      await prisma.courseLesson.create({
        data: {
          organizationId: orgId,
          courseId: course.id,
          sectionId: section.id,
          title: lesson.title,
          lessonType: lesson.lessonType,
          bodyText: lesson.bodyText ?? null,
          videoUrl: lesson.videoUrl ?? null,
          durationSeconds: lesson.durationSeconds ?? null,
          sortOrder: li,
          isPublished: lesson.isPublished !== false,
        },
      });
    }
  }

  console.log(
    `[lms-background-checks] ✓ Created "${COURSE.title}" (#${course.id}) — ${COURSE.sections[0].lessons.length} lessons`,
  );
  console.log(`[lms-background-checks] Open /lms/courses or /lms/my-learning`);
  return course.id;
}

async function seedCompany(company) {
  console.log(`[lms-background-checks] Seeding for ${company.name} (${company.email})…`);
  await ensureLmsAddon();
  await seedCourse(company.id, company.id);
}

async function main() {
  await assertLmsSchema();

  const where = { type: "company", isActive: true };
  if (FILTER_EMAIL) where.email = { equals: FILTER_EMAIL, mode: "insensitive" };
  if (FILTER_NAME) where.name = { contains: FILTER_NAME, mode: "insensitive" };

  const companies = await prisma.user.findMany({
    where,
    orderBy: { id: "asc" },
    select: { id: true, name: true, email: true },
  });

  if (!companies.length) {
    console.error(
      '[lms-background-checks] No company user found. Try --name="First Aid Responders" or --email=crimson@mailsac.com',
    );
    process.exit(1);
  }

  for (const company of companies) {
    await seedCompany(company);
  }

  console.log(`[lms-background-checks] Done (${SEED_KEY}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
