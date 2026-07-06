/* eslint-disable no-console */
/**
 * Seeds full Agent Operations demo data for PaperFlight Website Redesign (project 1001).
 * Populates every project sidebar section for end-to-end testing (SOW, locations, etc.).
 *
 * Prerequisites: seed-rbac-demo, seed-company, seed-demo-data (creates project 1001).
 *
 * Safe to re-run: upserts fixed IDs. Use FORCE_PROJECT_OPS_SEED=1 to wipe roster/checklist rows first.
 *
 * Usage:
 *   npm run db:seed:project-operations
 *   FORCE_PROJECT_OPS_SEED=1 npm run db:seed:project-operations
 */
const path = require("path");
const { execSync } = require("child_process");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ log: ["error"] });

const CO = 1000n;
const PROJECT_ID = 1001n;
const OPS_SEED_KEY = "paperflight-website-redesign-ops";
const GANTT_PROJECT_ID = "demo-ops-gantt-1001";
const USER_MODEL_TYPE = "App\\Models\\User";

const SOW_PER_DIEM = `On Location will provide meals where applicable. If you cannot participate due to your assigned task/post, you may submit for reimbursement with receipts of up to $85 per day. Parking/rideshare can also be submitted and will be reviewed by the client to be reimbursed. This is subject to change and will be communicated where applicable. The final approval of reimbursed expenses is subject to the client.`;

const SOW_DRESS = `Dark suit, solid light colored under shirt, No tie, and black or brown dress shoes for show day activations. Dark Jeans and sport coat for any other client facing activations. Business Casual at a minimum for all other interactions with the client.`;

const SOW_POLICIES = `To maintain integrity, you are prohibited from accepting any form of gifts, gratuities or other benefits from clients. Under no circumstances should you oblige anything offered by the client other than food that would be provided to all staff. There will be no consumption of alcohol at any of these events or at any time.

There will be no photos or other unnecessary interactions with guests/celebrities. We are there to assist in maintaining security.`;

const SOW_TRAVEL = `Your flight has been pre-purchased for you. If there are circumstances that cause you to miss your flight, and/or you need to back out of this activation with the client; you will be responsible to reimburse PaperFlight Inc. for all associated flight costs if they are not refunded by the airline.`;

const SOW_PAYROLL = `Payroll is processed on a biweekly cadence via direct deposit, following the below schedule:`;

function d(str) {
  return new Date(`${str}T12:00:00.000Z`);
}

function bi(n) {
  return BigInt(n);
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

async function upsertOpsUser(spec, demoHash) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ id: spec.id }, { email: spec.email }] },
    select: { id: true },
  });
  const id = existing?.id ?? spec.id;
  const base = {
    email: spec.email,
    name: spec.name,
    password: demoHash,
    type: spec.type,
    mobileNo: spec.mobileNo,
    operationsRole: spec.operationsRole,
    isActive: true,
    isEnableLogin: true,
    emailVerifiedAt: new Date(),
    createdBy: CO,
    creatorId: CO,
  };

  if (existing) {
    await prisma.user.update({ where: { id }, data: { ...base, updatedAt: new Date() } });
  } else {
    await prisma.user.create({ data: { id: spec.id, ...base } });
  }

  return id;
}

