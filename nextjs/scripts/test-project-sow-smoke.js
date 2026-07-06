/**
 * Integration smoke test for project SOW API against the local DB.
 * Run: node scripts/test-project-sow-smoke.js
 */
/* eslint-disable no-console */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  console.log("=== Project SOW smoke test ===\n");

  const tableCheck = await prisma.$queryRawUnsafe(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'project_staff_sow' AND column_name = 'form_data'
  `);
  if (!Array.isArray(tableCheck) || tableCheck.length === 0) {
    throw new Error("project_staff_sow.form_data column missing — run ensure-project-sow-schema.js");
  }
  console.log("✓ form_data column exists");

  const assignment = await prisma.projectStaffAssignment.findFirst({
    orderBy: { id: "desc" },
    select: { projectId: true, userId: true },
  });

  if (!assignment) {
    console.log("⚠ No staff assignments in DB — skipping API data test");
    console.log("  Assign an agent to a project, then re-run this script.");
    return;
  }

  const projectId = assignment.projectId;
  const userId = assignment.userId;
  console.log(`✓ Using project ${projectId}, user ${userId}`);

  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: { name: true, propertyName: true, city: true, state: true },
  });
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { name: true, email: true },
  });
  console.log(`  Project: ${project?.name ?? "?"}`);
  console.log(`  Employee: ${user?.name ?? user?.email ?? "?"}`);

  const sampleForm = {
    vendor_company_name: "Crimson Consulting",
    vendor_contact_name: "John Hindy",
    vendor_email: "admin@test.com",
    vendor_phone: "",
    vendor_logo_url: "",
    client_company_name: "On Location",
    client_contact_name: user?.name ?? "Employee",
    client_email: user?.email ?? "",
    client_phone: "",
    client_logo_url: "",
    project_type: "Special Event",
    event_name: project?.name ?? "Test Event",
    client_reference: "TEST-001",
    internal_reference: "INT-001",
    primary_venue: project?.propertyName ?? "Venue",
    venue_address: "",
    city: project?.city ?? "",
    state: project?.state ?? "",
    zip_code: "",
    timezone: "",
    additional_locations: ["Top Golf"],
    work_periods: [
      {
        id: "wp1",
        label: "Activation Days (3)",
        start_date: "2026-06-16",
        end_date: "2026-06-18",
        daily_rate: "600",
        rate_type: "per day",
      },
    ],
    compensation_summary: "3 total days @ $1800",
    per_diem: "Up to $85 per day with receipts.",
    dress_code: "Business casual.",
    policies: "No alcohol on site.",
    travel_notes: "Flight pre-purchased.",
    payroll_notes: "Biweekly direct deposit.",
    payroll_periods: [{ id: "pp1", period_start: "2026-06-16", period_end: "2026-06-30", pay_date: "2026-07-15" }],
    rules_notes: "",
    signatory_name: "John Hindy",
    sign_by_date: "2026-06-10",
  };

  const row = await prisma.projectStaffSow.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: {
      projectId,
      userId,
      partnerName: sampleForm.client_company_name,
      totalRate: sampleForm.compensation_summary,
      status: "draft",
      formData: sampleForm,
      signByDate: new Date("2026-06-10T12:00:00"),
    },
    update: {
      partnerName: sampleForm.client_company_name,
      totalRate: sampleForm.compensation_summary,
      status: "draft",
      formData: sampleForm,
      signByDate: new Date("2026-06-10T12:00:00"),
      updatedAt: new Date(),
    },
  });

  console.log("✓ Upserted SOW record id", row.id.toString());

  const readBack = await prisma.projectStaffSow.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!readBack?.formData || typeof readBack.formData !== "object") {
    throw new Error("form_data not persisted correctly");
  }
  const fd = readBack.formData;
  if (fd.compensation_summary !== "3 total days @ $1800") {
    throw new Error("form_data compensation_summary mismatch");
  }
  console.log("✓ form_data round-trip OK");

  const staffRows = await prisma.projectStaffAssignment.findMany({ where: { projectId } });
  const uniqueUsers = new Set(staffRows.map((r) => r.userId.toString()));
  console.log(`✓ Project has ${uniqueUsers.size} assigned employee(s)`);

  console.log("\n=== All SOW smoke checks passed ===");
  console.log(`Open: http://localhost:5000/project/${projectId}?tab=sow`);
}

main()
  .catch((e) => {
    console.error("\n✗ SOW smoke test failed:", e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
