/**
 * Next.js instrumentation hook — runs once when the server starts (both dev & production).
 * Ensures Taskly, HRM, and Appointment permissions exist in the DB and are assigned to company/staff roles.
 * Also ensures the corresponding add_ons entries are enabled.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Run setup in the background — never block server startup.
  // The server is ready to handle requests immediately; setup completes asynchronously.
  Promise.resolve().then(async () => {
    try {
      const { prisma } = await import("@/lib/prisma");
      await ensureTasklySetup(prisma);
      await ensureHrmSetup(prisma);
      await ensureAppointmentSetup(prisma);
      await ensureRecruitmentSetup(prisma);
      await ensureFormBuilderSetup(prisma);
      await ensureProjectSectionFormsSchema(prisma);
      await ensureGanttLocationSchema(prisma);
      await ensureResumeBuilderSetup(prisma);
      await ensureSupportTicketSetup(prisma);
      await ensureAssetsSetup(prisma);
      await ensureWhatsAppSetup(prisma);
      await ensureStorefrontSetup(prisma);
      await ensureStorefrontThemeTemplateSlugColumn(prisma);
      await ensureStorefrontStarterThemeTemplate(prisma);
      await ensureSevenBandShopifyThemeTemplate(prisma);
      await ensureRtMaterialShopifyThemeTemplate(prisma);
      await ensureConceptHtmlThemeTemplate(prisma);
      await ensureExpenseManagementSetup(prisma);
      await ensureLmsSetup(prisma);
      await ensureAffiliateBusinessSetup(prisma);
      await ensureComplianceSetup(prisma);
      await ensureRoutingSetup(prisma);
      const { ensureEventPlatformSetup } = await import("@/lib/event-platform/event-platform-permissions");
      await ensureEventPlatformSetup();
      await ensureEventPlatformPlanMigration(prisma);
      const { ensureMarketplaceSetup } = await import("@/lib/marketplace-permissions");
      await ensureMarketplaceSetup();
      await ensurePlanModulesIncludeAddons(prisma);
      await ensureUserManagementPermissions(prisma);
      const { ensureAllSystemPortalRoles } = await import("@/lib/system-portal-roles");
      await ensureAllSystemPortalRoles();
      await ensurePortalImpersonationPermission(prisma);
      const { ensureManageBrandOwnershipPermission } = await import("@/lib/brand-ownership-role");
      await ensureManageBrandOwnershipPermission();
      console.log("[instrumentation] ensured manage-brand-ownership permission");
    } catch (err) {
      console.error("[instrumentation] failed to seed setup:", err);
    }
  });
}

/**
 * Ensures all plans include FormBuilder and ResumeBuilder in their modules array.
 * Plans with an empty modules array are left as-is (they already inherit all addons).
 * This runs on every server startup so it fixes both dev and production databases.
 */
async function ensurePlanModulesIncludeAddons(prisma: any) {
  const REQUIRED_MODULES = [
    "FormBuilder",
    "ResumeBuilder",
    "SupportTicket",
    "Assets",
    "WhatsAppChat",
    "Storefront",
    "ExpenseManagement",
    "Lms",
    "AffiliateBusiness",
    "Compliance",
    "Routing",
    "Marketplace",
  ];
  try {
    const plans = await prisma.plan.findMany({ select: { id: true, name: true, modules: true } });
    for (const plan of plans) {
      const existing: string[] = Array.isArray(plan.modules) ? plan.modules : [];
      // Skip empty-module plans — they already show all addons
      if (existing.length === 0) continue;
      const existingLower = existing.map((m: string) => m.toLowerCase());
      const toAdd = REQUIRED_MODULES.filter((m) => !existingLower.includes(m.toLowerCase()));
      if (toAdd.length === 0) continue;
      const updated = [...existing, ...toAdd];
      await prisma.plan.update({ where: { id: plan.id }, data: { modules: updated } });
      console.log(`[instrumentation] plan "${plan.name}": added ${toAdd.join(", ")} to modules`);
    }
  } catch (err) {
    console.error("[instrumentation] ensurePlanModulesIncludeAddons failed:", err);
  }
}

/**
 * Plans that include LMS historically bundled Event Platform access. Add EventPlatform to those
 * plans so existing tenants keep access until a superadmin removes it from the plan.
 */
async function ensureEventPlatformPlanMigration(prisma: any) {
  try {
    const plans = await prisma.plan.findMany({ select: { id: true, name: true, modules: true } });
    for (const plan of plans) {
      const existing: string[] = Array.isArray(plan.modules) ? plan.modules : [];
      if (existing.length === 0) continue;
      const existingLower = existing.map((m: string) => m.toLowerCase());
      const hasLms = existingLower.some((m) => m === "lms");
      const hasEventPlatform = existingLower.some((m) => m === "eventplatform");
      if (!hasLms || hasEventPlatform) continue;
      const updated = [...existing, "EventPlatform"];
      await prisma.plan.update({ where: { id: plan.id }, data: { modules: updated } });
      console.log(`[instrumentation] plan "${plan.name}": added EventPlatform (LMS bundle migration)`);
    }
  } catch (err) {
    console.error("[instrumentation] ensureEventPlatformPlanMigration failed:", err);
  }
}

const TASKLY_PERMISSIONS: { id: number; name: string; label: string }[] = [
  { id: 144, name: "manage-project-dashboard", label: "Manage Project Dashboard" },
  { id: 145, name: "manage-project", label: "Manage Project" },
  { id: 146, name: "manage-project-report", label: "Manage Project Report" },
  { id: 147, name: "manage-task-stages", label: "Manage Task Stages" },
  { id: 148, name: "view-project", label: "View Project" },
  { id: 149, name: "create-project", label: "Create Project" },
  { id: 150, name: "edit-project", label: "Edit Project" },
  { id: 151, name: "delete-project", label: "Delete Project" },
  { id: 152, name: "manage-project-task", label: "Manage Project Task" },
  { id: 153, name: "create-project-task", label: "Create Project Task" },
  { id: 154, name: "edit-project-task", label: "Edit Project Task" },
  { id: 155, name: "delete-project-task", label: "Delete Project Task" },
  { id: 156, name: "manage-project-bug", label: "Manage Project Bug" },
  { id: 157, name: "create-project-bug", label: "Create Project Bug" },
  { id: 158, name: "edit-project-bug", label: "Edit Project Bug" },
  { id: 159, name: "delete-project-bug", label: "Delete Project Bug" },
  { id: 160, name: "manage-project-milestone", label: "Manage Project Milestone" },
  { id: 161, name: "manage-project-members", label: "Manage Project Members" },
];

