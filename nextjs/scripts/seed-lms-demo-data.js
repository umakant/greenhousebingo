/* eslint-disable no-console */
/**
 * Comprehensive LMS seed with real Web Development courses.
 *
 * Targets demo company org id 1000 (company@example.com) by default.
 * Primary learner: staff@example.com (1001). Instructor: hr@example.com (1010).
 *
 * Run: npm run db:seed:lms-demo
 *
 * Env: LMS_SEED_ORG_ID, LMS_SEED_STUDENT_ID, LMS_SEED_INSTRUCTOR_ID
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const {
  WEB_DEV_CATEGORY,
  WEB_DEV_TAGS,
  PRIMARY_COURSE_SLUG_SUFFIX,
  buildWebDevCourses,
} = require("./lms-web-dev-courses-data");

const prisma = new PrismaClient();
const USER_MODEL_TYPE = "App\\Models\\User";
const GUARD_NAME = "web";

const LMS_ORG_KEY = "saas_lms_enabled";
const SLUG_PREFIX = "pf-demo-lms-";

const LMS_STUDENT_PERMS = [
  "manage-dashboard",
  "manage-profile",
  "edit-profile",
  "change-password-profile",
  "manage-lms-student-dashboard",
  "view-lms-student-dashboard",
];

const LMS_INSTRUCTOR_PERMS = [
  "manage-dashboard",
  "manage-profile",
  "edit-profile",
  "change-password-profile",
  "manage-lms-instructor-dashboard",
  "manage-lms-instructor-profile",
  "view-lms-instructor-assignments",
  "manage-lms-instructor-courses",
];

function titleizePermission(name) {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function parseBigint(v, fallback) {
  try {
    return BigInt(String(v).trim());
  } catch {
    return fallback;
  }
}

function slug(s) {
  return `${SLUG_PREFIX}${s}`;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function nextSettingId() {
  const agg = await prisma.setting.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function upsertOrgSetting(organizationId, key, value) {
  const existing = await prisma.setting.findFirst({
    where: { createdBy: organizationId, key },
    select: { id: true },
  });
  if (existing) {
    await prisma.setting.update({
      where: { id: existing.id },
      data: { value: String(value), updatedAt: new Date() },
    });
  } else {
    await prisma.setting.create({
      data: {
        id: await nextSettingId(),
        key,
        value: String(value),
        isPublic: true,
        createdBy: organizationId,
        createdAt: new Date(),
      },
    });
  }
}

async function ensurePlanIncludesLms(planId) {
  if (planId == null) return;
  const plan = await prisma.plan.findFirst({
    where: { id: planId },
    select: { id: true, modules: true },
  });
  if (!plan) return;
  const raw = plan.modules;
  const arr = Array.isArray(raw) ? raw.map((x) => String(x).trim().toLowerCase()).filter(Boolean) : [];
  if (arr.includes("lms")) return;
  await prisma.plan.update({
    where: { id: plan.id },
    data: { modules: [...arr, "lms"], updatedAt: new Date() },
  });
  console.log(`[seed-lms-demo] Appended "lms" to plan ${plan.id.toString()}.`);
}

async function assertLmsSchema() {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "lms_courses" LIMIT 1`;
  } catch (e) {
    const msg = e && e.message ? String(e.message) : String(e);
    if (msg.includes("lms_courses") || msg.includes("does not exist")) {
      console.error("[seed-lms-demo] LMS tables missing. Run: npm run db:migrate:deploy");
      process.exit(1);
    }
    throw e;
  }
}

async function lmsRoleId(roleName) {
  const role = await prisma.role.findFirst({
    where: { name: roleName },
    select: { id: true },
  });
  return role?.id ?? null;
}

/** Ensures lms-student / lms-instructor roles exist with portal permissions. */
async function ensureLmsPortalRoles() {
  for (const [roleName, label, permissionNames] of [
    ["lms-student", "LMS Student", LMS_STUDENT_PERMS],
    ["lms-instructor", "LMS Instructor", LMS_INSTRUCTOR_PERMS],
  ]) {
    let role = await prisma.role.findFirst({
      where: { name: roleName, guardName: GUARD_NAME },
      select: { id: true },
    });
    if (!role) {
      const maxRole = await prisma.role.aggregate({ _max: { id: true } });
      role = await prisma.role.create({
        data: {
          id: (maxRole._max.id ?? 0n) + 1n,
          name: roleName,
          label,
          guardName: GUARD_NAME,
          editable: false,
        },
        select: { id: true },
      });
      console.log(`[seed-lms-demo] Created role "${roleName}"`);
    }

    const maxPerm = await prisma.permission.aggregate({ _max: { id: true } });
    let nextPermId = (maxPerm._max.id ?? 0n) + 1n;
    const permissionIds = [];
    for (const name of permissionNames) {
      let perm = await prisma.permission.findFirst({
        where: { name, guardName: GUARD_NAME },
        select: { id: true },
      });
      if (!perm) {
        perm = await prisma.permission.create({
          data: {
            id: nextPermId++,
            name,
            guardName: GUARD_NAME,
            addOn: "Lms",
            module: "Lms",
            label: titleizePermission(name),
          },
          select: { id: true },
        });
      }
      permissionIds.push(perm.id);
    }

    const linked = new Set(
      (
        await prisma.roleHasPermission.findMany({
          where: { roleId: role.id },
          select: { permissionId: true },
        })
      ).map((r) => r.permissionId.toString()),
    );
    for (const permissionId of permissionIds) {
      if (linked.has(permissionId.toString())) continue;
      await prisma.roleHasPermission.create({
        data: { roleId: role.id, permissionId },
      });
    }
  }
}

