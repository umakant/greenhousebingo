/* eslint-disable no-console */
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
  const students = await prisma.user.findMany({
    where: { createdBy: orgId, type: "lms-student" },
    select: { id: true, email: true, name: true },
  });
  const instructors = await prisma.user.findMany({
    where: { createdBy: orgId, type: "lms-instructor" },
    select: { id: true, email: true, name: true },
  });
  const profiles = await prisma.instructorProfile.findMany({
    where: { organizationId: orgId },
    select: { id: true, displayName: true, userId: true, isActive: true },
  });
  const enrollments = await prisma.enrollment.count({ where: { organizationId: orgId } });
  const hr = await prisma.user.findFirst({ where: { email: "hr@example.com" }, select: { id: true, type: true } });

  console.log("Org", orgId.toString());
  console.log("hr@example.com type:", hr?.type ?? "missing");
  console.log("lms-student portal accounts:", students.length);
  students.forEach((s) => console.log("  -", s.email, s.name));
  console.log("lms-instructor portal accounts:", instructors.length);
  instructors.forEach((s) => console.log("  -", s.email, s.name));
  console.log("instructor profiles:", profiles.length);
  profiles.forEach((p) => console.log("  -", p.displayName, "userId=" + p.userId.toString()));
  console.log("enrollments:", enrollments);
}

main()
  .finally(() => prisma.$disconnect());