const HRM_PERMISSIONS: { id: number; name: string; label: string }[] = [
  { id: 200, name: "manage-hrm", label: "Manage HRM" },
  { id: 201, name: "manage-employees", label: "Manage Employees" },
  { id: 202, name: "create-employees", label: "Create Employees" },
  { id: 203, name: "edit-employees", label: "Edit Employees" },
  { id: 204, name: "delete-employees", label: "Delete Employees" },
  { id: 205, name: "manage-branches", label: "Manage Branches" },
  { id: 206, name: "create-branches", label: "Create Branches" },
  { id: 207, name: "edit-branches", label: "Edit Branches" },
  { id: 208, name: "delete-branches", label: "Delete Branches" },
  { id: 209, name: "manage-departments", label: "Manage Departments" },
  { id: 210, name: "create-departments", label: "Create Departments" },
  { id: 211, name: "edit-departments", label: "Edit Departments" },
  { id: 212, name: "delete-departments", label: "Delete Departments" },
  { id: 213, name: "manage-designations", label: "Manage Designations" },
  { id: 214, name: "create-designations", label: "Create Designations" },
  { id: 215, name: "edit-designations", label: "Edit Designations" },
  { id: 216, name: "delete-designations", label: "Delete Designations" },
  { id: 217, name: "manage-shifts", label: "Manage Shifts" },
  { id: 218, name: "create-shifts", label: "Create Shifts" },
  { id: 219, name: "edit-shifts", label: "Edit Shifts" },
  { id: 220, name: "delete-shifts", label: "Delete Shifts" },
  { id: 221, name: "manage-attendances", label: "Manage Attendances" },
  { id: 222, name: "create-attendances", label: "Create Attendances" },
  { id: 223, name: "edit-attendances", label: "Edit Attendances" },
  { id: 224, name: "delete-attendances", label: "Delete Attendances" },
  { id: 225, name: "manage-leave-types", label: "Manage Leave Types" },
  { id: 226, name: "create-leave-types", label: "Create Leave Types" },
  { id: 227, name: "edit-leave-types", label: "Edit Leave Types" },
  { id: 228, name: "delete-leave-types", label: "Delete Leave Types" },
  { id: 229, name: "manage-leave-applications", label: "Manage Leave Applications" },
  { id: 230, name: "create-leave-applications", label: "Create Leave Applications" },
  { id: 231, name: "edit-leave-applications", label: "Edit Leave Applications" },
  { id: 232, name: "delete-leave-applications", label: "Delete Leave Applications" },
  { id: 233, name: "manage-holidays", label: "Manage Holidays" },
  { id: 234, name: "create-holidays", label: "Create Holidays" },
  { id: 235, name: "edit-holidays", label: "Edit Holidays" },
  { id: 236, name: "delete-holidays", label: "Delete Holidays" },
  { id: 237, name: "manage-awards", label: "Manage Awards" },
  { id: 238, name: "create-awards", label: "Create Awards" },
  { id: 239, name: "edit-awards", label: "Edit Awards" },
  { id: 240, name: "delete-awards", label: "Delete Awards" },
  { id: 241, name: "manage-promotions", label: "Manage Promotions" },
  { id: 242, name: "create-promotions", label: "Create Promotions" },
  { id: 243, name: "edit-promotions", label: "Edit Promotions" },
  { id: 244, name: "delete-promotions", label: "Delete Promotions" },
  { id: 245, name: "manage-resignations", label: "Manage Resignations" },
  { id: 246, name: "create-resignations", label: "Create Resignations" },
  { id: 247, name: "edit-resignations", label: "Edit Resignations" },
  { id: 248, name: "delete-resignations", label: "Delete Resignations" },
  { id: 249, name: "manage-terminations", label: "Manage Terminations" },
  { id: 250, name: "create-terminations", label: "Create Terminations" },
  { id: 251, name: "edit-terminations", label: "Edit Terminations" },
  { id: 252, name: "delete-terminations", label: "Delete Terminations" },
  { id: 253, name: "manage-warnings", label: "Manage Warnings" },
  { id: 254, name: "create-warnings", label: "Create Warnings" },
  { id: 255, name: "edit-warnings", label: "Edit Warnings" },
  { id: 256, name: "delete-warnings", label: "Delete Warnings" },
  { id: 257, name: "manage-complaints", label: "Manage Complaints" },
  { id: 258, name: "create-complaints", label: "Create Complaints" },
  { id: 259, name: "edit-complaints", label: "Edit Complaints" },
  { id: 260, name: "delete-complaints", label: "Delete Complaints" },
  { id: 261, name: "manage-transfers", label: "Manage Transfers" },
  { id: 262, name: "create-transfers", label: "Create Transfers" },
  { id: 263, name: "edit-transfers", label: "Edit Transfers" },
  { id: 264, name: "delete-transfers", label: "Delete Transfers" },
  { id: 265, name: "manage-documents", label: "Manage Documents" },
  { id: 266, name: "create-documents", label: "Create Documents" },
  { id: 267, name: "edit-documents", label: "Edit Documents" },
  { id: 268, name: "delete-documents", label: "Delete Documents" },
  { id: 269, name: "manage-payroll", label: "Manage Payroll" },
  { id: 270, name: "create-payroll", label: "Create Payroll" },
  { id: 271, name: "edit-payroll", label: "Edit Payroll" },
  { id: 272, name: "delete-payroll", label: "Delete Payroll" },
  { id: 273, name: "edit-salary", label: "Edit Salary" },
  { id: 274, name: "delete-salary", label: "Delete Salary" },
];

async function ensureAddonSetup(
  prisma: any,
  addOn: string,
  module: string,
  permissions: { id: number; name: string; label: string }[]
) {
  const existing = await prisma.permission.findMany({
    where: { addOn },
    select: { id: true, name: true },
  });
  const existingByName = new Set(existing.map((p: any) => p.name));

  for (const perm of permissions) {
    if (!existingByName.has(perm.name)) {
      await prisma.permission.upsert({
        where: { name_guardName: { name: perm.name, guardName: "web" } },
        update: {},
        create: {
          id: BigInt(perm.id),
          name: perm.name,
          label: perm.label,
          module,
          addOn,
          guardName: "web",
          createdAt: new Date(),
        },
      }).catch(() => null);
      console.log(`[instrumentation] ensured permission: ${perm.name}`);
    }
  }

  const allPerms = await prisma.permission.findMany({
    where: { addOn },
    select: { id: true, name: true },
  });

  if (allPerms.length === 0) {
    console.warn(`[instrumentation] No ${addOn} permissions found after seed — skipping role assignment.`);
    return;
  }

  const targetRoles = await prisma.role.findMany({
    where: { name: { in: ["company", "staff"] } },
    select: { id: true, name: true },
  });

  /** createMany + skipDuplicates avoids P2002 when multiple workers run startup or rows already exist. */
  const rolePermRows: { roleId: bigint; permissionId: bigint }[] = [];
  for (const role of targetRoles) {
    for (const perm of allPerms) {
      rolePermRows.push({ roleId: role.id, permissionId: perm.id });
    }
  }
  if (rolePermRows.length > 0) {
    await prisma.roleHasPermission
      .createMany({ data: rolePermRows, skipDuplicates: true })
      .catch(() => null);
  }

  if (targetRoles.length > 0) {
    console.log(`[instrumentation] ${addOn} permissions assigned to roles: ${targetRoles.map((r: any) => r.name).join(", ")}`);
  }

  const addon = await prisma.addOn.findFirst({
    where: { module },
    select: { id: true, isEnable: true },
  });
  if (addon && !addon.isEnable) {
    await prisma.addOn.update({
      where: { id: addon.id },
      data: { isEnable: true },
    }).catch(() => null);
    console.log(`[instrumentation] Enabled ${addOn} in add_ons`);
  }
}