async function removePriorDemoLiveSessions(orgId, courseId) {
  const sessions = await prisma.lmsLiveSession.findMany({
    where: {
      organizationId: orgId,
      courseId,
      title: { startsWith: "Web Dev Bootcamp" },
    },
    select: { id: true },
  });
  for (const session of sessions) {
    await prisma.lmsLiveAttendance.deleteMany({ where: { sessionId: session.id } });
    await prisma.lmsLiveSession.delete({ where: { id: session.id } });
  }
}

/** Company-created LMS portal login (shows on Students / Instructors admin tabs). */
async function ensureLmsPortalUser({ orgId, email, name, userType, roleName, passwordHash }) {
  const normalizedEmail = email.trim().toLowerCase();
  let user = await prisma.user.findFirst({
    where: { email: normalizedEmail },
    select: { id: true, createdBy: true, type: true },
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        type: userType,
        createdBy: orgId,
        isActive: true,
        isEnableLogin: true,
        password: passwordHash,
      },
    });
  } else {
    const maxUser = await prisma.user.aggregate({ _max: { id: true } });
    const id = (maxUser._max.id ?? 0n) + 1n;
    user = await prisma.user.create({
      data: {
        id,
        name,
        email: normalizedEmail,
        password: passwordHash,
        type: userType,
        createdBy: orgId,
        isActive: true,
        isEnableLogin: true,
        emailVerifiedAt: new Date(),
      },
      select: { id: true },
    });
    console.log(`[seed-lms-demo] Created portal user ${normalizedEmail} (${userType})`);
  }

  const roleId = await lmsRoleId(roleName);
  if (roleId) {
    await prisma.modelHasRole.deleteMany({
      where: { modelId: user.id, modelType: USER_MODEL_TYPE },
    });
    await prisma.modelHasRole.create({
      data: { roleId, modelId: user.id, modelType: USER_MODEL_TYPE },
    });
  } else {
    console.warn(`[seed-lms-demo] Role "${roleName}" missing — assign via Settings → sync roles`);
  }

  return user.id;
}

async function removePriorDemoCourses(orgId) {
  const prior = await prisma.course.findMany({
    where: { organizationId: orgId, slug: { startsWith: SLUG_PREFIX } },
    select: { id: true, slug: true },
  });
  for (const c of prior) {
    await prisma.course.delete({ where: { id: c.id } });
    console.log(`[seed-lms-demo] Removed prior course slug=${c.slug}`);
  }
}