async function clearProjectOpsData(projectId) {
  await prisma.projectStaffSow.deleteMany({ where: { projectId } });
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM project_employee_pay_rates WHERE project_id = $1`, projectId);
  } catch {
    // table may not exist until migration runs
  }
  await prisma.projectAgentChecklist.deleteMany({ where: { projectId } });
  await prisma.projectLodgingAssignment.deleteMany({ where: { projectId } });
  await prisma.projectLodgingHotel.deleteMany({ where: { projectId } });
  await prisma.projectStaffAssignment.deleteMany({ where: { projectId } });
  await prisma.projectChecklistItem.deleteMany({ where: { projectId } });
  await prisma.projectLeadAssignment.deleteMany({ where: { projectId } });
  await prisma.projectNote.deleteMany({ where: { projectId } });
  await prisma.projectVendorLink.deleteMany({ where: { projectId } });
  await prisma.projectMedicalFacility.deleteMany({ where: { projectId } });
  await prisma.projectLostFoundItem.deleteMany({ where: { projectId } });
  await prisma.projectIncidentReport.deleteMany({ where: { projectId } });
  await prisma.projectAfterActionReport.deleteMany({ where: { projectId } });
  await prisma.projectPosition.deleteMany({ where: { projectId } });
  await prisma.projectActivityLog.deleteMany({ where: { projectId } });
  await prisma.projectFile.deleteMany({ where: { projectId, id: { gte: bi(100101), lte: bi(100110) } } });
  await prisma.projectMission.deleteMany({ where: { projectId, id: { gte: bi(100101), lte: bi(100105) } } });
}

async function seedOpsUsers(demoHash) {
  const staffRole = await prisma.role.findFirst({ where: { name: "staff" }, select: { id: true } });

  const opsUserSpecs = [
    {
      key: "charlotte",
      id: bi(1014),
      email: "c.wong@paperflight.demo",
      name: "Charlotte Wong",
      type: "staff",
      mobileNo: "+1-212-555-1014",
      operationsRole: "agent",
    },
    {
      key: "steven",
      id: bi(1015),
      email: "s.lloyd@paperflight.demo",
      name: "Steven Lloyd",
      type: "staff",
      mobileNo: "+1-212-555-1015",
      operationsRole: "agent",
    },
    {
      key: "jason",
      id: bi(1016),
      email: "j.wright@paperflight.demo",
      name: "Jason Wright",
      type: "staff",
      mobileNo: "+1-212-555-1016",
      operationsRole: "medic",
    },
    {
      key: "raymond",
      id: bi(1017),
      email: "r.guard@paperflight.demo",
      name: "Raymond Guard",
      type: "staff",
      mobileNo: "+1-212-555-1017",
      operationsRole: "security",
    },
  ];

  const userIds = {};
  for (const spec of opsUserSpecs) {
    userIds[spec.key] = await upsertOpsUser(spec, demoHash);
  }

  await prisma.user.update({ where: { id: bi(1012) }, data: { operationsRole: "agent" } });
  await prisma.user.update({ where: { id: bi(1011) }, data: { operationsRole: "medic" } });
  await prisma.user.update({ where: { id: bi(1013) }, data: { operationsRole: "security" } });

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

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE hrm_employees SET user_id = ${Number(userIds.charlotte)} WHERE id = 1005 AND (user_id IS NULL OR user_id = 0)`,
    );
  } catch {
    // HRM table may be absent in minimal installs.
  }

  return userIds;
}

function buildLynnStyleSowForm(employeeName, employeeEmail, opts = {}) {
  const partial = opts.partial === true;
  return {
    vendor_company_name: "PaperFlight Inc.",
    vendor_contact_name: "Marcus Rivera",
    vendor_email: "m.rivera@paperflight.demo",
    vendor_phone: "+1-212-555-1002",
    vendor_logo_url: "",
    client_company_name: "On Location",
    client_contact_name: employeeName,
    client_email: employeeEmail,
    client_phone: "",
    client_logo_url: "",
    project_type: "Special Event",
    event_name: "PaperFlight Website Redesign Launch",
    client_reference: "OL-PF-2026-001",
    internal_reference: "USR-1001",
    primary_venue: "PaperFlight HQ — Marketing Wing",
    venue_address: "100 Wall Street, Suite 2800",
    city: "New York",
    state: "NY",
    zip_code: "10005",
    timezone: "Eastern Time (ET)",
    additional_locations: partial
      ? [""]
      : [
          "Hudson Yards Client Event Space, New York, NY",
          "Brooklyn Pop-up Showcase, Brooklyn, NY",
          "Various activations New York, NY",
        ],
    work_periods: partial
      ? [
          {
            id: "wp-travel",
            label: "4/12/2026 Travel Day",
            start_date: "2026-04-12",
            end_date: "2026-04-12",
            daily_rate: "300",
            rate_type: "Half Day",
          },
        ]
      : [
          {
            id: "wp-travel",
            label: "4/12/2026 Travel Day",
            start_date: "2026-04-12",
            end_date: "2026-04-12",
            daily_rate: "300",
            rate_type: "Half Day",
          },
          {
            id: "wp-activation",
            label: "4/13 – 4/20 Activation Days (8)",
            start_date: "2026-04-13",
            end_date: "2026-04-20",
            daily_rate: "600",
            rate_type: "per day",
          },
          {
            id: "wp-return",
            label: "4/21/2026 Travel Day",
            start_date: "2026-04-21",
            end_date: "2026-04-21",
            daily_rate: "300",
            rate_type: "Half Day",
          },
        ],
    compensation_summary: partial ? "3 total days @ $1200" : "9 total days @ $5400",
    per_diem: SOW_PER_DIEM,
    dress_code: SOW_DRESS,
    policies: SOW_POLICIES,
    travel_notes: SOW_TRAVEL,
    payroll_notes: SOW_PAYROLL,
    payroll_periods: [
      {
        id: "pp-1",
        period_start: "2026-04-13",
        period_end: "2026-04-26",
        pay_date: "2026-05-09",
      },
    ],
    rules_notes: "",
    signatory_name: "Marcus Rivera",
    sign_by_date: "2026-03-10",
  };
}