const APPOINTMENT_PERMISSIONS: { id: number; name: string; label: string }[] = [
  { id: 300, name: "manage-appointment-dashboard", label: "Manage Appointment Dashboard" },
  { id: 301, name: "manage-appointment", label: "Manage Appointment" },
  { id: 302, name: "manage-appointments", label: "Manage Appointments" },
  { id: 303, name: "create-appointments", label: "Create Appointments" },
  { id: 304, name: "edit-appointments", label: "Edit Appointments" },
  { id: 305, name: "delete-appointments", label: "Delete Appointments" },
  { id: 306, name: "view-appointments", label: "View Appointments" },
  { id: 307, name: "manage-appointment-hours", label: "Manage Appointment Hours" },
  { id: 308, name: "create-appointment-hours", label: "Create Appointment Hours" },
  { id: 309, name: "manage-questions", label: "Manage Questions" },
  { id: 310, name: "create-questions", label: "Create Questions" },
  { id: 311, name: "edit-questions", label: "Edit Questions" },
  { id: 312, name: "delete-questions", label: "Delete Questions" },
  { id: 313, name: "manage-schedules", label: "Manage Schedules" },
  { id: 314, name: "view-schedules", label: "View Schedules" },
  { id: 315, name: "delete-schedules", label: "Delete Schedules" },
  { id: 316, name: "schedule-actions", label: "Schedule Actions" },
  { id: 317, name: "manage-appointment-callbacks", label: "Manage Appointment Callbacks" },
  { id: 318, name: "view-appointment-callbacks", label: "View Appointment Callbacks" },
  { id: 319, name: "delete-appointment-callbacks", label: "Delete Appointment Callbacks" },
  { id: 320, name: "manage-appointment-settings", label: "Manage Appointment Settings" },
];

async function ensureTasklySetup(prisma: any) {
  await ensureAddonSetup(prisma, "Taskly", "Taskly", TASKLY_PERMISSIONS);
}

async function ensureHrmSetup(prisma: any) {
  await ensureAddonSetup(prisma, "Hrm", "Hrm", HRM_PERMISSIONS);
}

async function ensureAppointmentSetup(prisma: any) {
  await ensureAddonSetup(prisma, "Appointment", "Appointment", APPOINTMENT_PERMISSIONS);
}

const RECRUITMENT_PERMISSIONS: { id: number; name: string; label: string }[] = [
  { id: 400, name: "manage-recruitment", label: "Manage Recruitment" },
  { id: 401, name: "manage-recruitment-dashboard", label: "Manage Recruitment Dashboard" },
  { id: 402, name: "manage-recruitment-system-setup", label: "Manage System Setup" },
  { id: 403, name: "manage-job-locations", label: "Manage Job Locations" },
  { id: 404, name: "create-job-locations", label: "Create Job Locations" },
  { id: 405, name: "edit-job-locations", label: "Edit Job Locations" },
  { id: 406, name: "delete-job-locations", label: "Delete Job Locations" },
  { id: 407, name: "manage-custom-questions", label: "Manage Custom Questions" },
  { id: 408, name: "create-custom-questions", label: "Create Custom Questions" },
  { id: 409, name: "edit-custom-questions", label: "Edit Custom Questions" },
  { id: 410, name: "delete-custom-questions", label: "Delete Custom Questions" },
  { id: 411, name: "manage-job-postings", label: "Manage Job Postings" },
  { id: 412, name: "create-job-postings", label: "Create Job Postings" },
  { id: 413, name: "edit-job-postings", label: "Edit Job Postings" },
  { id: 414, name: "delete-job-postings", label: "Delete Job Postings" },
  { id: 415, name: "publish-job-postings", label: "Publish Job Postings" },
  { id: 416, name: "view-job-postings", label: "View Job Postings" },
  { id: 417, name: "manage-candidates", label: "Manage Candidates" },
  { id: 418, name: "create-candidates", label: "Create Candidates" },
  { id: 419, name: "edit-candidates", label: "Edit Candidates" },
  { id: 420, name: "delete-candidates", label: "Delete Candidates" },
  { id: 421, name: "view-candidates", label: "View Candidates" },
  { id: 422, name: "manage-interview-rounds", label: "Manage Interview Rounds" },
  { id: 423, name: "create-interview-rounds", label: "Create Interview Rounds" },
  { id: 424, name: "edit-interview-rounds", label: "Edit Interview Rounds" },
  { id: 425, name: "delete-interview-rounds", label: "Delete Interview Rounds" },
  { id: 426, name: "manage-interviews", label: "Manage Interviews" },
  { id: 427, name: "create-interviews", label: "Create Interviews" },
  { id: 428, name: "edit-interviews", label: "Edit Interviews" },
  { id: 429, name: "delete-interviews", label: "Delete Interviews" },
  { id: 430, name: "view-interviews", label: "View Interviews" },
  { id: 431, name: "manage-interview-feedbacks", label: "Manage Interview Feedbacks" },
  { id: 432, name: "manage-candidate-assessments", label: "Manage Candidate Assessments" },
  { id: 433, name: "manage-offers", label: "Manage Offers" },
  { id: 434, name: "manage-candidate-onboardings", label: "Manage Candidate Onboardings" },
  { id: 435, name: "create-job-types", label: "Create Job Types" },
  { id: 436, name: "edit-job-types", label: "Edit Job Types" },
  { id: 437, name: "delete-job-types", label: "Delete Job Types" },
  { id: 438, name: "create-candidate-sources", label: "Create Candidate Sources" },
  { id: 439, name: "edit-candidate-sources", label: "Edit Candidate Sources" },
  { id: 440, name: "delete-candidate-sources", label: "Delete Candidate Sources" },
  { id: 441, name: "create-interview-types", label: "Create Interview Types" },
  { id: 442, name: "edit-interview-types", label: "Edit Interview Types" },
  { id: 443, name: "delete-interview-types", label: "Delete Interview Types" },
];

async function ensureRecruitmentSetup(prisma: any) {
  await ensureAddonSetup(prisma, "Recruitment", "Recruitment", RECRUITMENT_PERMISSIONS);
}

const FORMBUILDER_PERMISSIONS: { id: number; name: string; label: string }[] = [
  { id: 600, name: "manage-formbuilder", label: "Manage Form Builder" },
  { id: 601, name: "create-formbuilder", label: "Create Form" },
  { id: 602, name: "edit-formbuilder-form", label: "Edit Form" },
  { id: 603, name: "delete-formbuilder-form", label: "Delete Form" },
  { id: 604, name: "view-formbuilder-form", label: "View Forms" },
  { id: 605, name: "view-formbuilder-form-responses", label: "View Form Responses" },
];

async function ensureFormBuilderSetup(prisma: any) {
  // Ensure the add_ons row exists before assigning permissions
  await prisma.addOn.upsert({
    where: { module: "FormBuilder" },
    update: {},
    create: {
      module: "FormBuilder",
      name: "Form Builder",
      monthlyPrice: 0,
      yearlyPrice: 0,
      isEnable: true,
      forAdmin: false,
      packageName: "formbuilder",
      priority: 0,
    },
  }).catch(() => null);

  await ensureAddonSetup(prisma, "FormBuilder", "FormBuilder", FORMBUILDER_PERMISSIONS);
}

async function ensureProjectSectionFormsSchema(prisma: any) {
  const statements = [
    `ALTER TABLE forms ADD COLUMN IF NOT EXISTS project_section_id VARCHAR(64) NULL;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS forms_company_project_section_uidx
       ON forms (created_by, project_section_id)
       WHERE project_section_id IS NOT NULL;`,
  ];
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql).catch(() => null);
  }
}

