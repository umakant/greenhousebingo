/**
 * Plan module key -> permissions.add_on (package name in DB).
 * When a plan includes a module, we grant ALL permissions for that add-on (full access).
 */
const PLAN_MODULE_TO_ADDON_NAME: Record<string, string> = {
  accounting: "Account",
  account: "Account",
  project: "Taskly",
  taskly: "Taskly",
  hrm: "Hrm",
  crm: "Lead",
  lead: "Lead",
  pos: "Pos",
  appointment: "Appointment",
  recruitment: "Recruitment",
  paypal: "Paypal",
  stripe: "Stripe",
  recurringinvoice: "RecurringInvoiceBill",
  recurring_invoice: "RecurringInvoiceBill",
  recurring: "RecurringInvoiceBill",
  storefront: "Storefront",
  storefronts: "Storefront",
  store_front: "Storefront",
  expensemanagement: "ExpenseManagement",
  expense_management: "ExpenseManagement",
  ExpenseManagement: "ExpenseManagement",
  lms: "Lms",
  affiliatebusiness: "AffiliateBusiness",
  affiliate_business: "AffiliateBusiness",
  AffiliateBusiness: "AffiliateBusiness",
  marketplace: "Marketplace",
  Marketplace: "Marketplace",
};

/**
 * Fallback: if DB has no permissions for an add-on, grant at least these (menu + basic access).
 */