async function seedLmsOrgSettings(orgId) {
  const keys = {
    lms_maintenance_mode: "0",
    lms_maintenance_message: "The learning portal is temporarily unavailable.",
    lms_mobile_only_mode: "0",
    lms_default_locale: "en",
    lms_rtl_mode: "inherit",
    lms_gdpr_enabled: "1",
    lms_gdpr_require_consent: "0",
    lms_gdpr_banner_text: "We process learning activity to deliver courses.",
    lms_primary_color: "#2563eb",
    lms_font_family: "Inter, system-ui, sans-serif",
    lms_first_purchase_coupon_code: "FIRSTLMS10",
    lms_ad_banners_json: JSON.stringify([
      {
        id: "demo-banner-1",
        title: "Welcome to Paper Flight LMS",
        imageUrl: "https://placehold.co/1200x200/2563eb/ffffff?text=LMS+Demo",
        linkUrl: "/lms/my-learning/pf-demo-lms-html-css-fundamentals",
        active: true,
      },
    ]),
    saas_lms_enabled: "1",
  };
  for (const [key, value] of Object.entries(keys)) {
    await upsertOrgSetting(orgId, key, value);
  }
  console.log("[seed-lms-demo] LMS org settings + saas_lms_enabled");
}

async function createCourseWithCurriculum({
  orgId,
  createdById,
  title,
  courseSlug,
  description,
  deliveryType,
  isPublic,
  status,
  salePrice,
  categoryId,
  sections,
}) {
  const course = await prisma.course.create({
    data: {
      organizationId: orgId,
      categoryId,
      title,
      slug: courseSlug,
      description,
      deliveryType,
      isPublic,
      status,
      salePrice: salePrice != null ? salePrice : null,
      saleCurrency: "USD",
      createdById,
    },
  });

  const lessonIds = [];
  for (let si = 0; si < sections.length; si++) {
    const secDef = sections[si];
    const sec = await prisma.courseSection.create({
      data: {
        organizationId: orgId,
        courseId: course.id,
        title: secDef.title,
        sortOrder: si,
      },
    });
    for (let li = 0; li < secDef.lessons.length; li++) {
      const l = secDef.lessons[li];
      const lesson = await prisma.courseLesson.create({
        data: {
          organizationId: orgId,
          courseId: course.id,
          sectionId: sec.id,
          title: l.title,
          lessonType: l.lessonType,
          bodyText: l.bodyText ?? null,
          videoUrl: l.videoUrl ?? null,
          externalLiveUrl: l.externalLiveUrl ?? null,
          liveStartsAt: l.liveStartsAt ?? null,
          liveEndsAt: l.liveEndsAt ?? null,
          sortOrder: li,
          isPublished: l.isPublished !== false,
        },
      });
      lessonIds.push({ id: lesson.id, ...l });
    }
  }
  return { course, lessonIds };
}