async function ensureGanttLocationSchema(prisma: any) {
  const statements = [
    `ALTER TABLE gantt_project_locations ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(512) NULL;`,
    `ALTER TABLE gantt_project_locations ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(512) NULL;`,
    `ALTER TABLE gantt_project_locations ADD COLUMN IF NOT EXISTS city VARCHAR(128) NULL;`,
    `ALTER TABLE gantt_project_locations ADD COLUMN IF NOT EXISTS state VARCHAR(64) NULL;`,
    `ALTER TABLE gantt_project_locations ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20) NULL;`,
    `ALTER TABLE gantt_project_locations ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7) NULL;`,
    `ALTER TABLE gantt_project_locations ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7) NULL;`,
    `ALTER TABLE gantt_project_locations ADD COLUMN IF NOT EXISTS show_location_map BOOLEAN NOT NULL DEFAULT false;`,
  ];
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql).catch(() => null);
  }
}

const RESUMEBUILDER_PERMISSIONS: { id: number; name: string; label: string }[] = [
  { id: 610, name: "manage-resume-builder", label: "Manage Resume Builder" },
  { id: 611, name: "view-resumes", label: "View Resumes" },
  { id: 612, name: "create-resume", label: "Create Resume" },
  { id: 613, name: "edit-resume", label: "Edit Resume" },
  { id: 614, name: "delete-resume", label: "Delete Resume" },
  { id: 615, name: "manage-resume-builder-settings", label: "Manage Resume Builder Settings" },
];

async function ensureResumeBuilderSetup(prisma: any) {
  await prisma.addOn.upsert({
    where: { module: "ResumeBuilder" },
    update: {},
    create: {
      module: "ResumeBuilder",
      name: "Resume Builder",
      monthlyPrice: 0,
      yearlyPrice: 0,
      isEnable: true,
      forAdmin: false,
      packageName: "resumebuilder",
      priority: 0,
    },
  }).catch(() => null);

  // Seed default resume templates
  const templates = [
    { name: "Creative Bold", slug: "creative-bold", description: "A bold, creative layout with vibrant accents." },
    { name: "Executive Professional", slug: "executive-professional", description: "Clean and authoritative design for senior roles." },
    { name: "Compact Professional", slug: "compact-professional", description: "Information-dense layout for experienced professionals." },
    { name: "Modern Grid", slug: "modern-grid", description: "Grid-based design with modern typography." },
    { name: "Minimalist Clean", slug: "minimalist-clean", description: "Minimal whitespace-focused design." },
    { name: "Classic Elegant", slug: "classic-elegant", description: "Traditional professional resume layout." },
  ];
  for (const tpl of templates) {
    await prisma.resumeTemplate.upsert({
      where: { slug: tpl.slug },
      update: {},
      create: { ...tpl, isActive: true },
    }).catch(() => null);
  }

  await ensureAddonSetup(prisma, "ResumeBuilder", "ResumeBuilder", RESUMEBUILDER_PERMISSIONS);
}

const SUPPORT_TICKET_PERMISSIONS: { id: number; name: string; label: string }[] = [
  { id: 700, name: "manage-support-ticket", label: "Manage Support Ticket" },
  { id: 701, name: "manage-support-ticket-dashboard", label: "Support Ticket Dashboard" },
  { id: 702, name: "manage-tickets", label: "Manage Tickets" },
  { id: 703, name: "create-tickets", label: "Create Tickets" },
  { id: 704, name: "edit-tickets", label: "Edit Tickets" },
  { id: 705, name: "delete-tickets", label: "Delete Tickets" },
  { id: 706, name: "view-tickets", label: "View Tickets" },
  { id: 707, name: "manage-knowledge-base", label: "Manage Knowledge Base" },
  { id: 708, name: "create-knowledge-base", label: "Create Knowledge Base" },
  { id: 709, name: "edit-knowledge-base", label: "Edit Knowledge Base" },
  { id: 710, name: "delete-knowledge-base", label: "Delete Knowledge Base" },
  { id: 711, name: "manage-support-faq", label: "Manage FAQ" },
  { id: 712, name: "create-support-faq", label: "Create FAQ" },
  { id: 713, name: "edit-support-faq", label: "Edit FAQ" },
  { id: 714, name: "delete-support-faq", label: "Delete FAQ" },
  { id: 715, name: "manage-support-contact", label: "Manage Contact" },
  { id: 716, name: "delete-support-contact", label: "Delete Contact" },
  { id: 717, name: "view-support-contact", label: "View Contact" },
  { id: 718, name: "manage-support-ticket-settings", label: "Manage Support Ticket Settings" },
];

async function ensureSupportTicketSetup(prisma: any) {
  await prisma.addOn.upsert({
    where: { module: "SupportTicket" },
    update: {},
    create: {
      module: "SupportTicket",
      name: "Support Ticket",
      monthlyPrice: 0,
      yearlyPrice: 0,
      isEnable: true,
      forAdmin: false,
      packageName: "supportticket",
      priority: 0,
    },
  }).catch(() => null);

  // Seed default ticket categories
  const defaultCategories = [
    { name: "General Inquiry", color: "#6366F1" },
    { name: "Technical Support", color: "#3B82F6" },
    { name: "Billing & Payment", color: "#10B981" },
    { name: "Feature Request", color: "#F59E0B" },
    { name: "Bug Report", color: "#EF4444" },
    { name: "Account Management", color: "#0686D4" },
    { name: "Integration Support", color: "#84CC16" },
    { name: "Performance Issues", color: "#F97316" },
    { name: "Security Concerns", color: "#DC2626" },
    { name: "Training & Education", label: "#7C3AED" },
  ];
  for (const cat of defaultCategories) {
    const exists = await prisma.stTicketCategory.findFirst({ where: { name: cat.name } });
    if (!exists) {
      await prisma.stTicketCategory.create({ data: { name: cat.name, color: cat.color ?? "#6366F1" } }).catch(() => null);
    }
  }

  // Seed default KB categories
  const defaultKbCategories = [
    "Getting Started Guide",
    "Billing & Subscription Management",
    "Feature Documentation",
    "Troubleshooting & Bug Fixes",
    "Account Setup & Configuration",
    "Third-Party Integrations",
    "Performance Optimization",
    "Security Best Practices",
    "User Training Resources",
    "FAQ & Common Questions",
  ];
  for (const name of defaultKbCategories) {
    const exists = await prisma.stKnowledgeBaseCategory.findFirst({ where: { name } });
    if (!exists) {
      await prisma.stKnowledgeBaseCategory.create({ data: { name } }).catch(() => null);
    }
  }

  await ensureAddonSetup(prisma, "SupportTicket", "SupportTicket", SUPPORT_TICKET_PERMISSIONS);
}