const FALLBACK_PERMISSIONS: Record<string, string[]> = {
  accounting: [
    "manage-account",
    "manage-account-dashboard",
    "manage-customers",
    "manage-vendors",
    "manage-bank-accounts",
    "manage-bank-transactions",
    "manage-bank-transfers",
    "manage-chart-of-accounts",
    "manage-vendor-payments",
    "manage-customer-payments",
    "manage-revenues",
    "manage-expenses",
    "manage-debit-notes",
    "manage-credit-notes",
    "manage-account-reports",
    "manage-account-types",
    "manage-sales-invoices",
    "manage-sales-proposals",
    "create-customers",
    "edit-customers",
    "delete-customers",
    "create-vendors",
    "edit-vendors",
    "delete-vendors",
    "impersonate-portal-users",
  ],
  account: [
    "manage-account",
    "manage-account-dashboard",
    "manage-customers",
    "manage-vendors",
    "create-customers",
    "edit-customers",
    "delete-customers",
    "create-vendors",
    "edit-vendors",
    "delete-vendors",
    "impersonate-portal-users",
  ],
  project: [
    "manage-project-dashboard",
    "manage-project",
    "manage-project-report",
    "manage-task-stages",
    "view-project",
    "create-project",
    "edit-project",
    "delete-project",
    "manage-project-task",
    "create-project-task",
    "edit-project-task",
    "manage-project-bug",
    "create-project-bug",
    "edit-project-bug",
  ],
  taskly: [
    "manage-project-dashboard",
    "manage-project",
    "view-project",
    "create-project",
    "edit-project",
    "delete-project",
  ],
  hrm: [
    "manage-hrm",
    "impersonate-portal-users",
    "manage-employees",
    "manage-branches",
    "manage-departments",
    "manage-designations",
    "manage-shifts",
    "manage-attendances",
    "manage-leave-types",
    "manage-leave-applications",
    "manage-holidays",
    "manage-awards",
    "manage-promotions",
    "manage-resignations",
    "manage-terminations",
    "manage-warnings",
    "manage-complaints",
    "manage-transfers",
    "manage-documents",
    "manage-payroll",
    "create-branches", "edit-branches", "delete-branches",
    "create-departments", "edit-departments", "delete-departments",
    "create-designations", "edit-designations", "delete-designations",
    "create-employees", "edit-employees", "delete-employees",
    "create-shifts", "edit-shifts", "delete-shifts",
    "create-attendances", "edit-attendances", "delete-attendances",
    "create-leave-types", "edit-leave-types", "delete-leave-types",
    "create-leave-applications", "edit-leave-applications", "delete-leave-applications",
    "create-holidays", "edit-holidays", "delete-holidays",
    "create-awards", "edit-awards", "delete-awards",
    "create-promotions", "edit-promotions", "delete-promotions",
    "create-resignations", "edit-resignations", "delete-resignations",
    "create-terminations", "edit-terminations", "delete-terminations",
    "create-warnings", "edit-warnings", "delete-warnings",
    "create-complaints", "edit-complaints", "delete-complaints",
    "create-transfers", "edit-transfers", "delete-transfers",
    "create-documents", "edit-documents", "delete-documents",
    "create-payroll", "edit-payroll", "delete-payroll",
    "edit-salary", "delete-salary",
  ],
  crm: [
    "manage-crm",
    "manage-crm-dashboard",
    "manage-leads",
    "create-leads",
    "edit-leads",
    "delete-leads",
    "view-leads",
    "manage-deals",
    "create-deals",
    "edit-deals",
    "delete-deals",
    "view-deals",
    "manage-pipelines",
    "create-pipelines",
    "edit-pipelines",
    "delete-pipelines",
    "view-reports",
    "manage-lead-activities",
    "manage-deal-activities",
  ],
  lead: [
    "manage-crm",
    "manage-crm-dashboard",
    "manage-leads",
    "create-leads",
    "edit-leads",
    "delete-leads",
    "view-leads",
    "manage-deals",
    "create-deals",
    "edit-deals",
    "delete-deals",
    "view-deals",
    "manage-pipelines",
    "create-pipelines",
    "edit-pipelines",
    "delete-pipelines",
    "view-reports",
    "manage-lead-activities",
    "manage-deal-activities",
  ],
  pos: ["manage-pos", "manage-pos-dashboard"],
  appointment: [
    "manage-appointment-dashboard",
    "manage-appointment",
    "manage-appointments",
    "create-appointments",
    "edit-appointments",
    "delete-appointments",
    "view-appointments",
    "manage-appointment-hours",
    "create-appointment-hours",
    "manage-questions",
    "create-questions",
    "edit-questions",
    "delete-questions",
    "manage-schedules",
    "view-schedules",
    "delete-schedules",
    "schedule-actions",
    "manage-appointment-callbacks",
    "view-appointment-callbacks",
    "delete-appointment-callbacks",
    "manage-appointment-settings",
  ],
  recruitment: [
    "manage-recruitment",
    "manage-recruitment-dashboard",
    "manage-recruitment-system-setup",
    "manage-job-locations",
    "create-job-locations",
    "edit-job-locations",
    "delete-job-locations",
    "manage-custom-questions",
    "create-custom-questions",
    "edit-custom-questions",
    "delete-custom-questions",
    "manage-job-postings",
    "create-job-postings",
    "edit-job-postings",
    "delete-job-postings",
    "publish-job-postings",
    "view-job-postings",
    "manage-candidates",
    "create-candidates",
    "edit-candidates",
    "delete-candidates",
    "view-candidates",
    "manage-interview-rounds",
    "create-interview-rounds",
    "edit-interview-rounds",
    "delete-interview-rounds",
    "manage-interviews",
    "create-interviews",
    "edit-interviews",
    "delete-interviews",
    "view-interviews",
    "manage-interview-feedbacks",
    "manage-candidate-assessments",
    "manage-offers",
    "manage-candidate-onboardings",
    "create-job-types",
    "edit-job-types",
    "delete-job-types",
    "create-candidate-sources",
    "edit-candidate-sources",
    "delete-candidate-sources",
    "create-interview-types",
    "edit-interview-types",
    "delete-interview-types",
  ],
  storefront: [
    "manage-storefront",
    "manage-storefront-settings",
    "manage-storefront-dashboard",
    "storefront.view",
    "storefront.settings.manage",
    "storefront.website.manage",
    "storefront.theme.manage",
    "storefront.page.manage",
    "storefront.publish",
    "storefront.catalog.manage",
    "storefront.checkout.manage",
    "storefront.order.manage",
    "storefront.discount.manage",
    "storefront.shipping.manage",
    "storefront.tax.manage",
    "storefront.customer.manage",
    "storefront.analytics.view",
  ],
  storefronts: [
    "manage-storefront",
    "manage-storefront-settings",
    "manage-storefront-dashboard",
    "storefront.view",
    "storefront.settings.manage",
    "storefront.website.manage",
    "storefront.theme.manage",
    "storefront.page.manage",
    "storefront.publish",
    "storefront.catalog.manage",
    "storefront.checkout.manage",
    "storefront.order.manage",
    "storefront.discount.manage",
    "storefront.shipping.manage",
    "storefront.tax.manage",
    "storefront.customer.manage",
    "storefront.analytics.view",
  ],
  expensemanagement: [
    "manage-expense-management",
    "manage-expense-management-dashboard",
    "manage-expense-reports",
    "manage-expense-entries",
    "manage-expense-receipts",
    "manage-expense-analytics",
  ],
  lms: [
    "manage-lms",
    "impersonate-portal-users",
    "manage-lms-dashboard",
    "manage-lms-courses",
    "manage-lms-classes",
    "manage-lms-students",
    "manage-lms-instructors",
    "manage-lms-meetings",
    "manage-lms-events",
    "manage-lms-event-checkin",
    "manage-lms-event-income",
    "view-lms-events",
    "manage-lms-subscriptions",
    "manage-lms-analytics",
    "manage-lms-settings",
    "manage-lms-instructor-dashboard",
    "manage-lms-instructor-profile",
    "view-lms-instructor-assignments",
    "manage-lms-instructor-courses",
    "manage-event-platform",
    "events.view",
    "events.create",
    "events.update",
    "events.delete",
    "bookings.view",
    "bookings.manage",
    "vendors.view",
    "vendors.manage",
    "commissions.manage",
    "payouts.manage",
    "payments.manage",
    "cms.manage",
    "menus.manage",
    "settings.manage",
    "integrations.manage",
    "reports.view",
  ],
  affiliatebusiness: [
    "manage-affiliate-business",
    "manage-affiliate-business-dashboard",
    "manage-affiliate-partners",
    "manage-affiliate-programs",
    "manage-affiliate-commissions",
    "manage-affiliate-payouts",
    "manage-affiliate-analytics",
    "manage-affiliate-settings",
    "manage-affiliate-links",
  ],
  marketplace: ["marketplace.view", "marketplace.orders.view", "marketplace.orders.manage"],
};

