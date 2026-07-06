/* eslint-disable no-console */
/**
 * Seeds full operations demo data for the SRGN project (Crimson / First Aid Responders tenant).
 * Does NOT wipe existing staff assignments — only upserts supplementary sections + SOW.
 *
 * Usage:
 *   node ./scripts/seed-project-operations-srgn.js
 *   node ./scripts/seed-project-operations-srgn.js --name=Crimson
 */
const path = require("path");
const { execSync } = require("child_process");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ log: ["error"] });

const USER_MODEL_TYPE = "App\\Models\\User";
const SEED_KEY = "crimson-srgn-ops";
const GANTT_PROJECT_ID = "demo-ops-gantt-srgn-10";
const ID = 100200; // demo row id base (avoid collision with project 1001 seed)

const SOW_PER_DIEM = `On Location will provide meals where applicable. If you cannot participate due to your assigned task/post, you may submit for reimbursement with receipts of up to $85 per day. Parking/rideshare can also be submitted and will be reviewed by the client to be reimbursed. This is subject to change and will be communicated where applicable. The final approval of reimbursed expenses is subject to the client.`;

const SOW_DRESS = `Dark suit, solid light colored under shirt, No tie, and black or brown dress shoes for show day activations. Dark Jeans and sport coat for any other client facing activations. Business Casual at a minimum for all other interactions with the client.`;

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

function d(str) {
  return new Date(`${str}T12:00:00.000Z`);
}

function bi(n) {
  return BigInt(n);
}

function id(n) {
  return bi(ID + n);
}

