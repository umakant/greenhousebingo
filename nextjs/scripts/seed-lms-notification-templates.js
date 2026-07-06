/* eslint-disable no-console */
/**
 * Seed LMS email + notification toggles (enrollment, lesson complete, class reminder).
 * Safe to run multiple times.
 *
 * Usage: node scripts/seed-lms-notification-templates.js
 * Or: npm run db:seed:lms-notifications
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEFAULT_FROM = "Paper Flight";

const NOTIFICATION_TEMPLATES = [
  {
    id: 33,
    module: "LMS",
    type: "mail",
    action: "LMS Enrollment Confirmation",
    status: "on",
    permissions: "manage-lms",
  },
  {
    id: 34,
    module: "LMS",
    type: "mail",
    action: "LMS Lesson Completed",
    status: "on",
    permissions: "manage-lms",
  },
  {
    id: 35,
    module: "LMS",
    type: "mail",
    action: "LMS Class Reminder",
    status: "on",
    permissions: "manage-lms",
  },
];

const NOTIFICATION_LANG = {
  33: {
    content:
      "Hello {name},\n\nYou are enrolled in {course_title}.\n\nStart learning: {course_url}\n\nEnrolled: {enrolled_at}\n\nRegards,\n{company_name}",
    variables: {
      name: "name",
      course_title: "course_title",
      course_url: "course_url",
      enrolled_at: "enrolled_at",
      company_name: "company_name",
    },
  },
  34: {
    content:
      "Hello {name},\n\nYou completed the lesson \"{lesson_title}\" in {course_title}.\n\nContinue: {course_url}\n\nCompleted: {completed_at}\n\nRegards,\n{company_name}",
    variables: {
      name: "name",
      lesson_title: "lesson_title",
      course_title: "course_title",
      course_url: "course_url",
      completed_at: "completed_at",
      company_name: "company_name",
    },
  },
  35: {
    content:
      "Hello {name},\n\nReminder: live class \"{session_title}\" for {course_title} starts {session_starts_at}.\n\nJoin: {meeting_url}\n\nRegards,\n{company_name}",
    variables: {
      name: "name",
      session_title: "session_title",
      course_title: "course_title",
      session_starts_at: "session_starts_at",
      meeting_url: "meeting_url",
      company_name: "company_name",
    },
  },
};

const EMAIL_TEMPLATES = [
  {
    name: "LMS Enrollment Confirmation",
    moduleName: "LMS",
    subject: "You're enrolled in {course_title}",
    variables: JSON.stringify({
      Name: "name",
      "Course Title": "course_title",
      "Course URL": "course_url",
      "Enrolled At": "enrolled_at",
      "Company Name": "company_name",
    }),
    langContent: {
      en: '<p>Hi {name},</p><p>You are enrolled in <strong>{course_title}</strong>.</p><p><a href="{course_url}">Open your course</a></p><p>Enrolled: {enrolled_at}</p><p>Thanks,<br />{company_name}</p>',
    },
  },
  {
    name: "LMS Lesson Completed",
    moduleName: "LMS",
    subject: 'Lesson completed: "{lesson_title}"',
    variables: JSON.stringify({
      Name: "name",
      "Lesson Title": "lesson_title",
      "Course Title": "course_title",
      "Course URL": "course_url",
      "Completed At": "completed_at",
      "Company Name": "company_name",
    }),
    langContent: {
      en: '<p>Hi {name},</p><p>Great work — you completed <strong>{lesson_title}</strong> in {course_title}.</p><p><a href="{course_url}">Continue learning</a></p><p>Completed: {completed_at}</p><p>Thanks,<br />{company_name}</p>',
    },
  },
  {
    name: "LMS Class Reminder",
    moduleName: "LMS",
    subject: "Reminder: {session_title} starts soon",
    variables: JSON.stringify({
      Name: "name",
      "Session Title": "session_title",
      "Course Title": "course_title",
      "Starts At": "session_starts_at",
      "Meeting URL": "meeting_url",
      "Company Name": "company_name",
    }),
    langContent: {
      en: '<p>Hi {name},</p><p>Your live class <strong>{session_title}</strong> for {course_title} starts <strong>{session_starts_at}</strong>.</p><p><a href="{meeting_url}">Join session</a></p><p>Thanks,<br />{company_name}</p>',
    },
  },
];

function toBigInt(n) {
  return BigInt(n);
}

function parseVariables(varsStr) {
  try {
    return typeof varsStr === "string" ? JSON.parse(varsStr) : varsStr;
  } catch {
    return {};
  }
}

async function seedNotifications() {
  for (const row of NOTIFICATION_TEMPLATES) {
    const id = toBigInt(row.id);
    const data = {
      module: row.module,
      type: row.type,
      action: row.action,
      status: row.status,
      permissions: row.permissions,
      updatedAt: new Date(),
    };
    const existing = await prisma.notification.findUnique({ where: { id }, select: { id: true } });
    if (existing) {
      await prisma.notification.update({ where: { id }, data });
      console.log("  Notification updated:", row.action);
    } else {
      await prisma.notification.create({ data: { id, ...data, createdAt: new Date() } });
      console.log("  Notification created:", row.action);
    }
  }

  for (const [idStr, { content, variables }] of Object.entries(NOTIFICATION_LANG)) {
    const parentId = toBigInt(Number(idStr));
    const existing = await prisma.notificationTemplateLang.findFirst({
      where: { parentId, lang: "en" },
      select: { id: true },
    });
    if (existing?.id) {
      await prisma.notificationTemplateLang.update({
        where: { id: existing.id },
        data: { content, variables, updatedAt: new Date() },
      });
    } else {
      await prisma.notificationTemplateLang.create({
        data: { parentId, lang: "en", content, variables, createdAt: new Date() },
      });
    }
    console.log("  Notification lang:", idStr, "(en)");
  }
}

async function seedEmailTemplates() {
  const existing = await prisma.emailTemplate.findMany({
    select: { id: true, name: true, moduleName: true },
  });
  const key = (n, m) => `${n}|${m}`;
  const existingSet = new Set(existing.map((r) => key(r.name ?? "", r.moduleName ?? "")));

  let created = 0;
  let skipped = 0;

  for (const t of EMAIL_TEMPLATES) {
    const existingByKey = await prisma.emailTemplate.findFirst({
      where: { name: t.name, moduleName: t.moduleName },
      select: { id: true },
    });
    if (existingByKey || existingSet.has(key(t.name, t.moduleName))) {
      skipped++;
      continue;
    }
    const variablesObj = parseVariables(t.variables);
    const maxId = await prisma.emailTemplate.aggregate({ _max: { id: true } });
    const templateId = (maxId._max.id ?? 0n) + 1n;
    const template = await prisma.emailTemplate.create({
      data: { id: templateId, name: t.name, from: DEFAULT_FROM, moduleName: t.moduleName },
    });
    for (const [lang, content] of Object.entries(t.langContent)) {
      const existingLang = await prisma.emailTemplateLang.findFirst({
        where: { parentId: template.id, lang },
        select: { id: true },
      });
      if (existingLang) {
        await prisma.emailTemplateLang.update({
          where: { id: existingLang.id },
          data: {
            subject: t.subject,
            content,
            moduleName: t.moduleName,
            variables: variablesObj,
          },
        });
        continue;
      }
      const maxLangId = await prisma.emailTemplateLang.aggregate({ _max: { id: true } });
      await prisma.emailTemplateLang.create({
        data: {
          id: (maxLangId._max.id ?? 0n) + 1n,
          parentId: template.id,
          lang,
          subject: t.subject,
          content,
          moduleName: t.moduleName,
          variables: variablesObj,
        },
      });
    }
    created++;
    console.log("  Email template created:", t.name);
  }

  console.log(`Email templates: created ${created}, skipped ${skipped}.`);
}

async function main() {
  console.log("Seeding LMS notification toggles...");
  await seedNotifications();
  console.log("\nSeeding LMS email templates...");
  await seedEmailTemplates();
  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
