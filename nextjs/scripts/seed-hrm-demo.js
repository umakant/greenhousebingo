/* eslint-disable no-console */
/**
 * Seed HRM demo data for dashboard and module pages.
 *
 * Usage:
 *   npm run db:seed:hrm
 *   npm run db:seed:hrm:force
 *   npm run db:seed:hrm:first-aid
 *
 * Target one company:
 *   node ./scripts/seed-hrm-demo.js --force --email=tommy@firstaidresponders.net
 *   node ./scripts/seed-hrm-demo.js --force --name="First Aid Responders"
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const FORCE = process.argv.includes("--force");

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const FILTER_EMAIL = readArg("--email");
const FILTER_NAME = readArg("--name");

/** PostgreSQL DATE rows are stored as UTC midnight — match dashboard API. */
function utcDateOnly(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function addDays(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return utcDateOnly(x);
}

function daysBetween(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

async function wipeHrmData(companyId) {
  const empIds = (
    await prisma.hrmEmployee.findMany({
      where: { createdBy: companyId },
      select: { id: true },
    })
  ).map((e) => e.id);

  if (empIds.length) {
    await prisma.hrmAcknowledgment.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.hrmPayroll.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.hrmSalaryAllocation.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.hrmDocument.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.hrmTransfer.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.hrmComplaint.deleteMany({
      where: { OR: [{ complainantId: { in: empIds } }, { againstId: { in: empIds } }] },
    });
    await prisma.hrmWarning.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.hrmTermination.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.hrmResignation.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.hrmPromotion.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.hrmAward.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.hrmLeaveApplication.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.hrmAttendance.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.hrmEmployee.deleteMany({ where: { id: { in: empIds } } });
  }

  await prisma.hrmDesignation.deleteMany({ where: { createdBy: companyId } });
  await prisma.hrmDepartment.deleteMany({ where: { createdBy: companyId } });
  await prisma.hrmBranch.deleteMany({ where: { createdBy: companyId } });
  await prisma.hrmShift.deleteMany({ where: { createdBy: companyId } });
  await prisma.hrmLeaveType.deleteMany({ where: { createdBy: companyId } });
  await prisma.hrmHoliday.deleteMany({ where: { createdBy: companyId } });
  await prisma.hrmAwardType.deleteMany({ where: { createdBy: companyId } });
  await prisma.hrmAnnouncement.deleteMany({ where: { createdBy: companyId } });
  await prisma.hrmEvent.deleteMany({ where: { createdBy: companyId } });
}

async function seedOrg(companyId, company) {
  const label = company.name ?? company.email ?? String(companyId);
  console.log(`[hrm-seed] Seeding ${label} (id=${companyId})…`);

  const empCode = (n) => `EMP-${String(companyId)}-${String(n).padStart(3, "0")}`;

  const today = utcDateOnly();
  const month = today.getUTCMonth() + 1;
  const year = today.getUTCFullYear();

  // ── Branches ──────────────────────────────────────────────────────────────
  const [hq, field, training] = await Promise.all([
    prisma.hrmBranch.create({
      data: {
        name: "Main HQ",
        description: "Corporate headquarters and dispatch center",
        phone: "(215) 555-0100",
        email: "hq@firstaidresponders.net",
        address: "1200 Market Street",
        city: "Philadelphia",
        country: "USA",
        createdBy: companyId,
      },
    }),
    prisma.hrmBranch.create({
      data: {
        name: "Philadelphia Field Unit",
        description: "On-site event and emergency response teams",
        phone: "(215) 555-0101",
        email: "field@firstaidresponders.net",
        address: "4500 City Ave",
        city: "Philadelphia",
        country: "USA",
        createdBy: companyId,
      },
    }),
    prisma.hrmBranch.create({
      data: {
        name: "Training Center",
        description: "CPR, first aid, and medic certification programs",
        phone: "(215) 555-0102",
        email: "training@firstaidresponders.net",
        address: "800 Spring Garden St",
        city: "Philadelphia",
        country: "USA",
        createdBy: companyId,
      },
    }),
  ]);

  // ── Departments ───────────────────────────────────────────────────────────
  const deptSpecs = [
    { name: "Field Operations", branchId: field.id, desc: "Event medics and on-site response" },
    { name: "Medical Training", branchId: training.id, desc: "Instructor-led certification courses" },
    { name: "Dispatch & Logistics", branchId: hq.id, desc: "Scheduling, routing, and supplies" },
    { name: "HR & Administration", branchId: hq.id, desc: "People operations and compliance" },
    { name: "Quality & Safety", branchId: hq.id, desc: "Protocols, audits, and incident review" },
  ];
  const departments = {};
  for (const spec of deptSpecs) {
    const row = await prisma.hrmDepartment.create({
      data: {
        name: spec.name,
        description: spec.desc,
        branchId: spec.branchId,
        createdBy: companyId,
      },
    });
    departments[spec.name] = row;
  }

  // ── Designations ──────────────────────────────────────────────────────────
  const desigSpecs = [
    { name: "Lead Medic", dept: "Field Operations" },
    { name: "Field Medic", dept: "Field Operations" },
    { name: "EMT", dept: "Field Operations" },
    { name: "Training Instructor", dept: "Medical Training" },
    { name: "Course Coordinator", dept: "Medical Training" },
    { name: "Dispatch Supervisor", dept: "Dispatch & Logistics" },
    { name: "Logistics Coordinator", dept: "Dispatch & Logistics" },
    { name: "HR Manager", dept: "HR & Administration" },
    { name: "HR Specialist", dept: "HR & Administration" },
    { name: "Safety Officer", dept: "Quality & Safety" },
  ];
  const designations = {};
  for (const spec of desigSpecs) {
    const row = await prisma.hrmDesignation.create({
      data: {
        name: spec.name,
        departmentId: departments[spec.dept].id,
        createdBy: companyId,
      },
    });
    designations[spec.name] = row;
  }

  // ── Shifts ────────────────────────────────────────────────────────────────
  const dayShift = await prisma.hrmShift.create({
    data: { name: "Day Shift", startTime: "07:00", endTime: "15:00", breakMinutes: 30, createdBy: companyId },
  });
  const eveningShift = await prisma.hrmShift.create({
    data: { name: "Evening Shift", startTime: "15:00", endTime: "23:00", breakMinutes: 30, createdBy: companyId },
  });

  // ── Leave types ───────────────────────────────────────────────────────────
  const leaveTypes = {};
  for (const lt of [
    { name: "Annual Leave", daysAllowed: 15, leaveCode: "AL" },
    { name: "Sick Leave", daysAllowed: 10, leaveCode: "SL" },
    { name: "Personal Leave", daysAllowed: 5, leaveCode: "PL" },
    { name: "Unpaid Leave", daysAllowed: 0, leaveCode: "UL" },
  ]) {
    leaveTypes[lt.name] = await prisma.hrmLeaveType.create({
      data: { ...lt, createdBy: companyId },
    });
  }

  // ── Award types ───────────────────────────────────────────────────────────
  const awardTypes = {};
  for (const name of ["Employee of the Month", "Safety Excellence", "Outstanding Service"]) {
    awardTypes[name] = await prisma.hrmAwardType.create({
      data: { name, description: `${name} recognition`, createdBy: companyId },
    });
  }

  // ── Employees ─────────────────────────────────────────────────────────────
  const employeeSpecs = [
    { id: empCode(1), firstName: "Lynn", lastName: "Nicely", email: "lynn@firstaidresponders.net", phone: "+12155550101", dept: "Field Operations", desig: "Lead Medic", branch: field, shift: dayShift, salary: 62000 },
    { id: empCode(2), firstName: "Marcus", lastName: "Reed", email: "marcus.reed@firstaidresponders.net", phone: "+12155550102", dept: "Field Operations", desig: "Field Medic", branch: field, shift: dayShift, salary: 54000 },
    { id: empCode(3), firstName: "Sofia", lastName: "Martinez", email: "sofia.m@firstaidresponders.net", phone: "+12155550103", dept: "Field Operations", desig: "EMT", branch: field, shift: eveningShift, salary: 48000 },
    { id: empCode(4), firstName: "James", lastName: "Chen", email: "james.chen@firstaidresponders.net", phone: "+12155550104", dept: "Field Operations", desig: "Field Medic", branch: field, shift: dayShift, salary: 52000 },
    { id: empCode(5), firstName: "Aisha", lastName: "Johnson", email: "aisha.j@firstaidresponders.net", phone: "+12155550105", dept: "Medical Training", desig: "Training Instructor", branch: training, shift: dayShift, salary: 58000 },
    { id: empCode(6), firstName: "David", lastName: "Okafor", email: "david.o@firstaidresponders.net", phone: "+12155550106", dept: "Medical Training", desig: "Course Coordinator", branch: training, shift: dayShift, salary: 50000 },
    { id: empCode(7), firstName: "Emily", lastName: "Walsh", email: "emily.w@firstaidresponders.net", phone: "+12155550107", dept: "Dispatch & Logistics", desig: "Dispatch Supervisor", branch: hq, shift: dayShift, salary: 56000 },
    { id: empCode(8), firstName: "Ryan", lastName: "Brooks", email: "ryan.b@firstaidresponders.net", phone: "+12155550108", dept: "Dispatch & Logistics", desig: "Logistics Coordinator", branch: hq, shift: dayShift, salary: 47000 },
    { id: empCode(9), firstName: "Priya", lastName: "Sharma", email: "priya.s@firstaidresponders.net", phone: "+12155550109", dept: "HR & Administration", desig: "HR Manager", branch: hq, shift: dayShift, salary: 65000 },
    { id: empCode(10), firstName: "Tom", lastName: "Nguyen", email: "tom.nguyen@firstaidresponders.net", phone: "+12155550110", dept: "HR & Administration", desig: "HR Specialist", branch: hq, shift: dayShift, salary: 49000 },
    { id: empCode(11), firstName: "Olivia", lastName: "Grant", email: "olivia.g@firstaidresponders.net", phone: "+12155550111", dept: "Quality & Safety", desig: "Safety Officer", branch: hq, shift: dayShift, salary: 55000 },
    { id: empCode(12), firstName: "Kevin", lastName: "Patterson", email: "kevin.p@firstaidresponders.net", phone: "+12155550112", dept: "Field Operations", desig: "EMT", branch: field, shift: eveningShift, salary: 46000 },
    { id: empCode(13), firstName: "Nina", lastName: "Kowalski", email: "nina.k@firstaidresponders.net", phone: "+12155550113", dept: "Field Operations", desig: "Field Medic", branch: field, shift: dayShift, salary: 51000 },
    { id: empCode(14), firstName: "Carlos", lastName: "Diaz", email: "carlos.d@firstaidresponders.net", phone: "+12155550114", dept: "Dispatch & Logistics", desig: "Logistics Coordinator", branch: hq, shift: eveningShift, salary: 45000, status: "inactive" },
  ];

  const employees = [];
  for (let i = 0; i < employeeSpecs.length; i++) {
    const spec = employeeSpecs[i];
    const joining = addDays(today, -180 - i * 14);
    const row = await prisma.hrmEmployee.create({
      data: {
        employeeId: spec.id,
        firstName: spec.firstName,
        lastName: spec.lastName,
        email: spec.email,
        phone: spec.phone,
        gender: i % 2 === 0 ? "female" : "male",
        departmentId: departments[spec.dept].id,
        designationId: designations[spec.desig].id,
        branchId: spec.branch.id,
        shiftId: spec.shift.id,
        status: spec.status ?? "active",
        employeeType: "full_time",
        workType: "on_site",
        joiningDate: joining,
        basicSalary: spec.salary,
        emergencyName: "Emergency Contact",
        emergencyPhone: "+12155559999",
        createdBy: companyId,
      },
    });
    employees.push({ ...spec, row });

    await prisma.hrmSalaryAllocation.create({
      data: {
        employeeId: row.id,
        basicSalary: spec.salary,
        netSalary: spec.salary,
        allowances: { transport: 200, meal: 150 },
        deductions: { tax: 800 },
        effectiveDate: joining,
        createdBy: companyId,
      },
    });
  }

  const activeEmployees = employees.filter((e) => (e.status ?? "active") === "active");
  const byName = Object.fromEntries(employees.map((e) => [`${e.firstName} ${e.lastName}`, e]));

  // ── Today's attendance (present for most active staff) ────────────────────
  const presentToday = activeEmployees.slice(0, 9);
  const onLeaveToday = activeEmployees.slice(9, 11);
  const absentToday = activeEmployees.slice(11, 13);

  for (const emp of presentToday) {
    await prisma.hrmAttendance.create({
      data: {
        employeeId: emp.row.id,
        date: today,
        clockIn: "07:05",
        clockOut: null,
        workHours: 0,
        status: "present",
        createdBy: companyId,
      },
    });
  }

  // Past week attendance for gantt / reports
  for (let d = 1; d <= 5; d++) {
    const date = addDays(today, -d);
    for (const emp of activeEmployees.slice(0, 10)) {
      await prisma.hrmAttendance.create({
        data: {
          employeeId: emp.row.id,
          date,
          clockIn: "07:00",
          clockOut: "15:00",
          workHours: 7.5,
          status: d === 2 && emp.firstName === "Marcus" ? "late" : "present",
          createdBy: companyId,
        },
      });
    }
  }

  // ── Leave applications ────────────────────────────────────────────────────
  const leaveStart = today;
  const leaveEnd = addDays(today, 2);

  for (const emp of onLeaveToday) {
    await prisma.hrmLeaveApplication.create({
      data: {
        employeeId: emp.row.id,
        leaveTypeId: leaveTypes["Annual Leave"].id,
        startDate: leaveStart,
        endDate: leaveEnd,
        totalDays: daysBetween(leaveStart, leaveEnd),
        reason: "Family event",
        status: "approved",
        approvedAt: addDays(today, -3),
        createdBy: companyId,
      },
    });
  }

  const pendingLeaveSpecs = [
    { emp: byName["Sofia Martinez"], type: "Sick Leave", days: 1, reason: "Medical appointment" },
    { emp: byName["James Chen"], type: "Personal Leave", days: 2, reason: "Personal matter" },
    { emp: byName["David Okafor"], type: "Annual Leave", days: 5, reason: "Vacation" },
    { emp: byName["Ryan Brooks"], type: "Sick Leave", days: 1, reason: "Flu symptoms" },
  ];
  for (const spec of pendingLeaveSpecs) {
    if (!spec.emp) continue;
    const start = addDays(today, 7);
    const end = addDays(start, spec.days - 1);
    await prisma.hrmLeaveApplication.create({
      data: {
        employeeId: spec.emp.row.id,
        leaveTypeId: leaveTypes[spec.type].id,
        startDate: start,
        endDate: end,
        totalDays: spec.days,
        reason: spec.reason,
        status: "pending",
        createdBy: companyId,
      },
    });
  }

  // Recent approved / rejected for dashboard list
  await prisma.hrmLeaveApplication.create({
    data: {
      employeeId: byName["Emily Walsh"].row.id,
      leaveTypeId: leaveTypes["Annual Leave"].id,
      startDate: addDays(today, -14),
      endDate: addDays(today, -10),
      totalDays: 5,
      reason: "Holiday travel",
      status: "approved",
      approvedAt: addDays(today, -20),
      createdBy: companyId,
    },
  });
  await prisma.hrmLeaveApplication.create({
    data: {
      employeeId: byName["Olivia Grant"].row.id,
      leaveTypeId: leaveTypes["Personal Leave"].id,
      startDate: addDays(today, 3),
      endDate: addDays(today, 3),
      totalDays: 1,
      reason: "Court appointment",
      status: "rejected",
      createdBy: companyId,
    },
  });

  // ── Promotions ────────────────────────────────────────────────────────────
  const promoSpecs = [
    { emp: byName["Lynn Nicely"], from: "Field Medic", to: "Lead Medic", daysAgo: 45 },
    { emp: byName["Marcus Reed"], from: "EMT", to: "Field Medic", daysAgo: 120 },
    { emp: byName["Aisha Johnson"], from: "Course Coordinator", to: "Training Instructor", daysAgo: 90 },
    { emp: byName["Emily Walsh"], from: "Logistics Coordinator", to: "Dispatch Supervisor", daysAgo: 200 },
    { emp: byName["Priya Sharma"], from: "HR Specialist", to: "HR Manager", daysAgo: 300 },
    { emp: byName["James Chen"], from: "EMT", to: "Field Medic", daysAgo: 60 },
  ];
  for (const spec of promoSpecs) {
    if (!spec.emp) continue;
    await prisma.hrmPromotion.create({
      data: {
        employeeId: spec.emp.row.id,
        fromDesignationId: designations[spec.from]?.id ?? null,
        toDesignationId: designations[spec.to]?.id ?? null,
        date: addDays(today, -spec.daysAgo),
        description: `Promoted to ${spec.to}`,
        createdBy: companyId,
      },
    });
  }

  // ── Terminations (this month) ─────────────────────────────────────────────
  await prisma.hrmTermination.create({
    data: {
      employeeId: employees.find((e) => e.status === "inactive").row.id,
      terminationType: "voluntary",
      noticeDate: addDays(today, -10),
      terminationDate: addDays(today, -3),
      reason: "Relocated out of state",
      createdBy: companyId,
    },
  });
  await prisma.hrmTermination.create({
    data: {
      employeeId: byName["Kevin Patterson"].row.id,
      terminationType: "contract_end",
      noticeDate: addDays(today, -5),
      terminationDate: addDays(today, -1),
      reason: "Seasonal contract completed",
      createdBy: companyId,
    },
  });

  // ── Resignations (pending) ────────────────────────────────────────────────
  await prisma.hrmResignation.create({
    data: {
      employeeId: byName["Ryan Brooks"].row.id,
      noticeDate: addDays(today, -2),
      resignationDate: addDays(today, 14),
      reason: "Accepted position elsewhere",
      status: "pending",
      createdBy: companyId,
    },
  });
  await prisma.hrmResignation.create({
    data: {
      employeeId: byName["David Okafor"].row.id,
      noticeDate: today,
      resignationDate: addDays(today, 30),
      reason: "Career change",
      status: "pending",
      createdBy: companyId,
    },
  });

  // ── Awards ──────────────────────────────────────────────────────────────────
  await prisma.hrmAward.create({
    data: {
      employeeId: byName["Lynn Nicely"].row.id,
      awardTypeId: awardTypes["Employee of the Month"].id,
      awardName: "Medic of the Month — June",
      date: addDays(today, -5),
      gift: "Gift card",
      cashPrice: 250,
      description: "Outstanding response at SHRM event",
      createdBy: companyId,
    },
  });
  await prisma.hrmAward.create({
    data: {
      employeeId: byName["Olivia Grant"].row.id,
      awardTypeId: awardTypes["Safety Excellence"].id,
      awardName: "Zero Incident Q2",
      date: addDays(today, -12),
      description: "Led safety audit with no findings",
      createdBy: companyId,
    },
  });

  // ── Holidays & events (calendar) ──────────────────────────────────────────
  const holidaySpecs = [
    { name: "Independence Day", offset: 24 },
    { name: "Company Wellness Day", offset: 45 },
    { name: "Labor Day", offset: 78 },
  ];
  for (const h of holidaySpecs) {
    await prisma.hrmHoliday.create({
      data: {
        name: h.name,
        date: addDays(today, h.offset),
        description: `${h.name} — office closed`,
        createdBy: companyId,
      },
    });
  }

  await prisma.hrmEvent.create({
    data: {
      title: "All-Staff Safety Briefing",
      description: "Quarterly protocol review for field and training teams",
      startAt: new Date(Date.now() + 7 * 86400000),
      endAt: new Date(Date.now() + 7 * 86400000 + 2 * 3600000),
      location: "Training Center — Room A",
      createdBy: companyId,
    },
  });

  // ── Announcements ───────────────────────────────────────────────────────────
  await prisma.hrmAnnouncement.create({
    data: {
      title: "Summer event season staffing update",
      body: "Please confirm your availability for June–August assignments in the dispatch portal by Friday.",
      startsAt: addDays(today, -2),
      endsAt: addDays(today, 30),
      createdBy: companyId,
    },
  });
  await prisma.hrmAnnouncement.create({
    data: {
      title: "CPR recertification deadline",
      body: "All field medics must complete recertification before July 31. Contact Medical Training to schedule.",
      startsAt: addDays(today, -7),
      endsAt: addDays(today, 60),
      createdBy: companyId,
    },
  });

  // ── Warnings, transfers, documents, payroll ─────────────────────────────────
  await prisma.hrmWarning.create({
    data: {
      employeeId: byName["Kevin Patterson"].row.id,
      subject: "Late arrival — repeated",
      warningDate: addDays(today, -15),
      description: "Three late clock-ins documented in May.",
      createdBy: companyId,
    },
  });

  await prisma.hrmTransfer.create({
    data: {
      employeeId: byName["Marcus Reed"].row.id,
      fromDepartmentId: departments["Field Operations"].id,
      toDepartmentId: departments["Field Operations"].id,
      fromBranchId: hq.id,
      toBranchId: field.id,
      transferDate: addDays(today, -90),
      description: "Moved to Philadelphia Field Unit for event coverage",
      createdBy: companyId,
    },
  });

  await prisma.hrmDocument.create({
    data: {
      employeeId: byName["Lynn Nicely"].row.id,
      documentType: "certification",
      title: "EMT-B Certification",
      description: "State EMT-B license",
      expiryDate: addDays(today, 365),
      createdBy: companyId,
    },
  });

  for (const emp of activeEmployees.slice(0, 8)) {
    await prisma.hrmPayroll.create({
      data: {
        employeeId: emp.row.id,
        month,
        year,
        basicSalary: emp.salary,
        allowances: 350,
        overtime: emp.firstName === "Lynn" ? 420 : 0,
        bonus: 0,
        deductions: 800,
        tax: 1200,
        netSalary: emp.salary - 800 - 1200 + 350,
        status: emp.firstName === "Lynn" ? "paid" : "pending",
        paymentDate: emp.firstName === "Lynn" ? today : null,
        paymentMethod: "direct_deposit",
        createdBy: companyId,
      },
    });
  }

  console.log(
    `[hrm-seed] ✓ ${employees.length} employees, ${presentToday.length} present today, ` +
      `${onLeaveToday.length} on leave, ${absentToday.length} absent, ` +
      `${pendingLeaveSpecs.length} pending leaves, ${promoSpecs.length} promotions`,
  );
}

async function main() {
  const where = { type: "company", isActive: true };
  if (FILTER_EMAIL) where.email = { equals: FILTER_EMAIL, mode: "insensitive" };
  if (FILTER_NAME) where.name = { contains: FILTER_NAME, mode: "insensitive" };

  let companies = await prisma.user.findMany({
    where,
    orderBy: { id: "asc" },
    select: { id: true, name: true, email: true },
  });

  if (!companies.length && (FILTER_EMAIL || FILTER_NAME)) {
    console.error(
      `[hrm-seed] No company matched filter${FILTER_EMAIL ? ` email=${FILTER_EMAIL}` : ""}${FILTER_NAME ? ` name=${FILTER_NAME}` : ""}.`,
    );
    process.exit(1);
  }

  if (!companies.length) {
    console.error("[hrm-seed] No company user found.");
    process.exit(1);
  }

  for (const company of companies) {
    const companyId = company.id;
    const existing = await prisma.hrmEmployee.count({ where: { createdBy: companyId } });

    if (existing > 0 && !FORCE) {
      console.log(`[hrm-seed] Skip ${company.name ?? company.email} — ${existing} employees exist. Use --force.`);
      continue;
    }

    if (FORCE && existing > 0) {
      console.log(`[hrm-seed] Wiping HRM data for ${company.name ?? company.email}…`);
      await wipeHrmData(companyId);
    }

    await seedOrg(companyId, company);
  }

  console.log("[hrm-seed] ✓ HRM demo seed complete.");
}

main()
  .catch((err) => {
    console.error("[hrm-seed] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