const ASSETS_PERMISSIONS: { id: number; name: string; label: string }[] = [
  { id: 720, name: "manage-assets", label: "Manage Assets" },
  { id: 721, name: "manage-asset-dashboard", label: "Assets Dashboard" },
  { id: 722, name: "create-asset", label: "Create Asset" },
  { id: 723, name: "edit-asset", label: "Edit Asset" },
  { id: 724, name: "delete-asset", label: "Delete Asset" },
  { id: 725, name: "view-asset", label: "View Asset" },
  { id: 726, name: "manage-asset-assignments", label: "Manage Assignments" },
  { id: 727, name: "create-asset-assignment", label: "Create Assignment" },
  { id: 728, name: "edit-asset-assignment", label: "Edit Assignment" },
  { id: 729, name: "delete-asset-assignment", label: "Delete Assignment" },
  { id: 730, name: "view-asset-assignment", label: "View Assignment" },
  { id: 731, name: "manage-asset-locations", label: "Manage Locations" },
  { id: 732, name: "create-asset-location", label: "Create Location" },
  { id: 733, name: "edit-asset-location", label: "Edit Location" },
  { id: 734, name: "delete-asset-location", label: "Delete Location" },
  { id: 735, name: "view-asset-location", label: "View Location" },
  { id: 736, name: "manage-asset-maintenance", label: "Manage Maintenance" },
  { id: 737, name: "create-asset-maintenance", label: "Create Maintenance" },
  { id: 738, name: "edit-asset-maintenance", label: "Edit Maintenance" },
  { id: 739, name: "delete-asset-maintenance", label: "Delete Maintenance" },
  { id: 740, name: "manage-asset-depreciation", label: "Manage Depreciation" },
  { id: 741, name: "create-asset-depreciation", label: "Create Depreciation" },
  { id: 742, name: "edit-asset-depreciation", label: "Edit Depreciation" },
  { id: 743, name: "delete-asset-depreciation", label: "Delete Depreciation" },
  { id: 744, name: "manage-asset-categories", label: "Manage Asset Categories" },
  { id: 745, name: "create-asset-category", label: "Create Asset Category" },
  { id: 746, name: "edit-asset-category", label: "Edit Asset Category" },
  { id: 747, name: "delete-asset-category", label: "Delete Asset Category" },
  { id: 748, name: "manage-asset-borrow-rent", label: "Manage Borrow & Rent" },
  { id: 749, name: "create-asset-borrow-rent", label: "Create Borrow & Rent" },
  { id: 750, name: "edit-asset-borrow-rent", label: "Edit Borrow & Rent" },
  { id: 751, name: "delete-asset-borrow-rent", label: "Delete Borrow & Rent" },
  { id: 752, name: "manage-borrow-payments", label: "Manage Borrow Payments" },
  { id: 753, name: "create-borrow-payment", label: "Create Borrow Payment" },
  { id: 754, name: "edit-borrow-payment", label: "Edit Borrow Payment" },
  { id: 755, name: "manage-borrow-report", label: "Borrow & Rent Report" },
];

async function ensureAssetsSetup(prisma: any) {
  await prisma.addOn.upsert({
    where: { module: "Assets" },
    update: {},
    create: {
      module: "Assets",
      name: "Assets",
      monthlyPrice: 0,
      yearlyPrice: 0,
      isEnable: true,
      forAdmin: false,
      packageName: "assets",
      priority: 0,
    },
  }).catch(() => null);

  // Seed default asset categories
  const defaultCategories = [
    "Computer Equipment", "Office Furniture", "Vehicles", "Machinery",
    "Electronics", "Software Licenses", "Network Equipment", "Mobile Devices",
    "Tools & Equipment", "Building Infrastructure",
  ];
  for (const name of defaultCategories) {
    const exists = await prisma.assetCategory.findFirst({ where: { name } });
    if (!exists) {
      await prisma.assetCategory.create({ data: { name } }).catch(() => null);
    }
  }

  await ensureAddonSetup(prisma, "Assets", "Assets", ASSETS_PERMISSIONS);
}

const WHATSAPP_PERMISSIONS: { id: number; name: string; label: string }[] = [
  { id: 760, name: "manage-whatsapp-chat", label: "Manage WhatsApp Chat" },
  { id: 761, name: "manage-whatsapp-contacts", label: "Manage WhatsApp Contacts" },
  { id: 762, name: "create-whatsapp-contact", label: "Create WhatsApp Contact" },
  { id: 763, name: "delete-whatsapp-contact", label: "Delete WhatsApp Contact" },
  { id: 764, name: "send-whatsapp-message", label: "Send WhatsApp Message" },
  { id: 765, name: "manage-whatsapp-settings", label: "Manage WhatsApp Settings" },
  { id: 766, name: "manage-whatsapp-events", label: "Manage WhatsApp Event Notifications" },
];

const DEFAULT_WA_EVENTS = [
  { event: "new_invoice", label: "New Invoice Created" },
  { event: "invoice_paid", label: "Invoice Paid" },
  { event: "new_ticket", label: "New Support Ticket" },
  { event: "ticket_replied", label: "Support Ticket Replied" },
  { event: "new_lead", label: "New CRM Lead" },
  { event: "appointment_booked", label: "Appointment Booked" },
  { event: "appointment_reminder", label: "Appointment Reminder" },
  { event: "asset_assigned", label: "Asset Assigned" },
  { event: "asset_due_return", label: "Asset Due for Return" },
  { event: "leave_approved", label: "Leave Approved" },
  { event: "leave_rejected", label: "Leave Rejected" },
  { event: "payroll_processed", label: "Payroll Processed" },
];

async function ensureWhatsAppSetup(prisma: any) {
  await prisma.addOn.upsert({
    where: { module: "WhatsAppChat" },
    update: {},
    create: {
      module: "WhatsAppChat",
      name: "WhatsApp Chat",
      monthlyPrice: 0,
      yearlyPrice: 0,
      isEnable: true,
      forAdmin: false,
      packageName: "whatsappchat",
      priority: 0,
    },
  }).catch(() => null);

  for (const ev of DEFAULT_WA_EVENTS) {
    const exists = await prisma.waEventNotification.findFirst({ where: { event: ev.event } });
    if (!exists) {
      await prisma.waEventNotification.create({
        data: { event: ev.event, label: ev.label, isEnabled: true },
      }).catch(() => null);
    }
  }

  const defaultSettings = [
    { key: "provider", value: "twilio" },
    { key: "account_sid", value: "" },
    { key: "auth_token", value: "" },
    { key: "from_number", value: "" },
  ];
  for (const s of defaultSettings) {
    const exists = await prisma.waSetting.findFirst({ where: { key: s.key } });
    if (!exists) {
      await prisma.waSetting.create({ data: s }).catch(() => null);
    }
  }

  await ensureAddonSetup(prisma, "WhatsAppChat", "WhatsAppChat", WHATSAPP_PERMISSIONS);
}

const EXPENSE_MANAGEMENT_PERMISSIONS: { id: number; name: string; label: string }[] = [
  { id: 790, name: "manage-expense-management", label: "Manage Expense Management" },
  { id: 791, name: "manage-expense-management-dashboard", label: "Expense Management Dashboard" },
  { id: 792, name: "manage-expense-reports", label: "Manage Expense Reports" },
  { id: 793, name: "manage-expense-entries", label: "Manage Expense Entries" },
  { id: 794, name: "manage-expense-receipts", label: "Manage Expense Receipts" },
  { id: 795, name: "manage-expense-analytics", label: "Manage Expense Analytics" },
];

async function ensureExpenseManagementSetup(prisma: any) {
  await prisma.addOn
    .upsert({
      where: { module: "ExpenseManagement" },
      update: {},
      create: {
        module: "ExpenseManagement",
        name: "Expense Management",
        monthlyPrice: 0,
        yearlyPrice: 0,
        isEnable: true,
        forAdmin: false,
        packageName: "expensemanagement",
        priority: 0,
      },
    })
    .catch((e: unknown) => {
      console.error("[instrumentation] ExpenseManagement add_ons upsert failed:", e);
    });

  await ensureAddonSetup(prisma, "ExpenseManagement", "ExpenseManagement", EXPENSE_MANAGEMENT_PERMISSIONS);
}