async function nextSettingId() {
  const agg = await prisma.setting.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function upsertSetting(ownerId, key, value) {
  const existing = await prisma.setting.findFirst({ where: { key, createdBy: ownerId } });
  if (existing) {
    await prisma.setting.update({
      where: { id: existing.id },
      data: { value: value == null ? null : String(value), updatedAt: new Date() },
    });
  } else {
    await prisma.setting.create({
      data: {
        id: await nextSettingId(),
        key,
        value: value == null ? null : String(value),
        createdBy: ownerId,
        createdAt: new Date(),
      },
    });
  }
}

function buildLynnStyleSowForm(employeeName, employeeEmail, opts = {}) {
  const partial = opts.partial === true;
  return {
    vendor_company_name: "Crimson Consulting",
    vendor_contact_name: "John Hindy",
    vendor_email: "admin@ccsnorth.com",
    vendor_phone: "+1-702-555-0100",
    vendor_logo_url: "",
    client_company_name: "On Location",
    client_contact_name: employeeName,
    client_email: employeeEmail,
    client_phone: "",
    client_logo_url: "",
    project_type: "Special Event",
    event_name: "SRGN",
    client_reference: "OL-SRGN-2026",
    internal_reference: "USR-SRGN-001",
    primary_venue: "Allegiant Stadium",
    venue_address: "3333 Al Davis Way",
    city: "Las Vegas",
    state: "NV",
    zip_code: "89118",
    timezone: "Pacific Time (PT)",
    additional_locations: [
      "Top Golf, Las Vegas, NV",
      "WWE World Las Vegas, NV",
      "Various Activations Las Vegas NV",
    ],
    work_periods: partial
      ? [
          {
            id: "wp-travel-in",
            label: "6/11/2026 Travel Day",
            start_date: "2026-06-11",
            end_date: "2026-06-11",
            daily_rate: "300",
            rate_type: "Half Day",
          },
        ]
      : [
      {
        id: "wp-travel-in",
        label: "6/11/2026 Travel Day",
        start_date: "2026-06-11",
        end_date: "2026-06-11",
        daily_rate: "300",
        rate_type: "Half Day",
      },
      {
        id: "wp-activation",
        label: "6/12 – 6/29 Activation Days (20)",
        start_date: "2026-06-12",
        end_date: "2026-06-29",
        daily_rate: "600",
        rate_type: "per day",
      },
      {
        id: "wp-travel-out",
        label: "6/30/2026 Travel Day",
        start_date: "2026-06-30",
        end_date: "2026-06-30",
          daily_rate: "300",
          rate_type: "Half Day",
        },
      ],
    compensation_summary: partial ? "3 total days @ $1200" : "22 total days @ $12600",
    per_diem: SOW_PER_DIEM,
    dress_code: SOW_DRESS,
    policies: `To maintain integrity, you are prohibited from accepting any form of gifts, gratuities or other benefits from clients. Under no circumstances should you oblige anything offered by the client other than food that would be provided to all staff. There will be no consumption of alcohol at any of these events or at any time.

There will be no photos or other unnecessary interactions with guests/celebrities. We are there to assist WWE in maintaining security.`,
    travel_notes: `Your flight has been pre-purchased for you. If there are circumstances that cause you to miss your flight, and/or you need to back out of this activation with the client; you will be responsible to reimburse Crimson Consulting for all associated flight costs if they are not refunded by the airline.`,
    payroll_notes: `Payroll is processed on a biweekly cadence via direct deposit, following the below schedule:`,
    payroll_periods: [
      { id: "pp-1", period_start: "2026-06-13", period_end: "2026-06-26", pay_date: "2026-07-09" },
    ],
    rules_notes: "",
    signatory_name: "John Hindy",
    sign_by_date: "2026-06-04",
  };
}

function sowFormToRecord(form) {
  const locationLines = [`- Location: ${[form.primary_venue, form.city, form.state].filter(Boolean).join(" ")}`.trim()];
  for (const loc of form.additional_locations) {
    if (loc.trim()) locationLines.push(`  o ${loc.trim()}`);
  }
  const scheduleLines = ["- Day(s)/Times Needed:"];
  for (const wp of form.work_periods) {
    const ratePart = wp.daily_rate ? ` $${wp.daily_rate}${wp.rate_type ? ` ${wp.rate_type}` : ""}` : "";
    scheduleLines.push(`  o ${wp.label.trim()}${ratePart}`);
  }
  return {
    partnerName: form.client_company_name || null,
    locations: locationLines.join("\n"),
    scheduleDetails: scheduleLines.join("\n"),
    totalRate: form.compensation_summary || null,
    perDiem: form.per_diem || null,
    dressCode: form.dress_code || null,
    policies: form.policies || null,
    travelNotes: form.travel_notes || null,
    payrollNotes: form.payroll_notes || null,
    signByDate: form.sign_by_date ? d(form.sign_by_date) : null,
  };
}

async function resolveSrgnProject() {
  const filterName = readArg("--name");
  const filterEmail = readArg("--email");
  const filterProject = readArg("--project") || "SRGN";

  let company = null;
  if (filterEmail) {
    company = await prisma.user.findFirst({
      where: { email: { equals: filterEmail, mode: "insensitive" }, type: "company" },
    });
  } else if (filterName) {
    company = await prisma.user.findFirst({
      where: { name: { contains: filterName, mode: "insensitive" }, type: "company" },
    });
  }

  const projectWhere = { name: { equals: filterProject, mode: "insensitive" } };
  if (company) projectWhere.createdBy = company.id;

  const project = await prisma.project.findFirst({
    where: projectWhere,
    orderBy: { id: "asc" },
  });

  if (!project) {
    console.error(`[seed-srgn] Project "${filterProject}" not found.${company ? "" : " Try --name=Crimson"}`);
    return null;
  }

  const companyId = project.createdBy ?? company?.id;
  if (!companyId) {
    console.error("[seed-srgn] Could not resolve company for project.");
    return null;
  }

  return { project, companyId };
}

async function ensureDemoStaff(companyId, demoHash) {
  const staffRole = await prisma.role.findFirst({ where: { name: "staff" }, select: { id: true } });
  const specs = [
    { key: "aisha", id: bi(1061), email: "aisha.j@firstaidresponders.net", name: "Aisha Johnson", operationsRole: "agent" },
    { key: "lynn", id: bi(1062), email: "lynn@firstaidresponders.net", name: "Lynn Nicely", operationsRole: "agent" },
    { key: "marcus", id: bi(1063), email: "marcus.reed@firstaidresponders.net", name: "Marcus Reed", operationsRole: "security" },
  ];

  const userIds = {};
  for (const spec of specs) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ id: spec.id }, { email: spec.email }] },
      select: { id: true },
    });
    const uid = existing?.id ?? spec.id;
    const data = {
      email: spec.email,
      name: spec.name,
      password: demoHash,
      type: "staff",
      mobileNo: "+1-702-555-0101",
      operationsRole: spec.operationsRole,
      isActive: true,
      isEnableLogin: true,
      emailVerifiedAt: new Date(),
      createdBy: companyId,
      creatorId: companyId,
    };
    if (existing) {
      await prisma.user.update({ where: { id: uid }, data: { ...data, updatedAt: new Date() } });
    } else {
      await prisma.user.create({ data: { id: spec.id, ...data } });
    }
    userIds[spec.key] = uid;
  }

  if (staffRole) {
    await prisma.modelHasRole.createMany({
      data: Object.values(userIds).map((modelId) => ({
        modelId,
        roleId: staffRole.id,
        modelType: USER_MODEL_TYPE,
      })),
      skipDuplicates: true,
    });
  }

  return userIds;
}