function sowFormToRecord(form) {
  const locationLines = [`- Location: ${[form.primary_venue, form.city, form.state].filter(Boolean).join(" ")}`.trim()];
  for (const loc of form.additional_locations) {
    if (loc.trim()) locationLines.push(`  o ${loc.trim()}`);
  }
  const scheduleLines = ["- Day(s)/Times Needed:"];
  for (const wp of form.work_periods) {
    if (!wp.start_date && !wp.label) continue;
    const ratePart = wp.daily_rate ? ` $${wp.daily_rate}${wp.rate_type ? ` ${wp.rate_type}` : ""}` : "";
    scheduleLines.push(`  o ${wp.label.trim()}${ratePart}`);
  }
  return {
    partnerName: form.client_company_name || null,
    locations: locationLines.join("\n"),
    scheduleDetails: scheduleLines.length > 1 ? scheduleLines.join("\n") : null,
    totalRate: form.compensation_summary || null,
    perDiem: form.per_diem || null,
    dressCode: form.dress_code || null,
    policies: form.policies || null,
    travelNotes: form.travel_notes || null,
    payrollNotes: form.payroll_notes || null,
    signByDate: form.sign_by_date ? d(form.sign_by_date) : null,
  };
}

async function seedProjectFields() {
  await prisma.project.update({
    where: { id: PROJECT_ID },
    data: {
      seedKey: OPS_SEED_KEY,
      description:
        "Full redesign of the marketing website including launch-week activations, stakeholder demos, and on-site support.",
      usrNumber: "USR-1001",
      timezone: "Eastern Time (ET)",
      propertyName: "PaperFlight HQ — Marketing Wing",
      address: "100 Wall Street, Suite 2800",
      city: "New York",
      state: "NY",
      zipCode: "10005",
      numAttendees: 120,
      numAgents: 3,
      numMedics: 1,
      numSecurity: 2,
      securityDirectorName: "Marcus Rivera",
      securityDirectorPhone: "+1-212-555-1002",
      securityDirectorEmail: "m.rivera@paperflight.demo",
      sowPerDiem: SOW_PER_DIEM,
      sowDressCode: SOW_DRESS,
      visibleSections: null,
      updatedAt: new Date(),
    },
  });
}