const LMS_PERMISSIONS: { id: number; name: string; label: string }[] = [
  { id: 910, name: "manage-lms", label: "Manage LMS" },
  { id: 911, name: "manage-lms-dashboard", label: "LMS Dashboard" },
  { id: 912, name: "manage-lms-courses", label: "Manage LMS Courses" },
  { id: 913, name: "manage-lms-classes", label: "Manage LMS Classes" },
  { id: 914, name: "manage-lms-students", label: "Manage LMS Students" },
  { id: 915, name: "manage-lms-instructors", label: "Manage LMS Instructors" },
  { id: 916, name: "manage-lms-meetings", label: "Manage LMS Meetings" },
  { id: 917, name: "manage-lms-subscriptions", label: "Manage LMS Subscriptions" },
  { id: 918, name: "manage-lms-analytics", label: "Manage LMS Analytics" },
  { id: 919, name: "manage-lms-settings", label: "Manage LMS Settings" },
  { id: 920, name: "manage-lms-instructor-dashboard", label: "LMS Instructor Dashboard" },
  { id: 921, name: "manage-lms-instructor-profile", label: "Manage LMS Instructor Profile (self)" },
  { id: 922, name: "view-lms-instructor-assignments", label: "View LMS Instructor Course Assignments" },
  { id: 923, name: "manage-lms-instructor-courses", label: "Manage LMS Assigned Instructor Courses" },
  { id: 924, name: "manage-lms-student-dashboard", label: "LMS Student Dashboard" },
  { id: 925, name: "view-lms-student-dashboard", label: "View LMS Student Dashboard" },
];

const AFFILIATE_BUSINESS_PERMISSIONS: { id: number; name: string; label: string }[] = [
  { id: 930, name: "manage-affiliate-business", label: "Manage Affiliate Business" },
  { id: 931, name: "manage-affiliate-business-dashboard", label: "Affiliate Business Dashboard" },
  { id: 932, name: "manage-affiliate-partners", label: "Manage Affiliate Partners" },
  { id: 933, name: "manage-affiliate-programs", label: "Manage Affiliate Programs" },
  { id: 934, name: "manage-affiliate-commissions", label: "Manage Affiliate Commissions" },
  { id: 935, name: "manage-affiliate-payouts", label: "Manage Affiliate Payouts" },
  { id: 936, name: "manage-affiliate-analytics", label: "Manage Affiliate Analytics" },
  { id: 937, name: "manage-affiliate-settings", label: "Manage Affiliate Settings" },
  { id: 938, name: "manage-affiliate-links", label: "Manage Affiliate Links" },
];

async function ensureAffiliateBusinessSetup(prisma: any) {
  await prisma.addOn
    .upsert({
      where: { module: "AffiliateBusiness" },
      update: {},
      create: {
        module: "AffiliateBusiness",
        name: "Affiliate Business",
        monthlyPrice: 0,
        yearlyPrice: 0,
        isEnable: true,
        forAdmin: false,
        packageName: "affiliatebusiness",
        priority: 77,
      },
    })
    .catch((e: unknown) => {
      console.error("[instrumentation] AffiliateBusiness add_ons upsert failed:", e);
    });

  await ensureAddonSetup(prisma, "AffiliateBusiness", "AffiliateBusiness", AFFILIATE_BUSINESS_PERMISSIONS);
}

const COMPLIANCE_PERMISSIONS: { id: number; name: string; label: string }[] = [
  { id: 971, name: "manage-compliance", label: "Manage Compliance" },
  { id: 972, name: "manage-compliance-dashboard", label: "Compliance Dashboard" },
  { id: 973, name: "manage-compliance-frameworks", label: "Manage Compliance Frameworks" },
  { id: 974, name: "manage-compliance-controls", label: "Manage Compliance Controls" },
  { id: 975, name: "manage-compliance-evidence", label: "Manage Compliance Evidence" },
  { id: 976, name: "manage-compliance-policies", label: "Manage Compliance Policies" },
  { id: 977, name: "manage-compliance-documents", label: "Manage Compliance Documents" },
  { id: 978, name: "manage-compliance-monitors", label: "Manage Compliance Monitors" },
  { id: 979, name: "manage-compliance-risks", label: "Manage Compliance Risks" },
  { id: 980, name: "manage-compliance-vendors", label: "Manage Compliance Vendor Reviews" },
  { id: 981, name: "manage-compliance-access-reviews", label: "Manage Compliance Access Reviews" },
  { id: 982, name: "manage-compliance-vulnerabilities", label: "Manage Compliance Vulnerabilities" },
  { id: 983, name: "manage-compliance-audits", label: "Manage Compliance Audits" },
  { id: 984, name: "manage-compliance-trust-center", label: "Manage Compliance Trust Center" },
  { id: 985, name: "manage-compliance-integrations", label: "Manage Compliance Integrations" },
  { id: 986, name: "manage-compliance-settings", label: "Manage Compliance Settings" },
  { id: 987, name: "manage-compliance-launchpad", label: "Manage Compliance Launchpad" },
  { id: 988, name: "manage-compliance-reports", label: "Manage Compliance Reports" },
  { id: 989, name: "manage-compliance-tasks", label: "Manage Compliance Tasks" },
];

async function ensureComplianceSetup(prisma: any) {
  await prisma.addOn
    .upsert({
      where: { module: "Compliance" },
      update: { isEnable: true },
      create: {
        module: "Compliance",
        name: "Compliance",
        monthlyPrice: 0,
        yearlyPrice: 0,
        isEnable: true,
        forAdmin: false,
        packageName: "compliance",
        priority: 78,
      },
    })
    .catch((e: unknown) => {
      console.error("[instrumentation] Compliance add_ons upsert failed:", e);
    });

  await ensureAddonSetup(prisma, "Compliance", "Compliance", COMPLIANCE_PERMISSIONS);
}

const ROUTING_PERMISSIONS: { id: number; name: string; label: string }[] = [
  { id: 995, name: "manage-routing", label: "Manage Routing" },
  { id: 996, name: "manage-routing-dashboard", label: "Routing Dashboard" },
  { id: 997, name: "manage-routing-routes", label: "Manage Employee Routes" },
  { id: 998, name: "manage-routing-fieldmap", label: "Manage FieldMap" },
  { id: 999, name: "manage-routing-my-routes", label: "My Routes" },
];

async function ensureRoutingSetup(prisma: any) {
  await prisma.addOn
    .upsert({
      where: { module: "Routing" },
      update: { isEnable: true },
      create: {
        module: "Routing",
        name: "Routing",
        monthlyPrice: 0,
        yearlyPrice: 0,
        isEnable: true,
        forAdmin: false,
        packageName: "routing",
        priority: 52,
      },
    })
    .catch((e: unknown) => {
      console.error("[instrumentation] Routing add_ons upsert failed:", e);
    });

  await ensureAddonSetup(prisma, "Routing", "Routing", ROUTING_PERMISSIONS);
}

async function ensureLmsSetup(prisma: any) {
  await prisma.addOn
    .upsert({
      where: { module: "Lms" },
      update: {},
      create: {
        module: "Lms",
        name: "LMS",
        monthlyPrice: 0,
        yearlyPrice: 0,
        isEnable: true,
        forAdmin: false,
        packageName: "lms",
        priority: 76,
      },
    })
    .catch((e: unknown) => {
      console.error("[instrumentation] Lms add_ons upsert failed:", e);
    });

  await ensureAddonSetup(prisma, "Lms", "Lms", LMS_PERMISSIONS);
}

