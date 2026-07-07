import "server-only";

import { prisma } from "@/lib/prisma";
import { loadTenantActorUser, readLmsOrgEnabled, resolveTenantOrganizationId } from "@/lib/lms-organization";
import { readEventPlatformOrgEnabled } from "@/lib/event-platform/event-platform-organization";
import { readMarketplaceOrgEnabled } from "@/lib/marketplace-organization";

/**
 * Returns the list of add-on module names that are currently enabled (is_enable = true).
 * Used for superadmin and as the global allow-list when computing per-user activated packages.
 */
export async function getEnabledAddOnModules(): Promise<string[]> {
  const rows = await prisma.addOn.findMany({
    where: { isEnable: true },
    select: { module: true },
  });
  return rows.map((r) => r.module.trim().toLowerCase()).filter(Boolean);
}

/**
 * Plan.modules uses keys like "accounting", "project". Map them to add_ons.module values.
 * NOTE: The CRM add-on is stored in the database as module="Lead" (lowercase: "lead"),
 * not "crm". All CRM scope lookups must resolve to "lead".
 */
const PLAN_MODULE_TO_ADDON: Record<string, string> = {
  accounting: "account",
  account: "account",
  project: "taskly",
  taskly: "taskly",
  hrm: "hrm",
  crm: "lead", // DB stores CRM add-on as module="Lead"
  lead: "lead",
  pos: "pos",
  appointment: "appointment",
  recruitment: "recruitment",
  paypal: "paypal",
  stripe: "stripe",
  recurringinvoice: "recurringinvoice",
  recurring_invoice: "recurringinvoice",
  recurring: "recurringinvoice",
  formbuilder: "formbuilder",
  form_builder: "formbuilder",
  resumebuilder: "resumebuilder",
  resume_builder: "resumebuilder",
  supportticket: "supportticket",
  support_ticket: "supportticket",
  assets: "assets",
  whatsappchat: "whatsappchat",
  whatsapp_chat: "whatsappchat",
  whatsapp: "whatsappchat",
  storefront: "storefront",
  storefronts: "storefront",
  store_front: "storefront",
  Storefront: "storefront",
  lms: "lms",
  eventplatform: "eventplatform",
  event_platform: "eventplatform",
  EventPlatform: "eventplatform",
  expensemanagement: "expensemanagement",
  expense_management: "expensemanagement",
  ExpenseManagement: "expensemanagement",
  affiliatebusiness: "affiliatebusiness",
  affiliate_business: "affiliatebusiness",
  AffiliateBusiness: "affiliatebusiness",
  Compliance: "compliance",
  compliance: "compliance",
  Routing: "routing",
  routing: "routing",
  marketplace: "marketplace",
  Marketplace: "marketplace",
};

/**
 * Returns the list of add-on module names this user should see (for sidebar and route gating).
 * - Superadmin: all globally enabled add-ons.
 * - Company users: intersection of (globally enabled add-ons) and (add-ons included in their plan).
 * So a company on Starter with accounting + project will see both if they are globally enabled.
 */
export async function getActivatedPackagesForUser(
  userId: bigint,
  isSuperadmin: boolean
): Promise<string[]> {
  const globalEnabled = await getEnabledAddOnModules();
  if (isSuperadmin) return globalEnabled;

  const withOrgGates = async (pkgs: string[]) => {
    const afterLms = await filterLmsByOrgSetting(userId, false, pkgs);
    const afterEventPlatform = await filterEventPlatformByOrgSetting(userId, false, afterLms);
    return filterMarketplaceByOrgSetting(userId, false, afterEventPlatform);
  };

  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { activePlan: true, type: true, createdBy: true },
    });
    const userType = (user?.type ?? "").toLowerCase().trim();
    const planOwnerId =
      (userType === "client" || userType === "staff") && user?.createdBy
        ? user.createdBy
        : userId;
    const planUser =
      planOwnerId === userId
        ? user
        : await prisma.user.findFirst({
            where: { id: planOwnerId },
            select: { activePlan: true },
          });
    const planId =
      planUser?.activePlan != null && Number.isSafeInteger(planUser.activePlan)
        ? planUser.activePlan
        : null;
    if (planId == null) return await withOrgGates(globalEnabled);

    const plan = await prisma.plan.findFirst({
      where: { id: BigInt(planId) },
      select: { modules: true },
    });
    const modules = plan?.modules;
    const arr = Array.isArray(modules) ? modules : [];
    const planAddonModules = new Set<string>();
    for (const m of arr) {
      const key = (typeof m === "string" ? m.trim() : "").toLowerCase();
      if (!key) continue;
      const addonModule = PLAN_MODULE_TO_ADDON[key] ?? key;
      planAddonModules.add(addonModule.toLowerCase());
    }
    if (planAddonModules.size === 0) return await withOrgGates(globalEnabled);
    return await withOrgGates(globalEnabled.filter((g) => planAddonModules.has(g.toLowerCase())));
  } catch {
    return await withOrgGates(globalEnabled);
  }
}

/**
 * LMS is globally and plan-gated like other add-ons, then optionally gated by per-company opt-out
 * (`saas_lms_enabled` on `settings` for the tenant organization). Missing/empty setting = enabled.
 */
async function filterLmsByOrgSetting(
  userId: bigint,
  isSuperadmin: boolean,
  packages: string[],
): Promise<string[]> {
  if (isSuperadmin) return packages;
  if (!packages.some((p) => p.toLowerCase() === "lms")) return packages;
  const user = await loadTenantActorUser(userId);
  const orgId = user ? resolveTenantOrganizationId(user) : null;
  if (!orgId) return packages.filter((p) => p.toLowerCase() !== "lms");
  const on = await readLmsOrgEnabled(orgId);
  if (on) return packages;
  return packages.filter((p) => p.toLowerCase() !== "lms");
}

/**
 * Event Platform is globally and plan-gated like other add-ons, then optionally gated by per-company
 * opt-out (`saas_event_platform_enabled` on `settings` for the tenant organization).
 * Missing/empty setting = enabled.
 */
async function filterEventPlatformByOrgSetting(
  userId: bigint,
  isSuperadmin: boolean,
  packages: string[],
): Promise<string[]> {
  if (isSuperadmin) return packages;
  if (!packages.some((p) => p.toLowerCase() === "eventplatform")) return packages;
  const user = await loadTenantActorUser(userId);
  const orgId = user ? resolveTenantOrganizationId(user) : null;
  if (!orgId) return packages.filter((p) => p.toLowerCase() !== "eventplatform");
  const on = await readEventPlatformOrgEnabled(orgId);
  if (on) return packages;
  return packages.filter((p) => p.toLowerCase() !== "eventplatform");
}

/**
 * Marketplace is globally and plan-gated like other add-ons, then optionally gated by per-company
 * opt-out (`saas_marketplace_enabled` on `settings` for the tenant organization).
 * Missing/empty setting = enabled.
 */
async function filterMarketplaceByOrgSetting(
  userId: bigint,
  isSuperadmin: boolean,
  packages: string[],
): Promise<string[]> {
  if (isSuperadmin) return packages;
  if (!packages.some((p) => p.toLowerCase() === "marketplace")) return packages;
  const user = await loadTenantActorUser(userId);
  const orgId = user ? resolveTenantOrganizationId(user) : null;
  if (!orgId) return packages.filter((p) => p.toLowerCase() !== "marketplace");
  const on = await readMarketplaceOrgEnabled(orgId);
  if (on) return packages;
  return packages.filter((p) => p.toLowerCase() !== "marketplace");
}