/** Manual ops assignments (ganttAssignmentId null) so SOW tab lists staff and gantt sync does not wipe them. */
async function seedStaffAssignments(projectId, opsUserIds) {
  const demoUserIds = [opsUserIds.aisha, opsUserIds.lynn, opsUserIds.marcus];

  await prisma.projectStaffAssignment.deleteMany({
    where: { projectId, userId: { in: demoUserIds } },
  });

  const rows = [
    {
      id: id(201),
      userId: opsUserIds.aisha,
      role: "agent",
      position: "VIP Escort",
      workDate: "2026-06-11",
      endDate: "2026-06-30",
      startTime: "08:00",
      endTime: "18:00",
      sortOrder: 1,
    },
    {
      id: id(202),
      userId: opsUserIds.lynn,
      role: "agent",
      position: "Gate Lead",
      workDate: "2026-06-11",
      endDate: "2026-06-29",
      startTime: "09:00",
      endTime: "17:00",
      sortOrder: 2,
    },
    {
      id: id(203),
      userId: opsUserIds.marcus,
      role: "security",
      position: "Perimeter Security",
      workDate: "2026-06-12",
      endDate: "2026-06-30",
      startTime: "06:00",
      endTime: "14:00",
      sortOrder: 3,
    },
  ];

  for (const row of rows) {
    const { id: rowId, userId, workDate, endDate, ...data } = row;
    await prisma.projectStaffAssignment.create({
      data: {
        id: rowId,
        projectId,
        userId,
        workDate: d(workDate),
        endDate: d(endDate),
        ...data,
        status: "confirmed",
        onSite: true,
        ganttAssignmentId: null,
      },
    });
  }

  console.log(`[seed-srgn] Assigned ${rows.length} employees to project ${projectId}`);
}

async function upsertSowForEmployee(projectId, userId, employeeName, employeeEmail, status, partial) {
  const form = buildLynnStyleSowForm(employeeName, employeeEmail, { partial });
  const record = sowFormToRecord(form);
  await prisma.projectStaffSow.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId, ...record, status, formData: form },
    update: { ...record, status, formData: form, updatedAt: new Date() },
  });
}