const STOREFRONT_PERMISSIONS: { id: number; name: string; label: string }[] = [
  { id: 770, name: "manage-storefront", label: "Manage Storefront" },
  { id: 771, name: "manage-storefront-settings", label: "Manage Storefront Settings" },
  { id: 772, name: "storefront.view", label: "View Storefront" },
  { id: 773, name: "storefront.settings.manage", label: "Manage Storefront Settings" },
  { id: 774, name: "storefront.website.manage", label: "Manage Storefront Websites" },
  { id: 775, name: "storefront.theme.manage", label: "Manage Storefront Themes" },
  { id: 776, name: "storefront.page.manage", label: "Manage Storefront Pages" },
  { id: 777, name: "storefront.publish", label: "Publish Storefront" },
  { id: 778, name: "storefront.catalog.manage", label: "Manage Storefront Catalog" },
  { id: 779, name: "storefront.checkout.manage", label: "Manage Storefront Checkout" },
  { id: 780, name: "storefront.order.manage", label: "Manage Storefront Orders" },
  { id: 781, name: "storefront.discount.manage", label: "Manage Storefront Discounts" },
  { id: 782, name: "storefront.shipping.manage", label: "Manage Storefront Shipping" },
  { id: 783, name: "storefront.tax.manage", label: "Manage Storefront Taxes" },
  { id: 784, name: "storefront.customer.manage", label: "Manage Storefront Customers" },
  { id: 785, name: "storefront.analytics.view", label: "View Storefront Analytics" },
  { id: 786, name: "manage-storefront-dashboard", label: "Manage Altitude Dashboard" },
];

/** Full access (OWNER / ADMIN / default company). */
const STOREFRONT_FULL_ROLE_PERMISSION_NAMES = STOREFRONT_PERMISSIONS.map((p) => p.name);

/** MANAGER: all granular permissions except tenant-level settings (no legacy full-access names). */
const STOREFRONT_MANAGER_PERMISSION_NAMES = STOREFRONT_FULL_ROLE_PERMISSION_NAMES.filter(
  (n) =>
    n !== "storefront.settings.manage" &&
    n !== "manage-storefront-settings" &&
    n !== "manage-storefront",
);

/** STAFF: operational day-to-day. */
const STOREFRONT_STAFF_PERMISSION_NAMES = [
  "storefront.view",
  "manage-storefront-dashboard",
  "storefront.analytics.view",
  "storefront.order.manage",
  "storefront.catalog.manage",
  "storefront.customer.manage",
];

async function syncStorefrontPermissionsToRoles(prisma: any) {
  const allRows = await prisma.permission.findMany({
    where: { addOn: "Storefront" },
    select: { id: true, name: true },
  });
  if (allRows.length === 0) return;

  const ids = allRows.map((p: { id: bigint }) => p.id);
  const idByName = new Map<string, bigint>();
  for (const p of allRows as { id: bigint; name: string }[]) {
    idByName.set(p.name, p.id);
  }

  const tiers: Record<string, string[]> = {
    company: STOREFRONT_FULL_ROLE_PERMISSION_NAMES,
    owner: STOREFRONT_FULL_ROLE_PERMISSION_NAMES,
    admin: STOREFRONT_FULL_ROLE_PERMISSION_NAMES,
    manager: STOREFRONT_MANAGER_PERMISSION_NAMES,
    staff: STOREFRONT_STAFF_PERMISSION_NAMES,
  };

  for (const [roleName, wantedNames] of Object.entries(tiers)) {
    const role = await prisma.role.findFirst({
      where: { name: roleName, guardName: "web" },
      select: { id: true },
    });
    if (!role) continue;

    await prisma.roleHasPermission.deleteMany({
      where: { roleId: role.id, permissionId: { in: ids } },
    });

    const storefrontRows: { roleId: bigint; permissionId: bigint }[] = [];
    for (const name of wantedNames) {
      const permissionId = idByName.get(name);
      if (!permissionId) continue;
      storefrontRows.push({ roleId: role.id, permissionId });
    }
    if (storefrontRows.length > 0) {
      await prisma.roleHasPermission
        .createMany({ data: storefrontRows, skipDuplicates: true })
        .catch(() => null);
    }
    console.log(`[instrumentation] Storefront permissions synced for role "${roleName}"`);
  }
}

async function ensureStorefrontSetup(prisma: any) {
  await prisma.addOn
    .upsert({
      where: { module: "Storefront" },
      update: {},
      create: {
        module: "Storefront",
        name: "Storefronts",
        monthlyPrice: 0,
        yearlyPrice: 0,
        isEnable: true,
        forAdmin: false,
        packageName: "storefront",
        priority: 0,
      },
    })
    .catch(() => null);

  const existing = await prisma.permission.findMany({
    where: { addOn: "Storefront" },
    select: { name: true },
  });
  const existingByName = new Set(existing.map((p: { name: string }) => p.name));

  for (const perm of STOREFRONT_PERMISSIONS) {
    if (!existingByName.has(perm.name)) {
      await prisma.permission
        .upsert({
          where: { name_guardName: { name: perm.name, guardName: "web" } },
          update: {},
          create: {
            id: BigInt(perm.id),
            name: perm.name,
            label: perm.label,
            module: "Storefront",
            addOn: "Storefront",
            guardName: "web",
            createdAt: new Date(),
          },
        })
        .catch(() => null);
      console.log(`[instrumentation] ensured permission: ${perm.name}`);
    }
  }

  await syncStorefrontPermissionsToRoles(prisma);

  const addon = await prisma.addOn.findFirst({
    where: { module: "Storefront" },
    select: { id: true, isEnable: true },
  });
  if (addon && !addon.isEnable) {
    await prisma.addOn
      .update({
        where: { id: addon.id },
        data: { isEnable: true },
      })
      .catch(() => null);
    console.log("[instrumentation] Enabled Storefront in add_ons");
  }
}

/**
 * Prisma schema includes `ThemeTemplate.slug`, but older DBs may lack the column.
 * Same DDL as API routes (see `ensure-theme-template-db.ts`) so boot-time seeding works.
 */
async function ensureStorefrontThemeTemplateSlugColumn(prisma: any) {
  try {
    const { ensureStorefrontThemeTemplateColumns } = await import("@/lib/storefront/ensure-theme-template-db");
    await ensureStorefrontThemeTemplateColumns(prisma);
  } catch (e) {
    console.error("[instrumentation] ensureStorefrontThemeTemplateSlugColumn failed:", e);
  }
}

/** Day 15 — global starter theme template (tenant themes clone from this). */
async function ensureStorefrontStarterThemeTemplate(prisma: any) {
  try {
    const existing = await prisma.themeTemplate.findFirst({
      where: { organizationId: null, slug: "starter" },
    });
    if (existing) return;
    await prisma.themeTemplate.create({
      data: {
        organizationId: null,
        name: "Starter Storefront",
        slug: "starter",
        description:
          "Header, AnnouncementBar, HeroBanner, FeaturedProducts, FeaturedCollection, RichText, ImageWithText, NewsletterForm, Footer",
        status: "active",
        metadata: {
          sectionTypes: [
            "Header",
            "AnnouncementBar",
            "HeroBanner",
            "FeaturedProducts",
            "FeaturedCollection",
            "RichText",
            "ImageWithText",
            "NewsletterForm",
            "Footer",
          ],
        },
      },
    });
    console.log("[instrumentation] ensured ThemeTemplate starter");
  } catch (e) {
    console.error("[instrumentation] ensureStorefrontStarterThemeTemplate failed:", e);
  }
}