export const PLAN_MODULE_PERMISSIONS: Record<string, string[]> = FALLBACK_PERMISSIONS;

/**
 * Fetches all permission names from the DB for the given add-on package names (e.g. "Account", "Taskly").
 * Used to grant full add-on access when a plan includes that module.
 */
export async function getPermissionsByAddOnNames(addOnNames: string[]): Promise<string[]> {
  if (addOnNames.length === 0) return [];
  const { prisma } = await import("@/lib/prisma");
  try {
    const rows = await prisma.permission.findMany({
      where: { addOn: { in: addOnNames } },
      select: { name: true },
    });
    return [...new Set(rows.map((r) => r.name))];
  } catch {
    return [];
  }
}

/** Staff/client portal users inherit the parent company's subscription plan. */
export async function resolvePlanOwnerUserId(userId: bigint): Promise<bigint> {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { type: true, createdBy: true },
  });
  const userType = (user?.type ?? "").toLowerCase().trim();
  if ((userType === "client" || userType === "staff") && user?.createdBy) {
    return user.createdBy;
  }
  return userId;
}

/**
 * Returns permissions granted by the user's active plan (from users.active_plan).
 * When a plan includes an add-on module, we grant ALL permissions for that add-on (full access).
 * Permissions are loaded from the DB by add_on; if that fails, we use the fallback list.
 */
export async function getPlanPermissionsForUser(userId: bigint): Promise<string[]> {
  const { prisma } = await import("@/lib/prisma");
  try {
    const planOwnerId = await resolvePlanOwnerUserId(userId);
    const rows = await prisma.$queryRawUnsafe<{ active_plan: number | null }[]>(
      "SELECT active_plan FROM users WHERE id = $1 LIMIT 1",
      planOwnerId
    ).catch(() => null);
    const activePlan = rows?.[0]?.active_plan;
    if (activePlan == null) return [];
    const plan = await prisma.plan.findFirst({
      where: { id: BigInt(activePlan) },
      select: { modules: true },
    });
    if (!plan?.modules) return [];
    return getPermissionsForPlanModulesAsync(plan.modules);
  } catch {
    return [];
  }
}

/**
 * Returns permissions to add for a list of plan module names (case-insensitive match).
 * Uses DB lookup by add_on for full add-on access; falls back to FALLBACK_PERMISSIONS if needed.
 */
export async function getPermissionsForPlanModulesAsync(modules: unknown): Promise<string[]> {
  if (!Array.isArray(modules)) return [];
  const keys = new Set<string>();
  for (const m of modules) {
    const key = typeof m === "string" ? m.trim().toLowerCase() : "";
    if (key) keys.add(key);
  }
  const addOnNames: string[] = [];
  for (const key of keys) {
    const addOn = PLAN_MODULE_TO_ADDON_NAME[key];
    if (addOn && !addOnNames.includes(addOn)) addOnNames.push(addOn);
  }
  const fromDb = await getPermissionsByAddOnNames(addOnNames);
  if (fromDb.length > 0) return fromDb;
  return getPermissionsForPlanModulesSync(modules);
}

/**
 * Sync fallback: returns permissions from FALLBACK_PERMISSIONS for the given plan modules.
 */
export function getPermissionsForPlanModulesSync(modules: unknown): string[] {
  return getPermissionsForPlanModules(modules);
}

/**
 * Returns permissions to add for a list of plan module names (case-insensitive match).
 * Uses only the fallback list; for full add-on access use getPermissionsForPlanModulesAsync.
 */
export function getPermissionsForPlanModules(modules: unknown): string[] {
  if (!Array.isArray(modules)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of modules) {
    const key = typeof m === "string" ? m.trim().toLowerCase() : "";
    if (!key || seen.has(key)) continue;
    const perms = PLAN_MODULE_PERMISSIONS[key];
    if (perms) {
      seen.add(key);
      for (const p of perms) if (!out.includes(p)) out.push(p);
    }
  }
  return out;
}