async function seedCoreRoster(opsUserIds) {
  await prisma.projectLeadAssignment.upsert({
    where: { projectId: PROJECT_ID },
    create: { projectId: PROJECT_ID, userId: bi(1012) },
    update: { userId: bi(1012), updatedAt: new Date() },
  });

  const staffRows = [
    {
      id: bi(100101),
      userId: opsUserIds.charlotte,
      role: "agent",
      workDate: d("2026-01-15"),
      endDate: d("2026-04-30"),
      startTime: "08:00",
      endTime: "16:00",
      position: "VIP Escort",
      status: "confirmed",
      onSite: true,
      sortOrder: 1,
    },
    {
      id: bi(100102),
      userId: opsUserIds.steven,
      role: "agent",
      workDate: d("2026-01-15"),
      endDate: d("2026-03-31"),
      startTime: "09:00",
      endTime: "17:00",
      position: "Gate Lead",
      status: "confirmed",
      onSite: true,
      sortOrder: 2,
    },
    {
      id: bi(100103),
      userId: bi(1012),
      role: "agent",
      workDate: d("2026-02-01"),
      endDate: d("2026-04-30"),
      startTime: "08:30",
      endTime: "16:30",
      position: "Lead Agent",
      status: "confirmed",
      onSite: false,
      sortOrder: 3,
    },
    {
      id: bi(100104),
      userId: opsUserIds.jason,
      role: "medic",
      workDate: d("2026-01-15"),
      endDate: d("2026-04-30"),
      startTime: "07:00",
      endTime: "19:00",
      position: "Medical Standby",
      status: "confirmed",
      onSite: true,
      sortOrder: 1,
    },
    {
      id: bi(100105),
      userId: opsUserIds.raymond,
      role: "security",
      workDate: d("2026-01-15"),
      endDate: d("2026-04-30"),
      startTime: "06:00",
      endTime: "18:00",
      position: "Perimeter Security",
      status: "confirmed",
      onSite: true,
      sortOrder: 1,
    },
    {
      id: bi(100106),
      userId: bi(1013),
      role: "security",
      workDate: d("2026-02-15"),
      endDate: d("2026-04-15"),
      startTime: "12:00",
      endTime: "20:00",
      position: "Access Control",
      status: "confirmed",
      onSite: true,
      sortOrder: 2,
    },
  ];

  for (const row of staffRows) {
    const { id, userId, ...data } = row;
    await prisma.projectStaffAssignment.upsert({
      where: { id },
      create: { id, projectId: PROJECT_ID, userId, ...data },
      update: { ...data, updatedAt: new Date() },
    });
  }

  const checklistRows = [
    { id: bi(100101), name: "Confirm stakeholder list and launch criteria", phase: "pre_project", status: "completed", sortOrder: 1, completedById: bi(1012) },
    { id: bi(100102), name: "Reserve demo / staging environment", phase: "pre_project", status: "completed", sortOrder: 2, completedById: opsUserIds.charlotte },
    { id: bi(100103), name: "Security briefing with facilities team", phase: "pre_project", status: "pending", sortOrder: 3, completedById: null },
    { id: bi(100104), name: "Daily standup with design team", phase: "project", status: "pending", sortOrder: 1, completedById: null },
    { id: bi(100105), name: "Monitor uptime during cutover window", phase: "project", status: "pending", sortOrder: 2, completedById: null },
    { id: bi(100106), name: "Coordinate content migration checklist", phase: "project", status: "pending", sortOrder: 3, completedById: null },
    { id: bi(100107), name: "Collect feedback from marketing stakeholders", phase: "post_project", status: "pending", sortOrder: 1, completedById: null },
    { id: bi(100108), name: "Archive legacy site assets", phase: "post_project", status: "pending", sortOrder: 2, completedById: null },
    { id: bi(100109), name: "Post-launch retrospective", phase: "post_project", status: "pending", sortOrder: 3, completedById: null },
  ];

  for (const row of checklistRows) {
    const { id, ...data } = row;
    await prisma.projectChecklistItem.upsert({
      where: { id },
      create: { id, projectId: PROJECT_ID, ...data },
      update: { ...data, updatedAt: new Date() },
    });
  }

  for (const row of [
    { userId: opsUserIds.charlotte, confirmed: true, whatsapp: true, housing: true, attire: true, meals: true, parking: false, policy: true, checkIn: true, hotelSecurity: true },
    { userId: opsUserIds.steven, confirmed: true, whatsapp: true, housing: true, attire: false, meals: true, parking: true, policy: true, checkIn: false, hotelSecurity: false },
    { userId: bi(1012), confirmed: true, whatsapp: false, housing: false, attire: true, meals: false, parking: false, policy: true, checkIn: true, hotelSecurity: false },
    { userId: opsUserIds.jason, confirmed: true, whatsapp: true, housing: false, attire: true, meals: true, parking: false, policy: true, checkIn: false, hotelSecurity: false },
    { userId: opsUserIds.raymond, confirmed: false, whatsapp: true, housing: true, attire: true, meals: false, parking: true, policy: false, checkIn: true, hotelSecurity: true },
  ]) {
    await prisma.projectAgentChecklist.upsert({
      where: { projectId_userId: { projectId: PROJECT_ID, userId: row.userId } },
      create: { projectId: PROJECT_ID, ...row },
      update: { ...row, updatedAt: new Date() },
    });
  }

  await prisma.projectLodgingHotel.upsert({
    where: { id: bi(100101) },
    create: {
      id: bi(100101),
      projectId: PROJECT_ID,
      name: "Midtown Suites",
      address: "123 E 45th St, New York, NY 10017",
    },
    update: { name: "Midtown Suites", address: "123 E 45th St, New York, NY 10017", updatedAt: new Date() },
  });

  for (const row of [
    { id: bi(100101), hotelId: bi(100101), userId: opsUserIds.charlotte, role: "agent", room: "412" },
    { id: bi(100102), hotelId: bi(100101), userId: opsUserIds.steven, role: "agent", room: "414" },
    { id: bi(100103), hotelId: bi(100101), userId: opsUserIds.raymond, role: "security", room: "518" },
  ]) {
    const { id, ...data } = row;
    await prisma.projectLodgingAssignment.upsert({
      where: { id },
      create: { id, projectId: PROJECT_ID, ...data },
      update: { ...data, updatedAt: new Date() },
    });
  }

  for (const row of [
    { id: bi(100101), vendorId: bi(1001), name: "CloudPrint Supply Co.", email: "orders@cloudprint.demo", phone: "+1-800-555-0601" },
    { id: bi(100102), vendorId: null, name: "BrightSign AV Rentals", email: "events@brightsign.demo", phone: "+1-212-555-8800" },
    { id: bi(100103), vendorId: null, name: "Metro Catering Group", email: "events@metrocatering.demo", phone: "+1-212-555-7700" },
  ]) {
    const { id, ...data } = row;
    await prisma.projectVendorLink.upsert({
      where: { id },
      create: { id, projectId: PROJECT_ID, ...data },
      update: { ...data, updatedAt: new Date() },
    });
  }
}