/** Marketplace preset: 7Band Shopify theme package (ZIP in /public for download). */
async function ensureSevenBandShopifyThemeTemplate(prisma: any) {
  try {
    const existing = await prisma.themeTemplate.findFirst({
      where: { organizationId: null, slug: "7band-musical-instruments" },
    });
    if (existing) return;
    await prisma.themeTemplate.create({
      data: {
        organizationId: null,
        name: "7Band — Musical instruments",
        slug: "7band-musical-instruments",
        description:
          "Shopify OS 2.0 theme (musical instruments / band shop). Install adds a tenant theme; Paper Flight storefront pages use sections/tokens — the ZIP is for developers and Shopify migration.",
        status: "active",
        previewUrl: "/storefront/theme-previews/7band.svg",
        metadata: {
          kind: "shopify_zip",
          packageFile: "/storefront/theme-packages/7band-musical-instruments-shopify-theme.zip",
          vendor: "BuraqStudioLab",
        },
      },
    });
    console.log("[instrumentation] ensured ThemeTemplate 7band-musical-instruments");
  } catch (e) {
    console.error("[instrumentation] ensureSevenBandShopifyThemeTemplate failed:", e);
  }
}

/** ThemeForest “Material” responsive Shopify theme — ZIP in /public; tokens extracted on tenant install. */
async function ensureRtMaterialShopifyThemeTemplate(prisma: any) {
  const sectionTypes = [
    "Header",
    "AnnouncementBar",
    "HeroBanner",
    "FeaturedProducts",
    "FeaturedCollection",
    "RichText",
    "ImageWithText",
    "NewsletterForm",
    "Footer",
  ];
  try {
    const existing = await prisma.themeTemplate.findFirst({
      where: { organizationId: null, slug: "rt-material-shopify" },
    });
    if (existing) return;
    await prisma.themeTemplate.create({
      data: {
        organizationId: null,
        name: "Material (Shopify) — RT v1.5.2",
        slug: "rt-material-shopify",
        description:
          "Responsive Material-design Shopify theme (ThemeForest). Install creates a storefront theme; publishing activates Liquid at /shop (layout + templates) from the ZIP under public/. Brand colors are read from config/settings_data.json.",
        status: "active",
        previewUrl: "/storefront/theme-previews/rt-material.svg",
        metadata: {
          kind: "shopify_zip",
          packageFile: "/storefront/theme-packages/rt-material-v1.5.2.zip",
          vendor: "ShopifyThemes / RT-Theme",
          sectionTypes,
        },
      },
    });
    console.log("[instrumentation] ensured ThemeTemplate rt-material-shopify");
  } catch (e) {
    console.error("[instrumentation] ensureRtMaterialShopifyThemeTemplate failed:", e);
  }
}

/** Marketplace row for Concept HTML theme (ZIP may be added under public/ later). */
async function ensureConceptHtmlThemeTemplate(prisma: any) {
  try {
    const { ensureConceptHtmlThemeTemplateSeeded } = await import("@/lib/storefront/services/theme-template-service");
    await ensureConceptHtmlThemeTemplateSeeded();
    console.log("[instrumentation] ensured ThemeTemplate concept-tech-html (if missing)");
  } catch (e) {
    console.error("[instrumentation] ensureConceptHtmlThemeTemplate failed:", e);
  }
}

/**
 * Ensures the manage-user permission exists and is assigned to company/staff roles.
 * Also patches any orphaned roles (createdBy pointing to non-existent users) to point
 * to the correct company user, so User Management shows roles correctly.
 */
/** Company admins can impersonate employee / customer / vendor portal logins. */
async function ensurePortalImpersonationPermission(prisma: any) {
  try {
    const maxId = await prisma.$queryRaw`SELECT MAX(id) as max FROM permissions`;
    const nextId = (maxId[0]?.max ?? BigInt(900)) + BigInt(1);
    await prisma.permission.upsert({
      where: { name_guardName: { name: "impersonate-portal-users", guardName: "web" } },
      update: { label: "Impersonate Portal Users", module: "general", addOn: "general" },
      create: {
        id: nextId > BigInt(901) ? nextId : BigInt(901),
        name: "impersonate-portal-users",
        label: "Impersonate Portal Users",
        module: "general",
        addOn: "general",
        guardName: "web",
        createdAt: new Date(),
      },
    }).catch(() => null);

    const perm = await prisma.permission.findFirst({
      where: { name: "impersonate-portal-users" },
      select: { id: true },
    });
    if (!perm) return;

    const companyRole = await prisma.role.findFirst({
      where: { name: "company", guardName: "web" },
      select: { id: true },
    });
    if (companyRole) {
      await prisma.roleHasPermission
        .createMany({
          data: [{ roleId: companyRole.id, permissionId: perm.id }],
          skipDuplicates: true,
        })
        .catch(() => null);
      console.log("[instrumentation] impersonate-portal-users assigned to company role");
    }
  } catch (err) {
    console.error("[instrumentation] ensurePortalImpersonationPermission failed:", err);
  }
}

async function ensureUserManagementPermissions(prisma: any) {
  try {
    // Upsert manage-user permission
    const maxId = await prisma.$queryRaw`SELECT MAX(id) as max FROM permissions`;
    const nextId = (maxId[0]?.max ?? BigInt(619)) + BigInt(1);
    await prisma.permission.upsert({
      where: { name_guardName: { name: "manage-user", guardName: "web" } },
      update: {},
      create: {
        id: nextId > BigInt(620) ? nextId : BigInt(620),
        name: "manage-user",
        label: "Manage User",
        module: "User",
        addOn: "general",
        guardName: "web",
        createdAt: new Date(),
      },
    }).catch(() => null);

    const perm = await prisma.permission.findFirst({ where: { name: "manage-user" } });
    if (!perm) return;

    // Assign to company and staff roles
    const targetRoles = await prisma.role.findMany({
      where: { name: { in: ["company", "staff"] } },
      select: { id: true, name: true },
    });
    const manageUserRows = targetRoles.map((role: { id: bigint }) => ({
      roleId: role.id,
      permissionId: perm.id,
    }));
    if (manageUserRows.length > 0) {
      await prisma.roleHasPermission
        .createMany({ data: manageUserRows, skipDuplicates: true })
        .catch(() => null);
    }
    if (targetRoles.length > 0) {
      console.log(`[instrumentation] manage-user permission assigned to roles: ${targetRoles.map((r: any) => r.name).join(", ")}`);
    }

    // Fix orphaned role createdBy: roles pointing to non-existent users should belong to the company user
    const companies = await prisma.user.findMany({
      where: { type: "company" },
      select: { id: true },
    });
    if (companies.length === 0) return;
    const companyId = companies[0].id;

    // Find roles with createdBy that doesn't match any existing user
    const allRoles = await prisma.$queryRaw`
      SELECT r.id, r.created_by FROM roles r
      WHERE r.created_by IS NOT NULL AND r.name NOT IN ('superadmin', 'company', 'client', 'staff', 'vendor', 'lms-student', 'lms-instructor', 'support-staff')
      AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = r.created_by)
    `;
    if (allRoles.length > 0) {
      const roleIds = allRoles.map((r: any) => r.id);
      await prisma.$executeRaw`UPDATE roles SET created_by = ${companyId} WHERE id = ANY(${roleIds}::bigint[])`;
      console.log(`[instrumentation] Fixed ${allRoles.length} orphaned roles -> createdBy=${companyId}`);
    }
  } catch (err) {
    console.error("[instrumentation] ensureUserManagementPermissions failed:", err);
  }
}