async function seedSrgn(projectId, companyId, opsUserIds) {
  console.log(`[seed-srgn] Seeding SRGN project ${projectId} (company ${companyId})…`);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      seedKey: SEED_KEY,
      description: "SRGN activation — Las Vegas event security and medical support for On Location.",
      usrNumber: "USR-SRGN-001",
      timezone: "Pacific Time (PT)",
      propertyName: "Allegiant Stadium",
      address: "3333 Al Davis Way",
      city: "Las Vegas",
      state: "NV",
      zipCode: "89118",
      budget: 85000,
      numAttendees: 65000,
      numAgents: 12,
      numMedics: 4,
      numSecurity: 18,
      securityDirectorName: "John Hindy",
      securityDirectorPhone: "+1-702-555-0100",
      securityDirectorEmail: "admin@ccsnorth.com",
      sowPerDiem: SOW_PER_DIEM,
      sowDressCode: SOW_DRESS,
      updatedAt: new Date(),
    },
  });

  await prisma.projectLeadAssignment.upsert({
    where: { projectId },
    create: { projectId, userId: opsUserIds.aisha },
    update: { userId: opsUserIds.aisha, updatedAt: new Date() },
  });

  for (const row of [
    { n: 1, name: "Confirm On Location briefing schedule", phase: "pre_project", status: "completed", sortOrder: 1 },
    { n: 2, name: "Verify Allegiant Stadium credentials", phase: "pre_project", status: "completed", sortOrder: 2 },
    { n: 3, name: "Issue dress code and SOW packets", phase: "pre_project", status: "pending", sortOrder: 3 },
    { n: 4, name: "Daily activation check-in", phase: "project", status: "pending", sortOrder: 1 },
    { n: 5, name: "Coordinate Top Golf activation staffing", phase: "project", status: "pending", sortOrder: 2 },
    { n: 6, name: "Post-event debrief with client", phase: "post_project", status: "pending", sortOrder: 1 },
  ]) {
    await prisma.projectChecklistItem.upsert({
      where: { id: id(row.n) },
      create: { id: id(row.n), projectId, name: row.name, phase: row.phase, status: row.status, sortOrder: row.sortOrder },
      update: { name: row.name, phase: row.phase, status: row.status, sortOrder: row.sortOrder, updatedAt: new Date() },
    });
  }

  for (const row of [
    { userId: opsUserIds.aisha, confirmed: true, whatsapp: true, housing: true, attire: true, meals: true, parking: false, policy: true, checkIn: true, hotelSecurity: true },
    { userId: opsUserIds.lynn, confirmed: true, whatsapp: true, housing: true, attire: true, meals: true, parking: true, policy: true, checkIn: false, hotelSecurity: false },
    { userId: opsUserIds.marcus, confirmed: true, whatsapp: true, housing: true, attire: true, meals: false, parking: true, policy: true, checkIn: true, hotelSecurity: false },
  ]) {
    await prisma.projectAgentChecklist.upsert({
      where: { projectId_userId: { projectId, userId: row.userId } },
      create: { projectId, ...row },
      update: { ...row, updatedAt: new Date() },
    });
  }

  await prisma.projectLodgingHotel.upsert({
    where: { id: id(10) },
    create: { id: id(10), projectId, name: "The Venetian Resort", address: "3355 S Las Vegas Blvd, Las Vegas, NV 89109" },
    update: { name: "The Venetian Resort", address: "3355 S Las Vegas Blvd, Las Vegas, NV 89109", updatedAt: new Date() },
  });

  for (const row of [
    { n: 11, userId: opsUserIds.aisha, room: "4210" },
    { n: 12, userId: opsUserIds.lynn, room: "4212" },
  ]) {
    await prisma.projectLodgingAssignment.upsert({
      where: { id: id(row.n) },
      create: { id: id(row.n), projectId, hotelId: id(10), userId: row.userId, role: "agent", room: row.room },
      update: { hotelId: id(10), userId: row.userId, role: "agent", room: row.room, updatedAt: new Date() },
    });
  }

  for (const row of [
    { n: 20, name: "On Location Event Services", email: "ops@onlocation.demo", phone: "+1-702-555-8800" },
    { n: 21, name: "Las Vegas AV Production", email: "crew@lvav.demo", phone: "+1-702-555-7700" },
  ]) {
    await prisma.projectVendorLink.upsert({
      where: { id: id(row.n) },
      create: { id: id(row.n), projectId, vendorId: null, name: row.name, email: row.email, phone: row.phone },
      update: { name: row.name, email: row.email, phone: row.phone, updatedAt: new Date() },
    });
  }

  for (const row of [
    { n: 30, userId: opsUserIds.aisha, content: "All agents must review SOW and sign by June 4. Per diem receipts due weekly." },
    { n: 31, userId: opsUserIds.lynn, content: "Travel day June 11 — arrive LAS by 2 PM for credential pickup." },
  ]) {
    await prisma.projectNote.upsert({
      where: { id: id(row.n) },
      create: { id: id(row.n), projectId, userId: row.userId, content: row.content },
      update: { content: row.content, updatedAt: new Date() },
    });
  }

  for (const row of [
    { n: 40, facilityType: "hospital", name: "UMC Trauma Center", address: "1800 W Charleston Blvd, Las Vegas, NV 89102", phone: "+1-702-383-2000", distance: "6.2 mi" },
    { n: 41, facilityType: "urgent_care", name: "Concentra Urgent Care", address: "2651 Paseo Verde Pkwy, Henderson, NV 89074", phone: "+1-702-555-4321", distance: "12 mi" },
  ]) {
    const { n, ...data } = row;
    await prisma.projectMedicalFacility.upsert({
      where: { id: id(n) },
      create: { id: id(n), projectId, ...data },
      update: { ...data, updatedAt: new Date() },
    });
  }

  await prisma.projectLostFoundItem.upsert({
    where: { id: id(50) },
    create: {
      id: id(50),
      projectId,
      itemName: "WWE credential lanyard",
      description: "Red lanyard with activation badge holder",
      foundDate: d("2026-06-14"),
      foundLocation: "Allegiant Stadium — Gate E",
      foundByUserId: opsUserIds.marcus,
      status: "unclaimed",
    },
    update: { updatedAt: new Date() },
  });

  await prisma.projectIncidentReport.upsert({
    where: { id: id(60) },
    create: {
      id: id(60),
      projectId,
      title: "Guest attempted back-of-house access",
      description: "Unauthorized individual redirected without escalation.",
      severity: "low",
      status: "resolved",
      location: "Allegiant Stadium",
      reportedBy: opsUserIds.marcus,
      reportedAt: d("2026-06-15"),
    },
    update: { updatedAt: new Date() },
  });

  await prisma.projectAfterActionReport.upsert({
    where: { projectId },
    create: {
      projectId,
      eventSummary: "SRGN Las Vegas activation across Allegiant Stadium and satellite venues.",
      wentWell: "Credentialing and medical standby went smoothly on travel day.",
      improvements: "Earlier bus staging would reduce gate congestion.",
      actionItems: "Update travel day timeline in SOW template.",
      staffPerformance: "Aisha Johnson led check-in operations effectively.",
    },
    update: { updatedAt: new Date() },
  });

  for (const row of [
    { n: 70, name: "VIP Escort" },
    { n: 71, name: "Perimeter Security" },
    { n: 72, name: "Medical Standby" },
  ]) {
    await prisma.projectPosition.upsert({
      where: { id: id(row.n) },
      create: { id: id(row.n), projectId, name: row.name, sortOrder: row.n - 69 },
      update: { name: row.name, sortOrder: row.n - 69, updatedAt: new Date() },
    });
  }

  await prisma.projectActivityLog.upsert({
    where: { id: id(80) },
    create: {
      id: id(80),
      projectId,
      userId: opsUserIds.aisha,
      userType: "staff",
      logType: "sow_update",
      remark: "Seeded demo Scope of Work for SRGN testing.",
    },
    update: { remark: "Seeded demo Scope of Work for SRGN testing.", updatedAt: new Date() },
  });

  for (const row of [
    { n: 90, fileName: "srgn-site-plan.pdf", title: "SRGN Site Security Plan", category: "Document" },
    { n: 91, fileName: "srgn-risk-matrix.pdf", title: "SRGN Risk Assessment", category: "Risk Assessment" },
    { n: 92, fileName: "srgn-roster.xlsx", title: "Activation Roster", category: "File" },
  ]) {
    await prisma.projectFile.upsert({
      where: { id: id(row.n) },
      create: {
        id: id(row.n),
        projectId,
        fileName: row.fileName,
        filePath: `/uploads/demo/project-${projectId}/${row.fileName}`,
        title: row.title,
        category: row.category,
        docType: row.fileName.split(".").pop(),
      },
      update: { title: row.title, category: row.category, updatedAt: new Date() },
    });
  }

  for (const row of [
    { n: 100, missionNumber: "SRGN-001", address: "Allegiant Stadium, Las Vegas, NV", status: "In Progress" },
    { n: 101, missionNumber: "SRGN-002", address: "Top Golf Las Vegas, NV", status: "Pending" },
  ]) {
    await prisma.projectMission.upsert({
      where: { id: id(row.n) },
      create: { id: id(row.n), projectId, missionNumber: row.missionNumber, address: row.address, status: row.status, notes: "Demo mission for SRGN." },
      update: { missionNumber: row.missionNumber, address: row.address, status: row.status, updatedAt: new Date() },
    });
  }

  await upsertSetting(
    companyId,
    "employee_payout_defaults",
    JSON.stringify({
      agent: { per_day: "600", half_day: "300" },
      medic: { per_day: "800", half_day: "400" },
      security: { per_day: "500", half_day: "250" },
    }),
  );

  for (const row of [
    { userId: opsUserIds.aisha, role: "agent", payRate: 600, halfDayRate: 300 },
    { userId: opsUserIds.lynn, role: "agent", payRate: 600, halfDayRate: 300 },
    { userId: opsUserIds.marcus, role: "security", payRate: 500, halfDayRate: 250 },
  ]) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO project_employee_pay_rates (project_id, user_id, role, rate_type, pay_rate, half_day_rate, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, 'per_day', $4, $5, $6, NOW(), NOW())
       ON CONFLICT (project_id, user_id)
       DO UPDATE SET role = EXCLUDED.role, pay_rate = EXCLUDED.pay_rate, half_day_rate = EXCLUDED.half_day_rate, updated_at = NOW()`,
      projectId,
      row.userId,
      row.role,
      row.payRate,
      row.halfDayRate,
      companyId,
    );
  }

  await prisma.ganttProject.upsert({
    where: { id: GANTT_PROJECT_ID },
    create: {
      id: GANTT_PROJECT_ID,
      name: "SRGN Las Vegas Activation",
      startDate: d("2026-06-11"),
      endDate: d("2026-06-30"),
      color: "#DC2626",
      progress: 40,
      companyId: String(companyId),
      projectRefId: projectId,
      status: "active",
    },
    update: {
      name: "SRGN Las Vegas Activation",
      projectRefId: projectId,
      companyId: String(companyId),
      updatedAt: new Date(),
    },
  });

  for (const loc of [
    { id: "demo-srgn-loc-stadium", name: "Allegiant Stadium", addressLine1: "3333 Al Davis Way", city: "Las Vegas", state: "NV", zipCode: "89118", latitude: 36.0909, longitude: -115.1833, color: "#6366F1" },
    { id: "demo-srgn-loc-topgolf", name: "Top Golf", addressLine1: "4627 Koval Ln", city: "Las Vegas", state: "NV", zipCode: "89109", latitude: 36.1075, longitude: -115.1728, color: "#22C55E" },
    { id: "demo-srgn-loc-wwe", name: "WWE World Las Vegas", addressLine1: "275 E Tropicana Ave", city: "Las Vegas", state: "NV", zipCode: "89169", latitude: 36.1023, longitude: -115.159, color: "#F59E0B" },
  ]) {
    const { id: locId, ...data } = loc;
    await prisma.ganttProjectLocation.upsert({
      where: { id: locId },
      create: { id: locId, projectId: GANTT_PROJECT_ID, ...data, startDate: d("2026-06-11"), endDate: d("2026-06-30") },
      update: { ...data, updatedAt: new Date() },
    });
  }

  await seedStaffAssignments(projectId, opsUserIds);

  await upsertSowForEmployee(
    projectId,
    opsUserIds.aisha,
    "Aisha Johnson",
    "aisha.j@firstaidresponders.net",
    "sent",
    false,
  );
  await upsertSowForEmployee(
    projectId,
    opsUserIds.lynn,
    "Lynn Nicely",
    "lynn@firstaidresponders.net",
    "draft",
    false,
  );
  await upsertSowForEmployee(
    projectId,
    opsUserIds.marcus,
    "Marcus Reed",
    "marcus.reed@firstaidresponders.net",
    "draft",
    true,
  );

  const staffCount = await prisma.projectStaffAssignment.count({ where: { projectId } });
  const sowCount = await prisma.projectStaffSow.count({ where: { projectId } });
  const checklistCount = await prisma.projectChecklistItem.count({ where: { projectId } });
  console.log(`[seed-srgn] ✓ project ${projectId}: staff=${staffCount} sow=${sowCount} checklist=${checklistCount}`);
  console.log(`[seed-srgn] Employees: Aisha ${opsUserIds.aisha}, Lynn ${opsUserIds.lynn}, Marcus ${opsUserIds.marcus}`);
  console.log(`[seed-srgn] Open http://localhost:5000/project/${projectId}?tab=sow`);
  console.log(`[seed-srgn] SOW PDF: http://localhost:5000/api/project/${projectId}/sow/${Number(opsUserIds.aisha)}/pdf`);
}

async function main() {
  for (const script of [
    "ensure-project-operations-schema.js",
    "ensure-project-sow-schema.js",
    "ensure-project-employee-pay-rates-schema.js",
    "ensure-gantt-location-schema.js",
    "ensure-project-missions-schema.js",
  ]) {
    execSync(`node ./scripts/${script}`, { cwd: path.join(__dirname, ".."), stdio: "inherit" });
  }

  const resolved = await resolveSrgnProject();
  if (!resolved) process.exit(1);

  const { project, companyId } = resolved;
  const demoHash = await bcrypt.hash("1234", 10);
  const opsUserIds = await ensureDemoStaff(companyId, demoHash);
  await seedSrgn(project.id, companyId, opsUserIds);
}

main()
  .catch((err) => {
    console.error("[seed-srgn] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