async function seedExtendedSections(opsUserIds) {
  console.log("[seed-project-ops] Seeding notes, medical, incidents, files, missions, SOW, locations…");

  for (const row of [
    {
      id: bi(100101),
      userId: bi(1012),
      content:
        "Launch rehearsal scheduled for April 28. All agents should confirm hotel check-in by April 27 evening.",
    },
    {
      id: bi(100102),
      userId: opsUserIds.charlotte,
      content: "On Location client walkthrough completed. Dress code handout sent to all agents.",
    },
    {
      id: bi(100103),
      userId: opsUserIds.jason,
      content: "Medical kit restocked. AED checked at HQ loading dock — battery OK.",
    },
  ]) {
    const { id, ...data } = row;
    await prisma.projectNote.upsert({
      where: { id },
      create: { id, projectId: PROJECT_ID, ...data },
      update: { ...data, updatedAt: new Date() },
    });
  }

  for (const row of [
    {
      id: bi(100101),
      facilityType: "hospital",
      name: "NYU Langone Health — Tisch Hospital",
      address: "550 First Ave, New York, NY 10016",
      phone: "+1-212-263-7300",
      distance: "2.1 mi",
      notes: "Primary ER for serious medical events.",
    },
    {
      id: bi(100102),
      facilityType: "urgent_care",
      name: "CityMD Urgent Care — Financial District",
      address: "139 Fulton St, New York, NY 10038",
      phone: "+1-646-987-1234",
      distance: "0.4 mi",
      notes: "Walk-in care for minor injuries.",
    },
  ]) {
    const { id, ...data } = row;
    await prisma.projectMedicalFacility.upsert({
      where: { id },
      create: { id, projectId: PROJECT_ID, ...data },
      update: { ...data, updatedAt: new Date() },
    });
  }

  for (const row of [
    {
      id: bi(100101),
      itemName: "Black North Face backpack",
      description: "Contains marketing collateral and charger cables.",
      foundDate: d("2026-04-14"),
      foundLocation: "Hudson Yards Client Event Space",
      foundByUserId: opsUserIds.steven,
      status: "unclaimed",
      notes: "Stored at lead agent desk.",
    },
    {
      id: bi(100102),
      itemName: "iPhone 14 Pro",
      description: "Blue case, lock screen company logo.",
      foundDate: d("2026-04-15"),
      foundLocation: "PaperFlight HQ lobby",
      foundByUserId: opsUserIds.raymond,
      status: "returned",
      notes: "Returned to guest services.",
    },
  ]) {
    const { id, ...data } = row;
    await prisma.projectLostFoundItem.upsert({
      where: { id },
      create: { id, projectId: PROJECT_ID, ...data },
      update: { ...data, updatedAt: new Date() },
    });
  }

  for (const row of [
    {
      id: bi(100101),
      title: "Minor crowd surge at demo entrance",
      description: "Brief congestion at VIP check-in; cleared within 5 minutes. No injuries.",
      severity: "medium",
      status: "open",
      location: "PaperFlight HQ — Marketing Wing",
      reportedBy: opsUserIds.charlotte,
      reportedAt: d("2026-04-13"),
    },
    {
      id: bi(100102),
      title: "Lost contractor badge",
      description: "Subcontractor reported missing badge; access revoked and replacement issued.",
      severity: "low",
      status: "resolved",
      location: "Loading dock",
      reportedBy: opsUserIds.raymond,
      reportedAt: d("2026-04-12"),
    },
  ]) {
    const { id, ...data } = row;
    await prisma.projectIncidentReport.upsert({
      where: { id },
      create: { id, projectId: PROJECT_ID, ...data },
      update: { ...data, updatedAt: new Date() },
    });
  }

  await prisma.projectAfterActionReport.upsert({
    where: { projectId: PROJECT_ID },
    create: {
      projectId: PROJECT_ID,
      eventSummary:
        "Launch-week activations for the PaperFlight website redesign ran across three NYC venues with 120 attendees.",
      wentWell: "Team communication was strong. Medical standby was not needed. Client praised professionalism.",
      improvements: "Earlier badge printing would reduce morning queue times.",
      actionItems: "Update check-in SOP; add spare AED battery to medic kit.",
      staffPerformance: "Charlotte Wong and Steven Lloyd received client commendations.",
    },
    update: {
      eventSummary:
        "Launch-week activations for the PaperFlight website redesign ran across three NYC venues with 120 attendees.",
      wentWell: "Team communication was strong. Medical standby was not needed. Client praised professionalism.",
      improvements: "Earlier badge printing would reduce morning queue times.",
      actionItems: "Update check-in SOP; add spare AED battery to medic kit.",
      staffPerformance: "Charlotte Wong and Steven Lloyd received client commendations.",
      updatedAt: new Date(),
    },
  });

  for (const row of [
    { id: bi(100101), name: "VIP Escort", sortOrder: 1 },
    { id: bi(100102), name: "Gate Lead", sortOrder: 2 },
    { id: bi(100103), name: "Medical Standby", sortOrder: 3 },
    { id: bi(100104), name: "Perimeter Security", sortOrder: 4 },
    { id: bi(100105), name: "Access Control", sortOrder: 5 },
  ]) {
    const { id, ...data } = row;
    await prisma.projectPosition.upsert({
      where: { id },
      create: { id, projectId: PROJECT_ID, ...data },
      update: { ...data, updatedAt: new Date() },
    });
  }

  for (const row of [
    { id: bi(100101), userId: bi(1012), userType: "staff", logType: "checklist_update", remark: "Marked pre-project security briefing as pending." },
    { id: bi(100102), userId: opsUserIds.charlotte, userType: "staff", logType: "sow_update", remark: "Updated Scope of Work for Charlotte Wong." },
    { id: bi(100103), userId: opsUserIds.raymond, userType: "staff", logType: "incident_report", remark: "Filed incident: minor crowd surge at demo entrance." },
    { id: bi(100104), userId: bi(1012), userType: "staff", logType: "note", remark: "Added launch rehearsal note for all agents." },
  ]) {
    const { id, ...data } = row;
    await prisma.projectActivityLog.upsert({
      where: { id },
      create: { id, projectId: PROJECT_ID, ...data },
      update: { ...data, updatedAt: new Date() },
    });
  }

  for (const row of [
    {
      id: bi(100101),
      fileName: "site-security-plan.pdf",
      filePath: "/uploads/demo/project-1001/site-security-plan.pdf",
      title: "Site Security Plan",
      category: "Document",
      docType: "pdf",
    },
    {
      id: bi(100102),
      fileName: "risk-matrix-v1.pdf",
      filePath: "/uploads/demo/project-1001/risk-matrix-v1.pdf",
      title: "Risk Assessment Matrix",
      category: "Risk Assessment",
      docType: "pdf",
    },
    {
      id: bi(100103),
      fileName: "staffing-roster.xlsx",
      filePath: "/uploads/demo/project-1001/staffing-roster.xlsx",
      title: "Launch Week Staffing Roster",
      category: "File",
      docType: "xlsx",
    },
    {
      id: bi(100104),
      fileName: "emergency-contacts.pdf",
      filePath: "/uploads/demo/project-1001/emergency-contacts.pdf",
      title: "Emergency Contacts",
      category: "Document",
      docType: "pdf",
    },
  ]) {
    const { id, ...data } = row;
    await prisma.projectFile.upsert({
      where: { id },
      create: { id, projectId: PROJECT_ID, ...data },
      update: { ...data, updatedAt: new Date() },
    });
  }

  for (const row of [
    {
      id: bi(100101),
      missionNumber: "M-001",
      address: "100 Wall Street, New York, NY 10005",
      status: "Completed",
      notes: "Pre-event walkthrough with On Location client team.",
    },
    {
      id: bi(100102),
      missionNumber: "M-002",
      address: "20 Hudson Yards, New York, NY 10001",
      status: "In Progress",
      notes: "Launch day command post — VIP reception.",
    },
    {
      id: bi(100103),
      missionNumber: "M-003",
      address: "Brooklyn Pop-up Showcase, Brooklyn, NY",
      status: "Pending",
      notes: "Secondary activation site setup.",
    },
  ]) {
    const { id, ...data } = row;
    await prisma.projectMission.upsert({
      where: { id },
      create: { id, projectId: PROJECT_ID, ...data },
      update: { ...data, updatedAt: new Date() },
    });
  }

  await prisma.projectUser.createMany({
    data: [
      { projectId: PROJECT_ID, userId: bi(1012) },
      { projectId: PROJECT_ID, userId: opsUserIds.charlotte },
      { projectId: PROJECT_ID, userId: opsUserIds.steven },
      { projectId: PROJECT_ID, userId: bi(1001) },
    ],
    skipDuplicates: true,
  });
}