async function main() {
  const orgId = parseBigint(process.env.LMS_SEED_ORG_ID, 1000n);
  const studentId = parseBigint(process.env.LMS_SEED_STUDENT_ID, 1001n);
  const student2Id = parseBigint(process.env.LMS_SEED_STUDENT_ID_2, 1012n);
  const instructorUserId = parseBigint(process.env.LMS_SEED_INSTRUCTOR_ID, 1010n);

  await assertLmsSchema();

  const company = await prisma.user.findFirst({
    where: { id: orgId, type: { in: ["company", "company_admin"] } },
    select: { id: true, activePlan: true, email: true },
  });
  if (!company) {
    console.error(`[seed-lms-demo] No company at id=${orgId}. Run: npm run db:seed:company`);
    process.exit(1);
  }

  for (const [label, uid] of [
    ["student", studentId],
    ["student2", student2Id],
    ["instructor", instructorUserId],
  ]) {
    const u = await prisma.user.findFirst({ where: { id: uid }, select: { id: true, email: true } });
    if (!u) {
      console.error(`[seed-lms-demo] Missing ${label} user id=${uid}.`);
      process.exit(1);
    }
  }

  console.log(`[seed-lms-demo] Org ${orgId} (${company.email})`);

  await ensureLmsPortalRoles();
  await prisma.addOn.updateMany({ where: { module: "Lms" }, data: { isEnable: true, updatedAt: new Date() } });
  const planId =
    company.activePlan != null && Number.isSafeInteger(company.activePlan) ? BigInt(company.activePlan) : null;
  await ensurePlanIncludesLms(planId);
  await seedLmsOrgSettings(orgId);
  await removePriorDemoCourses(orgId);

  const demoHash = await bcrypt.hash("1234", 10);
  const portalStudent1Id = await ensureLmsPortalUser({
    orgId,
    email: "learner.demo@example.com",
    name: "Umakant Sonwani",
    userType: "lms-student",
    roleName: "lms-student",
    passwordHash: demoHash,
  });
  const portalStudent2Id = await ensureLmsPortalUser({
    orgId,
    email: "anshul.demo@example.com",
    name: "Anshul Demo",
    userType: "lms-student",
    roleName: "lms-student",
    passwordHash: demoHash,
  });
  const portalInstructorId = await ensureLmsPortalUser({
    orgId,
    email: "instructor.portal@example.com",
    name: "Alex Rivera",
    userType: "lms-instructor",
    roleName: "lms-instructor",
    passwordHash: demoHash,
  });

  const category = await prisma.courseCategory.upsert({
    where: { organizationId_slug: { organizationId: orgId, slug: slug(WEB_DEV_CATEGORY.slugSuffix) } },
    create: {
      organizationId: orgId,
      name: WEB_DEV_CATEGORY.name,
      slug: slug(WEB_DEV_CATEGORY.slugSuffix),
      description: WEB_DEV_CATEGORY.description,
      sortOrder: 0,
    },
    update: { name: WEB_DEV_CATEGORY.name, description: WEB_DEV_CATEGORY.description, updatedAt: new Date() },
  });

  const tagRecords = {};
  for (let i = 0; i < WEB_DEV_TAGS.length; i++) {
    const t = WEB_DEV_TAGS[i];
    const row = await prisma.courseTag.upsert({
      where: { organizationId_slug: { organizationId: orgId, slug: slug(t.slugSuffix) } },
      create: { organizationId: orgId, name: t.name, slug: slug(t.slugSuffix) },
      update: { name: t.name, updatedAt: new Date() },
    });
    tagRecords[t.key] = row;
  }

  const portalInstructorProfile = await prisma.instructorProfile.upsert({
    where: { organizationId_userId: { organizationId: orgId, userId: portalInstructorId } },
    create: {
      organizationId: orgId,
      userId: portalInstructorId,
      displayName: "Alex Rivera",
      headline: "Full-stack instructor & live cohort lead",
      bio: "Alex teaches React, Node.js, and live bootcamp sessions. Portal login for instructor dashboard and impersonation tests.",
      expertise: ["React", "Node.js", "Live instruction"],
      isActive: true,
      commissionPercent: 10,
    },
    update: {
      displayName: "Alex Rivera",
      headline: "Full-stack instructor & live cohort lead",
      isActive: true,
      updatedAt: new Date(),
    },
  });

  const instructorProfile = await prisma.instructorProfile.upsert({
    where: { organizationId_userId: { organizationId: orgId, userId: instructorUserId } },
    create: {
      organizationId: orgId,
      userId: instructorUserId,
      displayName: "Sarah Johnson",
      headline: "Senior web development instructor",
      bio: "Sarah leads HTML, CSS, JavaScript, and Next.js tracks with 10+ years teaching professional developers.",
      expertise: ["HTML/CSS", "JavaScript", "Next.js", "Training"],
      isActive: true,
      commissionPercent: 15,
    },
    update: {
      displayName: "Sarah Johnson",
      headline: "Senior web development instructor",
      isActive: true,
      updatedAt: new Date(),
    },
  });

  const liveKickoffStart = daysFromNow(3);
  const liveKickoffEnd = new Date(liveKickoffStart.getTime() + 90 * 60 * 1000);
  const courseDefs = buildWebDevCourses(slug, { liveKickoffStart, liveKickoffEnd });

  /** @type {Record<string, { course: import('@prisma/client').Course; lessonIds: Array<{ id: bigint }> }>} */
  const seeded = {};
  for (const def of courseDefs) {
    const { tagKeys, ...courseInput } = def;
    const { course, lessonIds } = await createCourseWithCurriculum({
      orgId,
      createdById: orgId,
      categoryId: category.id,
      ...courseInput,
    });
    seeded[def.courseSlug] = { course, lessonIds };

    if (Array.isArray(tagKeys)) {
      for (const key of tagKeys) {
        const tag = tagRecords[key];
        if (!tag) continue;
        await prisma.courseTagOnCourse.upsert({
          where: { courseId_tagId: { courseId: course.id, tagId: tag.id } },
          create: { organizationId: orgId, courseId: course.id, tagId: tag.id },
          update: {},
        });
      }
    }
  }

  const courseHtmlCss = seeded[slug("html-css-fundamentals")].course;
  const htmlCssLessons = seeded[slug("html-css-fundamentals")].lessonIds;
  const courseJavascript = seeded[slug("javascript-essentials")].course;
  const courseReact = seeded[slug("react-nextjs")].course;
  const courseBootcamp = seeded[slug("fullstack-bootcamp-live")].course;
  const bootcampLessons = seeded[slug("fullstack-bootcamp-live")].lessonIds;
  const courseNodeApis = seeded[slug("nodejs-rest-apis")].course;
  const courseDraft = seeded[slug("typescript-draft")].course;

  const instructorCourses = [courseHtmlCss, courseJavascript, courseReact, courseBootcamp];
  for (const c of instructorCourses) {
    for (const profile of [instructorProfile, portalInstructorProfile]) {
      await prisma.courseInstructor.upsert({
        where: {
          courseId_instructorProfileId: { courseId: c.id, instructorProfileId: profile.id },
        },
        create: {
          organizationId: orgId,
          courseId: c.id,
          instructorProfileId: profile.id,
          role: profile.id === instructorProfile.id ? "lead" : "assistant",
          isPrimary: profile.id === instructorProfile.id,
          commissionPercent: profile.id === instructorProfile.id ? 15 : 10,
        },
        update: { isPrimary: profile.id === instructorProfile.id },
      });
    }
  }

  async function enroll(studentUserId, courseId, extra = {}) {
    return prisma.enrollment.upsert({
      where: { courseId_studentUserId: { courseId, studentUserId } },
      create: {
        organizationId: orgId,
        courseId,
        studentUserId,
        status: "ACTIVE",
        purchaseKind: extra.purchaseKind ?? "FREE",
        instructorUserId: extra.instructorUserId ?? instructorUserId,
        ...extra,
      },
      update: { status: "ACTIVE", updatedAt: new Date() },
    });
  }

  const enrMain = await enroll(studentId, courseHtmlCss.id);
  const enrBootcamp = await enroll(studentId, courseBootcamp.id);
  const enrNodeApis = await enroll(studentId, courseNodeApis.id);
  await enroll(studentId, courseJavascript.id);
  await enroll(student2Id, courseHtmlCss.id);
  await enroll(student2Id, courseReact.id, { purchaseKind: "MANUAL" });
  await enroll(orgId, courseHtmlCss.id, { purchaseKind: "COMPED" });
  await enroll(portalStudent1Id, courseHtmlCss.id);
  await enroll(portalStudent1Id, courseBootcamp.id);
  await enroll(portalStudent2Id, courseHtmlCss.id);
  await enroll(portalStudent2Id, courseReact.id, { purchaseKind: "MANUAL" });

  const now = new Date();
  const [lessonA, lessonB] = htmlCssLessons;
  await prisma.lmsLessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrMain.id, lessonId: lessonA.id } },
    create: {
      organizationId: orgId,
      enrollmentId: enrMain.id,
      lessonId: lessonA.id,
      completedAt: now,
      lastEngagedAt: now,
    },
    update: { completedAt: now, lastEngagedAt: now },
  });
  await prisma.lmsLessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrMain.id, lessonId: lessonB.id } },
    create: {
      organizationId: orgId,
      enrollmentId: enrMain.id,
      lessonId: lessonB.id,
      completedAt: null,
      lastEngagedAt: now,
    },
    update: { lastEngagedAt: now },
  });

  const liveKickoffLesson = bootcampLessons[0];
  await removePriorDemoLiveSessions(orgId, courseBootcamp.id);
  const sessionUpcoming = await prisma.lmsLiveSession.create({
    data: {
      organizationId: orgId,
      courseId: courseBootcamp.id,
      courseLessonId: liveKickoffLesson?.id ?? null,
      title: "Web Dev Bootcamp — Week 1 kickoff",
      description: "Live cohort kickoff: environment setup, Git workflow, and HTML/CSS review.",
      startsAt: liveKickoffStart,
      endsAt: liveKickoffEnd,
      meetingProvider: "GOOGLE_MEET",
      meetingUrl: "https://meet.google.com/pf-webdev-bootcamp-w1",
      capacity: 50,
      status: "SCHEDULED",
      createdById: instructorUserId,
    },
  });

  const sessionPast = await prisma.lmsLiveSession.create({
    data: {
      organizationId: orgId,
      courseId: courseBootcamp.id,
      title: "Web Dev Bootcamp — Orientation recap",
      description: "Recorded recap from the previous cohort orientation.",
      startsAt: daysFromNow(-7),
      endsAt: daysFromNow(-7),
      meetingProvider: "ZOOM",
      meetingUrl: "https://zoom.us/j/pf-webdev-recap",
      status: "COMPLETED",
      createdById: instructorUserId,
    },
  });

  for (const session of [sessionUpcoming, sessionPast]) {
    await prisma.lmsLiveAttendance.upsert({
      where: { sessionId_enrollmentId: { sessionId: session.id, enrollmentId: enrBootcamp.id } },
      create: {
        organizationId: orgId,
        sessionId: session.id,
        enrollmentId: enrBootcamp.id,
        status: session.status === "COMPLETED" ? "ATTENDED" : "REGISTERED",
        joinedAt: session.status === "COMPLETED" ? daysFromNow(-7) : null,
      },
      update: {},
    });
  }

  let subPlan = await prisma.lmsSubscriptionPlan.findFirst({
    where: { organizationId: orgId, name: "Web Developer All-Access" },
  });
  if (subPlan) {
    subPlan = await prisma.lmsSubscriptionPlan.update({
      where: { id: subPlan.id },
      data: { status: true, updatedAt: new Date() },
    });
  } else {
    subPlan = await prisma.lmsSubscriptionPlan.create({
      data: {
        organizationId: orgId,
        name: "Web Developer All-Access",
        description: "HTML/CSS, JavaScript, and React & Next.js courses included.",
        status: true,
        packagePriceMonthly: 39,
        packagePriceYearly: 390,
        trial: true,
        trialDays: 14,
      },
    });
  }

  for (const cid of [courseHtmlCss.id, courseJavascript.id, courseReact.id]) {
    await prisma.lmsSubscriptionPlanCourse.upsert({
      where: { planId_courseId: { planId: subPlan.id, courseId: cid } },
      create: { organizationId: orgId, planId: subPlan.id, courseId: cid },
      update: {},
    });
  }

  const periodStart = daysFromNow(-15);
  const periodEnd = daysFromNow(15);
  const existingSub = await prisma.lmsStudentSubscription.findFirst({
    where: { organizationId: orgId, studentUserId: studentId, planId: subPlan.id, status: "ACTIVE" },
  });
  if (!existingSub) {
    await prisma.lmsStudentSubscription.create({
      data: {
        organizationId: orgId,
        planId: subPlan.id,
        studentUserId: studentId,
        status: "ACTIVE",
        billingPeriod: "MONTHLY",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  await prisma.lmsCourseReview.upsert({
    where: { courseId_studentUserId: { courseId: courseHtmlCss.id, studentUserId: studentId } },
    create: {
      organizationId: orgId,
      courseId: courseHtmlCss.id,
      studentUserId: studentId,
      enrollmentId: enrMain.id,
      rating: 5,
      body: "Clear explanations of Flexbox and Grid — exactly what I needed to start building layouts.",
      status: "APPROVED",
      moderatedById: orgId,
      moderatedAt: now,
    },
    update: { status: "APPROVED", rating: 5 },
  });

  await prisma.lmsCourseReview.upsert({
    where: { courseId_studentUserId: { courseId: courseHtmlCss.id, studentUserId: student2Id } },
    create: {
      organizationId: orgId,
      courseId: courseHtmlCss.id,
      studentUserId: student2Id,
      rating: 4,
      body: "Solid HTML/CSS foundation. Looking forward to the JavaScript follow-up course.",
      status: "PENDING",
    },
    update: { status: "PENDING" },
  });

  const premiumEnrollment = await prisma.enrollment.findFirst({
    where: { courseId: courseReact.id, studentUserId: student2Id },
  });

  let revenue = await prisma.lmsCourseRevenueRecord.findFirst({
    where: {
      organizationId: orgId,
      courseId: courseReact.id,
      source: "MANUAL",
      grossAmount: 149,
    },
  });
  if (!revenue) {
    revenue = await prisma.lmsCourseRevenueRecord.create({
      data: {
        organizationId: orgId,
        courseId: courseReact.id,
        source: "MANUAL",
        grossAmount: 149,
        currency: "USD",
        enrollmentId: premiumEnrollment?.id ?? null,
        recordedAt: now,
      },
    });
  }

  let commission = await prisma.lmsInstructorCommission.findFirst({
    where: {
      organizationId: orgId,
      instructorProfileId: instructorProfile.id,
      courseId: courseReact.id,
      revenueRecordId: revenue.id,
    },
  });
  if (!commission) {
    commission = await prisma.lmsInstructorCommission.create({
      data: {
        organizationId: orgId,
        instructorProfileId: instructorProfile.id,
        courseId: courseReact.id,
        revenueRecordId: revenue.id,
        commissionPercent: 15,
        commissionAmount: 22.35,
        currency: "USD",
        status: "ACCRUED",
      },
    });
  }

  const payoutPeriodStart = daysFromNow(-30);
  const payoutPeriodEnd = daysFromNow(-1);
  let payout = await prisma.lmsInstructorPayout.findFirst({
    where: {
      organizationId: orgId,
      instructorProfileId: instructorProfile.id,
      notes: "Demo payout (seed)",
    },
  });
  if (!payout) {
    payout = await prisma.lmsInstructorPayout.create({
      data: {
        organizationId: orgId,
        instructorProfileId: instructorProfile.id,
        totalAmount: 22.35,
        currency: "USD",
        status: "PAID",
        periodStart: payoutPeriodStart,
        periodEnd: payoutPeriodEnd,
        paidAt: daysFromNow(-1),
        notes: "Demo payout (seed)",
      },
    });
    await prisma.lmsInstructorCommission.update({
      where: { id: commission.id },
      data: { status: "PAID", payoutId: payout.id },
    });
  }

  console.log("\n[seed-lms-demo] ── Web Development catalog ─────────────────────────");
  console.log("  Courses:");
  console.log(`    • ${courseHtmlCss.slug} — HTML & CSS (free, public)`);
  console.log(`    • ${courseJavascript.slug} — JavaScript (free, public)`);
  console.log(`    • ${courseReact.slug} — React & Next.js ($149)`);
  console.log(`    • ${courseBootcamp.slug} — Live bootcamp cohort`);
  console.log(`    • ${courseNodeApis.slug} — Node.js APIs (private)`);
  console.log(`    • ${courseDraft.slug} — TypeScript (draft)`);
  console.log(`  Instructors: hr@example.com (${instructorUserId}), instructor.portal@example.com (${portalInstructorId})`);
  console.log(`  Learners (HRM/staff): staff@example.com (${studentId}), sales@example.com (${student2Id})`);
  console.log(`  Portal students: learner.demo@example.com (${portalStudent1Id}), anshul.demo@example.com (${portalStudent2Id})`);
  console.log(`  Subscription plan: ${subPlan.name} (id=${subPlan.id})`);
  console.log(`  Live sessions: ${sessionUpcoming.id}, ${sessionPast.id}`);
  console.log("\n[seed-lms-demo] Test accounts (password 1234):");
  console.log("  company@example.com — LMS admin (Students, Instructors, Courses, Settings)");
  console.log("  learner.demo@example.com — lms-student portal (Student accounts tab + impersonate)");
  console.log("  anshul.demo@example.com — lms-student portal");
  console.log("  instructor.portal@example.com — lms-instructor portal");
  console.log("  staff@example.com — staff learner with enrollments (Enrollments tab)");
  console.log("  hr@example.com — instructor profile (staff + Sarah Johnson row)");
  console.log("\n[seed-lms-demo] Verify: npm run lms:smoke-check");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
