/**
 * Client-safe add-on scope helpers (no Prisma).
 * Used by sidebar/menu filtering; keep separate from addons-server.ts so Prisma never ships to the browser.
 */

/**
 * Map from menu/dashboard scope to the add-on module name in add_ons table.
 * When an add-on is disabled, the corresponding menu and routes are hidden.
 * IMPORTANT: CRM add-on is stored as module="Lead" (lowercase: "lead") in the DB.
 */
export const ADDON_MODULE_BY_SCOPE: Record<string, string> = {
  project: "taskly",
  account: "account",
  accounting: "account",
  hrm: "hrm",
  crm: "lead", // DB stores CRM add-on as module="Lead"
  lead: "lead",
  pos: "pos",
  appointment: "appointment",
  recruitment: "recruitment",
  formbuilder: "formbuilder",
  resumebuilder: "resumebuilder",
  supportticket: "supportticket",
  "support-ticket": "supportticket",
  assets: "assets",
  whatsappchat: "whatsappchat",
  "whatsapp-chat": "whatsappchat",
  storefront: "storefront",
  lms: "lms",
  eventplatform: "eventplatform",
  "event-platform": "eventplatform",
  expensemanagement: "expensemanagement",
  affiliatebusiness: "affiliatebusiness",
  "affiliate-business": "affiliatebusiness",
  marketplace: "marketplace",
  compliance: "compliance",
  routing: "routing",
};

export function isAddOnEnabledForScope(activatedPackages: string[], scope: string): boolean {
  const module = ADDON_MODULE_BY_SCOPE[scope?.toLowerCase()];
  if (!module) return true; // no add-on gate for this scope
  return activatedPackages.map((p) => p.toLowerCase()).includes(module.toLowerCase());
}