async function seedEmployeePayout(opsUserIds) {
  console.log("[seed-project-ops] Seeding employee payout defaults and project rates…");

  await upsertSetting(
    CO,
    "employee_payout_defaults",
    JSON.stringify({
      agent: { per_day: "600", half_day: "300" },
      medic: { per_day: "800", half_day: "400" },
      security: { per_day: "500", half_day: "250" },
    }),
  );

  const rateRows = [
    { userId: opsUserIds.charlotte, role: "agent", payRate: 600, halfDayRate: 300, notes: "VIP escort — standard agent rate" },
    { userId: opsUserIds.steven, role: "agent", payRate: 600, halfDayRate: 300, notes: null },
    { userId: opsUserIds.jason, role: "medic", payRate: 800, halfDayRate: 400, notes: "Lead medic" },
    { userId: opsUserIds.raymond, role: "security", payRate: 500, halfDayRate: 250, notes: null },
  ];

  for (const row of rateRows) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO project_employee_pay_rates (project_id, user_id, role, rate_type, pay_rate, half_day_rate, notes, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, 'per_day', $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT (project_id, user_id)
       DO UPDATE SET role = EXCLUDED.role, pay_rate = EXCLUDED.pay_rate, half_day_rate = EXCLUDED.half_day_rate,
         notes = EXCLUDED.notes, updated_at = NOW()`,
      PROJECT_ID,
      row.userId,
      row.role,
      row.payRate,
      row.halfDayRate,
      row.notes,
      CO,
    );
  }
}

async function seedGanttLocations() {
  console.log("[seed-project-ops] Seeding Gantt locations linked to project 1001…");

  await prisma.ganttProject.upsert({
    where: { id: GANTT_PROJECT_ID },
    create: {
      id: GANTT_PROJECT_ID,
      name: "PaperFlight Website Redesign Launch",
      startDate: d("2026-01-15"),
      endDate: d("2026-04-30"),
      color: "#3B82F6",
      progress: 65,
      companyId: String(CO),
      projectRefId: PROJECT_ID,
      status: "active",
    },
    update: {
      name: "PaperFlight Website Redesign Launch",
      startDate: d("2026-01-15"),
      endDate: d("2026-04-30"),
      projectRefId: PROJECT_ID,
      companyId: String(CO),
      updatedAt: new Date(),
    },
  });

  const locations = [
    {
      id: "demo-ops-loc-hq",
      name: "PaperFlight HQ — Marketing Wing",
      addressLine1: "100 Wall Street, Suite 2800",
      city: "New York",
      state: "NY",
      zipCode: "10005",
      latitude: 40.706,
      longitude: -74.0089,
      startDate: d("2026-04-12"),
      endDate: d("2026-04-21"),
      color: "#6366F1",
    },
    {
      id: "demo-ops-loc-hudson",
      name: "Hudson Yards Client Event Space",
      addressLine1: "20 Hudson Yards",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      latitude: 40.7536,
      longitude: -74.0014,
      startDate: d("2026-04-13"),
      endDate: d("2026-04-20"),
      color: "#22C55E",
    },
    {
      id: "demo-ops-loc-brooklyn",
      name: "Brooklyn Pop-up Showcase",
      addressLine1: "45 Main St",
      city: "Brooklyn",
      state: "NY",
      zipCode: "11201",
      latitude: 40.7021,
      longitude: -73.9872,
      startDate: d("2026-04-18"),
      endDate: d("2026-04-19"),
      color: "#F59E0B",
    },
  ];

  for (const loc of locations) {
    const { id, ...data } = loc;
    await prisma.ganttProjectLocation.upsert({
      where: { id },
      create: { id, projectId: GANTT_PROJECT_ID, ...data },
      update: { ...data, updatedAt: new Date() },
    });
  }
}

async function seedSowRecords(opsUserIds) {
  console.log("[seed-project-ops] Seeding Scope of Work (Lynn Nicely style)…");

  const charlotteForm = buildLynnStyleSowForm("Charlotte Wong", "c.wong@paperflight.demo");
  const charlotteRecord = sowFormToRecord(charlotteForm);

  await prisma.projectStaffSow.upsert({
    where: { projectId_userId: { projectId: PROJECT_ID, userId: opsUserIds.charlotte } },
    create: {
      projectId: PROJECT_ID,
      userId: opsUserIds.charlotte,
      ...charlotteRecord,
      status: "sent",
      formData: charlotteForm,
    },
    update: {
      ...charlotteRecord,
      status: "sent",
      formData: charlotteForm,
      updatedAt: new Date(),
    },
  });

  const stevenForm = buildLynnStyleSowForm("Steven Lloyd", "s.lloyd@paperflight.demo", { partial: true });
  const stevenRecord = sowFormToRecord(stevenForm);

  await prisma.projectStaffSow.upsert({
    where: { projectId_userId: { projectId: PROJECT_ID, userId: opsUserIds.steven } },
    create: {
      projectId: PROJECT_ID,
      userId: opsUserIds.steven,
      ...stevenRecord,
      status: "draft",
      formData: stevenForm,
    },
    update: {
      ...stevenRecord,
      status: "draft",
      formData: stevenForm,
      updatedAt: new Date(),
    },
  });
}

async function main() {
  console.log("[seed-project-ops] Ensuring schemas…");
  const scripts = [
    "ensure-project-operations-schema.js",
    "ensure-project-sow-schema.js",
    "ensure-project-employee-pay-rates-schema.js",
    "ensure-gantt-location-schema.js",
    "ensure-project-missions-schema.js",
  ];
  for (const script of scripts) {
    execSync(`node ./scripts/${script}`, { cwd: path.join(__dirname, ".."), stdio: "inherit" });
  }

  const project = await prisma.project.findFirst({ where: { id: PROJECT_ID } });
  if (!project) {
    console.error("[seed-project-ops] Project 1001 not found. Run seed-demo-data.js first.");
    process.exit(1);
  }

  const existingStaff = await prisma.projectStaffAssignment.count({ where: { projectId: PROJECT_ID } });
  const force = process.env.FORCE_PROJECT_OPS_SEED === "1";

  if (force && existingStaff > 0) {
    console.log("[seed-project-ops] FORCE_PROJECT_OPS_SEED=1 — clearing existing operations data…");
    await clearProjectOpsData(PROJECT_ID);
  } else if (existingStaff > 0 && !force) {
    console.log("[seed-project-ops] Roster exists — upserting supplementary sections (use FORCE_PROJECT_OPS_SEED=1 to reset roster).");
  }

  const demoHash = await bcrypt.hash("1234", 10);
  console.log("[seed-project-ops] Upserting operations roster users…");
  const opsUserIds = await seedOpsUsers(demoHash);

  await seedProjectFields();

  if (existingStaff === 0 || force) {
    console.log("[seed-project-ops] Seeding core roster, checklist, lodging, vendors…");
    await seedCoreRoster(opsUserIds);
  }

  await seedExtendedSections(opsUserIds);
  await seedEmployeePayout(opsUserIds);
  await seedGanttLocations();
  await seedSowRecords(opsUserIds);

  const counts = {
    staff: await prisma.projectStaffAssignment.count({ where: { projectId: PROJECT_ID } }),
    checklist: await prisma.projectChecklistItem.count({ where: { projectId: PROJECT_ID } }),
    sow: await prisma.projectStaffSow.count({ where: { projectId: PROJECT_ID } }),
    locations: await prisma.ganttProjectLocation.count({ where: { projectId: GANTT_PROJECT_ID } }),
    files: await prisma.projectFile.count({ where: { projectId: PROJECT_ID } }),
    missions: await prisma.projectMission.count({ where: { projectId: PROJECT_ID } }),
  };

  console.log(`[seed-project-ops] Done — project ${PROJECT_ID} (${OPS_SEED_KEY}):`);
  console.log(`  staff=${counts.staff} checklist=${counts.checklist} sow=${counts.sow} gantt_locations=${counts.locations} files=${counts.files} missions=${counts.missions}`);
  console.log("[seed-project-ops] Open http://localhost:5000/project/1001?tab=overview");
  console.log("[seed-project-ops] SOW PDF: http://localhost:5000/api/project/1001/sow/" + Number(opsUserIds.charlotte) + "/pdf");
}

main()
  .catch((err) => {
    console.error("[seed-project-ops] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
