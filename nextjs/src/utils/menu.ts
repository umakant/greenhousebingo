import type { NavItem } from "@/types";
import type { NavSearchEntry } from "@/utils/flatten-nav-for-search";
import { flattenNavForSearch, mergeSearchEntryLists } from "@/utils/flatten-nav-for-search";
import {
  EXTRA_GLOBAL_SEARCH_ROUTES,
  filterExtraSearchRoutes,
  getSettingsSearchEntries,
} from "@/lib/settings-sections";
import {
  isLmsEmployeeLearnerAudience,
  isLmsEmployeeLearnerMenuPermission,
} from "@/lib/lms-employee-learner-audience";
import { isAddOnEnabledForScope } from "@/lib/addon-scope";

/** Kept in sync with `EMPLOYEE_EXPENSE_PERMISSION_NAMES` in hrm-employee-role.ts (client-safe copy). */
const EMPLOYEE_EXPENSE_MENU_PERMISSIONS = [
  "manage-expense-management-dashboard",
  "manage-expense-reports",
  "manage-expense-entries",
  "manage-expense-receipts",
  "manage-expense-analytics",
] as const;

/** Kept in sync with `EMPLOYEE_ROUTING_PERMISSION_NAMES` in hrm-employee-role.ts (client-safe copy). */
const EMPLOYEE_ROUTING_MENU_PERMISSIONS = ["manage-routing-my-routes"] as const;

/** Kept in sync with `EMPLOYEE_LMS_PERMISSION_NAMES` in hrm-employee-role.ts (client-safe copy). */
const EMPLOYEE_LMS_MENU_PERMISSIONS = [
  "view-lms-student-dashboard",
  "manage-lms-student-dashboard",
] as const;

/** Self-service nav items — never implied by wildcard `*` or admin umbrella permissions. */
const EMPLOYEE_ONLY_MENU_PERMISSIONS = new Set<string>([
  ...EMPLOYEE_EXPENSE_MENU_PERMISSIONS,
  ...EMPLOYEE_ROUTING_MENU_PERMISSIONS,
  ...EMPLOYEE_LMS_MENU_PERMISSIONS,
]);

function isEmployeeOnlyMenuPermission(permission?: string): boolean {
  return Boolean(permission && EMPLOYEE_ONLY_MENU_PERMISSIONS.has(permission));
}
import {
  userCanViewStorefront,
  userHasFullStorefrontAccess,
  userHasStorefrontPermission,
  userMayAccessStorefrontSection,
} from "@/lib/storefront-permissions";
import { isPortalSession } from "@/lib/portal-session";
import { getCompanyMenu } from "@/utils/menus/company-menu";
import { getSuperAdminMenu } from "@/utils/menus/superadmin-menu";
import { getPartnerMenu } from "@/utils/menus/partner-menu";
import { getMarketplaceVendorMenu } from "@/utils/menus/marketplace-vendor-menu";

function isPartner(roles: string[], primaryRole?: string): boolean {
  const primary = (primaryRole ?? roles[0] ?? "").trim().toLowerCase();
  return primary === "partner" || roles.map((r) => r.trim().toLowerCase()).includes("partner");
}

function isMarketplaceVendor(roles: string[], primaryRole?: string): boolean {
  const primary = (primaryRole ?? roles[0] ?? "").trim().toLowerCase();
  return (
    primary === "marketplace_vendor" ||
    roles.map((r) => r.trim().toLowerCase()).includes("marketplace_vendor")
  );
}

const COMMON_MENU_NAMES = new Set(["dashboard"]);
const COMMON_MENU_ORDERS = new Set([2900, 2920, 2940, 2950, 2972, 3000]);

/**
 * Maps URL prefixes to their module scope.
 * Each module scope corresponds to a nav section's `dashboardScope` field.
 * When the user is on a scoped URL, only that scope's nav items are shown
 * (plus the always-visible Dashboard and common items).
 */
const SCOPE_ROUTE_PREFIXES: [string, string][] = [
  ["/user-management", "usermanagement"],
  // POS (keep `/sales` after accounting sales routes — they share the `/sales` prefix)
  ["/pos", "pos"],
  ["/branches", "pos"],
  ["/cash-registers", "pos"],
  ["/branch-sales-targets", "pos"],
  ["/pos-sessions", "pos"],
  ["/products", "account"],
  ["/services", "account"],
  ["/categories", "account"],
  ["/brands", "account"],
  ["/units", "account"],
  ["/taxes", "account"],
  // Accounting (before POS `/sales` — `/sales-invoices` and `/sales-proposals` also start with `/sales`)
  ["/account", "account"],
  ["/sales-proposals", "account"],
  ["/sales-proposal-templates", "account"],
  ["/sales-invoices", "account"],
  ["/sales", "pos"],
  ["/sale-returns", "pos"],
  ["/purchases", "pos"],
  ["/purchase-returns", "pos"],
  ["/quotations", "pos"],
  ["/expenses", "pos"],
  ["/expense-categories", "pos"],
  ["/customers", "pos"],
  ["/vendors", "pos"],
  ["/reports", "pos"],
  ["/barcode-print", "pos"],
  ["/referral", "pos"],
  ["/contacts", "pos"],
  ["/calendar", "pos"],
  ["/currencies", "pos"],
  ["/bank-transfer", "pos"],
  ["/orders", "pos"],
  // HRM core + HR-related add-ons (recruitment, appointment, helpdesk) share HRM sidebar scope
  ["/hrm", "hrm"],
  ["/recruitment", "hrm"],
  // CRM
  ["/crm", "crm"],
  ["/lead", "crm"],
  ["/projects/routes", "routing"],
  ["/projects/my-routes", "routing"],
  ["/projects/field-map", "routing"],
  // Project
  ["/project", "project"],
  ["/projects", "project"],
  ["/appointment", "hrm"],
  ["/helpdesk-tickets", "hrm"],
  ["/helpdesk-categories", "hrm"],
  // Form Builder
  ["/form-builder", "formbuilder"],
  // Resume Builder
  ["/resume-builder", "resumebuilder"],
  // Support Ticket addon
  ["/support-ticket", "supportticket"],
  // Assets addon
  ["/assets", "assets"],
  // WhatsApp Chat addon
  ["/whatsapp-chat", "whatsappchat"],
  ["/storefront", "storefront"],
  ["/expense-management", "expensemanagement"],
  ["/lms", "lms"],
  ["/admin/event-platform", "lms"],
  ["/affiliate-business", "affiliatebusiness"],
  ["/compliance", "compliance"],
];

function detectDashboardScope(url: string): string | null {
  let matchedScope: string | null = null;
  let matchedPrefixLen = -1;
  for (const [prefix, scope] of SCOPE_ROUTE_PREFIXES) {
    if (!url.startsWith(prefix)) continue;
    if (prefix.length > matchedPrefixLen) {
      matchedPrefixLen = prefix.length;
      matchedScope = scope;
    }
  }
  return matchedScope;
}

/** Resolve module scope for a URL (used by sidebar active-state + menu filtering). */
export function resolveDashboardScopeFromPath(url: string): string | null {
  const path = (url.split("?")[0] ?? "").replace(/\/+$/, "") || "/";
  return detectDashboardScope(path);
}

function filterByDashboardScope(
  items: NavItem[],
  scope: string | null,
  alsoScopes: string[] = [],
): NavItem[] {
  const extra = new Set(alsoScopes.map((s) => s.toLowerCase()));
  return items.filter((item) => {
    // Dashboard and named common items always visible
    if (item.name && COMMON_MENU_NAMES.has(item.name)) return true;
    // Utility items (Media Library, Notification Templates, Messenger, etc.) always visible
    if (item.order && COMMON_MENU_ORDERS.has(item.order)) return true;
    // Items with NO dashboardScope are "global" (User Management, Proposal, Form Builder, etc.)
    // and should always be visible regardless of the current module scope.
    if (!item.dashboardScope) return true;
    // Module-scoped items: on a scoped URL, or when pinned for portal users (e.g. staff + expense).
    if (!scope) {
      return extra.has((item.dashboardScope ?? "").toLowerCase());
    }
    if (item.dashboardScope === scope) return true;
    return extra.has((item.dashboardScope ?? "").toLowerCase());
  });
}

function portalPinnedScopes(
  roles: string[],
  permissions: string[],
  activatedPackages: string[],
  primaryRole?: string,
): string[] {
  const normalized = roles.map((r) => r.trim().toLowerCase());
  const primary = (primaryRole ?? roles[0] ?? "").trim().toLowerCase();
  const isLmsPortal = primary === "lms-student" || primary === "lms-instructor";
  const isSupportPortal = primary === "support-staff";
  const isExpensePortal =
    normalized.includes("staff") ||
    normalized.includes("client") ||
    normalized.includes("vendor") ||
    primary === "staff" ||
    primary === "client" ||
    primary === "vendor";
  if (isLmsPortal) {
    if (!isAddOnEnabledForScope(activatedPackages, "lms")) return [];
    return ["lms"];
  }
  if (isSupportPortal) {
    if (!isAddOnEnabledForScope(activatedPackages, "supportticket")) return [];
    return ["supportticket"];
  }
  if (!isExpensePortal) return [];

  const scopes: string[] = [];
  if (permissions.includes("*")) {
    if (isAddOnEnabledForScope(activatedPackages, "expensemanagement")) scopes.push("expensemanagement");
    if (isAddOnEnabledForScope(activatedPackages, "routing")) scopes.push("routing");
    return scopes;
  }
  if (
    isAddOnEnabledForScope(activatedPackages, "expensemanagement") &&
    EMPLOYEE_EXPENSE_MENU_PERMISSIONS.some((p) => permissions.includes(p))
  ) {
    scopes.push("expensemanagement");
  }
  if (
    isAddOnEnabledForScope(activatedPackages, "routing") &&
    EMPLOYEE_ROUTING_MENU_PERMISSIONS.some((p) => permissions.includes(p))
  ) {
    scopes.push("routing");
  }
  if (
    isAddOnEnabledForScope(activatedPackages, "lms") &&
    EMPLOYEE_LMS_MENU_PERMISSIONS.some((p) => permissions.includes(p))
  ) {
    scopes.push("lms");
  }
  return scopes;
}

/** Menu item names that, when user has parent permission, show all children (dropdown always visible like Laravel). */
const DROPDOWN_SHOW_ALL_CHILDREN_NAMES = new Set([
  "project",
  "hrm",
  "crm",
  "pos",
  "accounting",
  "resumebuilder",
  "usermanagement",
  "supportticket",
  "assets",
  "whatsappchat",
  "compliance",
  "routing",
]);

/** Permissions that grant access to the Accounting menu (parent or any child). User needs at least one to see Accounting. */
const ACCOUNTING_MENU_PERMISSIONS = new Set([
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
  "view-sales-proposals",
  "view-sales-invoices",
]);

function hasAnyAccountingPermission(permissions: string[]): boolean {
  if (permissions.includes("*")) return true;
  return permissions.some((p) => ACCOUNTING_MENU_PERMISSIONS.has(p));
}

function menuItemHasPermission(
  userPermissions: string[],
  permission: string | undefined,
  href?: string,
): boolean {
  if (!permission) return true;
  if (userPermissions.includes("*") && !isEmployeeOnlyMenuPermission(permission)) return true;
  /** Align sidebar with `/storefront/[section]` gates (`userMayAccessStorefrontSection`). */
  if (href?.startsWith("/storefront/")) {
    const seg = href.slice("/storefront/".length).split("/")[0]?.trim().toLowerCase() ?? "";
    if (seg && /^[a-z0-9-]+$/.test(seg) && userMayAccessStorefrontSection(userPermissions, seg)) {
      return true;
    }
  }
  if (permission === "manage-storefront-dashboard") {
    return userCanViewStorefront(userPermissions);
  }
  if (permission === "storefront.view" || permission === "manage-storefront") {
    return userCanViewStorefront(userPermissions);
  }
  if (permission.startsWith("storefront.")) {
    if (userHasFullStorefrontAccess(userPermissions)) return true;
    return userHasStorefrontPermission(userPermissions, permission);
  }
  /** Expense Management root nav: dashboard or any operational expense permission. */
  if (permission === "manage-expense-management-dashboard" && !href) {
    if (userPermissions.includes("manage-expense-management-dashboard")) return true;
    return (
      userPermissions.includes("manage-expense-reports") ||
      userPermissions.includes("manage-expense-entries") ||
      userPermissions.includes("manage-expense-receipts") ||
      userPermissions.includes("manage-expense-analytics")
    );
  }
  /** Affiliate Business root nav: umbrella or any section permission. */
  if (permission === "manage-affiliate-business" && !href) {
    if (userPermissions.includes("manage-affiliate-business")) return true;
    return (
      userPermissions.includes("manage-affiliate-business-dashboard") ||
      userPermissions.includes("manage-affiliate-partners") ||
      userPermissions.includes("manage-affiliate-programs") ||
      userPermissions.includes("manage-affiliate-commissions") ||
      userPermissions.includes("manage-affiliate-payouts") ||
      userPermissions.includes("manage-affiliate-analytics") ||
      userPermissions.includes("manage-affiliate-settings") ||
      userPermissions.includes("manage-affiliate-links")
    );
  }
  /** Event Platform — umbrella or any section permission. */
  if (permission === "manage-event-platform" && !href) {
    if (userPermissions.includes("manage-event-platform")) return true;
    if (userPermissions.includes("manage-lms")) return true;
    return (
      userPermissions.includes("reports.view") ||
      userPermissions.includes("manage-lms-events") ||
      userPermissions.includes("manage-lms-subscriptions") ||
      userPermissions.includes("vendors.view") ||
      userPermissions.includes("vendors.manage") ||
      userPermissions.includes("commissions.manage") ||
      userPermissions.includes("payouts.manage") ||
      userPermissions.includes("payments.manage") ||
      userPermissions.includes("cms.manage") ||
      userPermissions.includes("menus.manage") ||
      userPermissions.includes("settings.manage") ||
      userPermissions.includes("integrations.manage") ||
      userPermissions.includes("roles.manage")
    );
  }
  if (
    permission === "events.view" ||
    permission === "events.create" ||
    permission === "events.update" ||
    permission === "events.delete" ||
    permission === "bookings.view" ||
    permission === "bookings.manage" ||
    permission === "vendors.view" ||
    permission === "vendors.manage" ||
    permission === "commissions.manage" ||
    permission === "payouts.manage" ||
    permission === "payments.manage" ||
    permission === "cms.manage" ||
    permission === "menus.manage" ||
    permission === "settings.manage" ||
    permission === "roles.manage" ||
    permission === "integrations.manage" ||
    permission === "reports.view"
  ) {
    if (userPermissions.includes("manage-event-platform")) return true;
    if (userPermissions.includes("manage-lms")) return true;
    return userPermissions.includes(permission);
  }
  /** LMS root nav: tenant admins, instructor portal, or student portal permissions. */
  if (permission === "manage-lms" && !href) {
    if (userPermissions.includes("manage-lms")) return true;
    return (
      userPermissions.includes("manage-lms-instructor-dashboard") ||
      userPermissions.includes("manage-lms-instructor-profile") ||
      userPermissions.includes("view-lms-instructor-assignments") ||
      userPermissions.includes("manage-lms-instructor-courses") ||
      userPermissions.includes("view-lms-student-dashboard") ||
      userPermissions.includes("manage-lms-student-dashboard") ||
      userPermissions.includes("manage-lms-events")
    );
  }
  /** LMS event admin sections — umbrella `manage-lms` includes organizer tools. */
  if (
    permission === "manage-lms-events" ||
    permission === "manage-lms-event-checkin" ||
    permission === "manage-lms-event-income"
  ) {
    if (userPermissions.includes("manage-lms")) return true;
    return userPermissions.includes(permission);
  }
  /** Compliance root nav: dashboard or any compliance section permission. */
  if (permission === "manage-compliance-dashboard" && !href) {
    if (userPermissions.includes("manage-compliance-dashboard")) return true;
    if (userPermissions.includes("manage-compliance")) return true;
    return (
      userPermissions.includes("manage-compliance-frameworks") ||
      userPermissions.includes("manage-compliance-controls") ||
      userPermissions.includes("manage-compliance-evidence") ||
      userPermissions.includes("manage-compliance-policies") ||
      userPermissions.includes("manage-compliance-documents") ||
      userPermissions.includes("manage-compliance-monitors") ||
      userPermissions.includes("manage-compliance-risks") ||
      userPermissions.includes("manage-compliance-vendors") ||
      userPermissions.includes("manage-compliance-access-reviews") ||
      userPermissions.includes("manage-compliance-vulnerabilities") ||
      userPermissions.includes("manage-compliance-audits") ||
      userPermissions.includes("manage-compliance-trust-center") ||
      userPermissions.includes("manage-compliance-integrations") ||
      userPermissions.includes("manage-compliance-settings")
    );
  }
  /** Routing dashboard link or nav: umbrella or any routing section permission. */
  if (permission === "manage-routing-dashboard") {
    if (userPermissions.includes("manage-routing-dashboard")) return true;
    if (userPermissions.includes("manage-routing")) return true;
    return (
      userPermissions.includes("manage-routing-routes") ||
      userPermissions.includes("manage-routing-fieldmap") ||
      userPermissions.includes("manage-routing-my-routes")
    );
  }
  if (permission === "manage-routing-my-routes") {
    return userPermissions.includes("manage-routing-my-routes");
  }
  return userPermissions.includes(permission);
}

function filterByPermission(
  items: NavItem[],
  userPermissions: string[],
  roles: string[] = [],
  primaryRole?: string,
): NavItem[] {
  const isAll = userPermissions.includes("*");

  const grants = (permission: string | undefined, href?: string) => {
    if (
      isLmsEmployeeLearnerMenuPermission(permission) &&
      !isLmsEmployeeLearnerAudience(roles, primaryRole)
    ) {
      return false;
    }
    return (
      (isAll && permission && !isEmployeeOnlyMenuPermission(permission)) ||
      menuItemHasPermission(userPermissions, permission, href)
    );
  };

  return items
    .map((item) => ({ ...item }))
    .filter((item) => {
      if (!item.permission) {
        if (item.children) item.children = filterByPermission(item.children, userPermissions, roles, primaryRole);
        return true;
      }

      const hasParentPermission = grants(item.permission, item.href);

      if (item.children) {
        const showAllChildren =
          hasParentPermission && item.name && DROPDOWN_SHOW_ALL_CHILDREN_NAMES.has(item.name);
        const filteredChildren = showAllChildren
          ? item.children.filter((child) =>
              isEmployeeOnlyMenuPermission(child.permission)
                ? grants(child.permission, child.href)
                : true,
            )
          : filterByPermission(item.children, userPermissions, roles, primaryRole);
        item.children = filteredChildren;
        // Show parent if user has parent permission OR at least one child is visible (so Accounting shows when user has e.g. manage-customers only)
        if (filteredChildren.length > 0) return true;
        return hasParentPermission;
      }

      if (!hasParentPermission) return false;
      return true;
    });
}

function isSuperAdmin(roles: string[]): boolean {
  return roles.includes("superadmin") || roles.includes("super_admin");
}

type LmsMenuAudience = "company" | "student" | "instructor";

/** Permissions allowed in the LMS sidebar for each portal / tenant audience. */
const LMS_MENU_PERMISSIONS_BY_AUDIENCE: Record<LmsMenuAudience, ReadonlySet<string>> = {
  student: new Set(["view-lms-student-dashboard", "manage-lms-student-dashboard"]),
  instructor: new Set([
    "manage-lms-instructor-dashboard",
    "manage-lms-instructor-profile",
    "view-lms-instructor-assignments",
    "manage-lms-instructor-courses",
  ]),
  company: new Set([
    "manage-lms-dashboard",
    "manage-lms-courses",
    "manage-lms-classes",
    "manage-lms-students",
    "manage-lms-instructors",
    "manage-lms-meetings",
    "manage-lms-events",
    "manage-lms-event-checkin",
    "manage-lms-subscriptions",
    "manage-lms-analytics",
    "manage-lms-settings",
  ]),
};

function resolveLmsMenuAudience(
  roles: string[],
  primaryRole?: string,
  currentUrl?: string,
): LmsMenuAudience {
  const url = (currentUrl ?? "").trim().toLowerCase();
  if (url.startsWith("/lms/admin")) return "company";

  const normalized = roles.map((r) => r.trim().toLowerCase());
  const primary = (primaryRole ?? roles[0] ?? "").trim().toLowerCase();
  if (primary === "lms-student" || primary === "staff" || normalized.includes("staff")) return "student";
  if (primary === "lms-instructor") return "instructor";
  return "company";
}

function filterLmsMenuChildrenForAudience(
  children: NavItem[],
  audience: LmsMenuAudience,
  userPermissions: string[],
): NavItem[] {
  const allowed = LMS_MENU_PERMISSIONS_BY_AUDIENCE[audience];
  const isAll = userPermissions.includes("*");

  return children.filter((child) => {
    const perm = child.permission;
    if (!perm || !allowed.has(perm)) return false;
    return isAll || menuItemHasPermission(userPermissions, perm, child.href);
  });
}

function applyLmsRoleMenuFilter(
  items: NavItem[],
  roles: string[],
  permissions: string[],
  primaryRole?: string,
  currentUrl?: string,
): NavItem[] {
  const audience = resolveLmsMenuAudience(roles, primaryRole, currentUrl);

  return items
    .map((item) => {
      if (item.name !== "lms" || !item.children?.length) return item;
      const children = filterLmsMenuChildrenForAudience(item.children, audience, permissions);
      return { ...item, children };
    })
    .filter((item) => item.name !== "lms" || (item.children?.length ?? 0) > 0);
}

/** Hide menu items (Project, Accounting, etc.) when their add-on is disabled. */
function filterByActivatedPackages(items: NavItem[], activatedPackages: string[]): NavItem[] {
  return items
    .map((item) => ({ ...item }))
    .filter((item) => {
      const scope = item.dashboardScope ?? item.name;
      if (scope && !isAddOnEnabledForScope(activatedPackages, scope)) return false;
      if (item.children) {
        item.children = filterByActivatedPackages(item.children, activatedPackages);
      }
      return true;
    });
}

/**
 * Ensures the nav section for the given scope is present with its full children.
 * Works generically for any module: account, project, hrm, recruitment, crm, appointment, pos.
 * This means: even if the user only has a sub-permission (e.g. manage-leads), when they're
 * on a CRM page the full CRM nav section with all its children is shown.
 */
function ensureScopeMenuPresent(
  permitted: NavItem[],
  sorted: NavItem[],
  scope: string,
  activatedPackages: string[],
  userPermissions: string[] = [],
  roles: string[] = [],
  primaryRole?: string,
): NavItem[] {
  if (!isAddOnEnabledForScope(activatedPackages, scope)) return permitted;

  const filterChildren = (children: NavItem[]) =>
    userPermissions.length > 0
      ? filterByPermission(children, userPermissions, roles, primaryRole)
      : children;

  // Find the nav section whose dashboardScope matches (handles both name-based and scope-based)
  const sectionName = scope === "account" ? "accounting" : scope;
  const existing = permitted.find((i) => i.dashboardScope === scope || i.name === sectionName);
  const source = sorted.find((i) => i.dashboardScope === scope || i.name === sectionName);

  if (!source) return permitted;

  if (!existing) {
    // Section not in permitted list at all — add it with permission-filtered children
    const withChildren: NavItem = { ...source, children: filterChildren([...(source.children ?? [])]) };
    return [...permitted, withChildren].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }

  // Section exists but may have empty children — restore them (permission-filtered)
  if (source.children?.length && !existing.children?.length) {
    return permitted.map((item) =>
      item === existing ? { ...item, children: filterChildren([...source.children!]) } : item,
    );
  }

  return permitted;
}

/** Hide company-wide dashboard links for portal logins (client / staff / vendor / LMS). */
function restrictMenuForPortalUsers(
  items: NavItem[],
  roles: string[],
  permissions: string[],
  activatedPackages: string[],
  primaryRole?: string,
): NavItem[] {
  if (!isPortalSession(roles, primaryRole)) return items;

  const normalized = roles.map((r) => r.trim().toLowerCase());
  const primary = (primaryRole ?? roles[0] ?? "").trim().toLowerCase();
  const isStaffPortal = primary === "staff" || normalized.includes("staff");

  if (isStaffPortal) {
    const hasLms =
      isAddOnEnabledForScope(activatedPackages, "lms") &&
      EMPLOYEE_LMS_MENU_PERMISSIONS.some((p) => permissions.includes(p));
    return items.map((item) => {
      if (item.name !== "dashboard" || !item.children?.length) return item;
      const children = item.children.filter((child) => {
        const scope = (child.dashboardScope ?? "").toLowerCase();
        if (scope === "expensemanagement" || scope === "routing") return true;
        if (scope === "lms" && hasLms) return true;
        return false;
      });
      return { ...item, children };
    });
  }

  const dashboardScope =
    primary === "lms-student" || primary === "lms-instructor"
      ? "lms"
      : primary === "support-staff"
        ? "supportticket"
        : "expensemanagement";

  return items.map((item) => {
    if (item.name !== "dashboard" || !item.children?.length) return item;
    const children = item.children.filter((child) => {
      const scope = (child.dashboardScope ?? "").toLowerCase();
      return scope === dashboardScope;
    });
    return { ...item, children };
  });
}

export function getMenuItems(opts: {
  roles: string[];
  permissions: string[];
  currentUrl: string;
  activatedPackages?: string[];
  primaryRole?: string;
}): NavItem[] {
  const { roles, permissions, currentUrl, activatedPackages = [], primaryRole } = opts;

  // Partner portal sees only the partner menu (scoped, role-permission gated).
  if (isPartner(roles, primaryRole) && !isSuperAdmin(roles)) {
    const partnerSorted = [...getPartnerMenu()].sort((a, b) => (a.order || 999) - (b.order || 999));
    return filterByPermission(partnerSorted, permissions, roles, primaryRole);
  }

  if (isMarketplaceVendor(roles, primaryRole) && !isSuperAdmin(roles)) {
    const vendorSorted = [...getMarketplaceVendorMenu()].sort((a, b) => (a.order || 999) - (b.order || 999));
    return filterByPermission(vendorSorted, permissions, roles, primaryRole);
  }

  // Only superadmin sees superadmin menu; company/staff/etc. see company menu.
  const coreMenuItems = isSuperAdmin(roles) ? getSuperAdminMenu() : getCompanyMenu();
  const sorted = [...coreMenuItems].sort((a, b) => (a.order || 999) - (b.order || 999));
  let permitted = filterByPermission(sorted, permissions, roles, primaryRole);
  permitted = filterByActivatedPackages(permitted, activatedPackages);
  permitted = applyLmsRoleMenuFilter(permitted, roles, permissions, primaryRole, currentUrl);
  permitted = restrictMenuForPortalUsers(permitted, roles, permissions, activatedPackages, primaryRole);

  if (isSuperAdmin(roles)) return permitted;

  const scope = detectDashboardScope(currentUrl);

  // For every module scope, ensure the module's nav section is present with full sub-menu
  // when the user is browsing within that module. This makes the sidebar contextual:
  // /hrm/* → HRM nav only, /recruitment/* → Recruitment nav only, etc.
  if (scope) {
    permitted = ensureScopeMenuPresent(permitted, sorted, scope, activatedPackages, permissions, roles, primaryRole);
    permitted = applyLmsRoleMenuFilter(permitted, roles, permissions, primaryRole, currentUrl);
  }

  const alsoScopes = portalPinnedScopes(roles, permissions, activatedPackages, primaryRole);
  return filterByDashboardScope(permitted, scope, alsoScopes);
}

/**
 * Full navigable index for global search: permission + add-on gated, but not limited to the
 * current URL scope (sidebar) and, for superadmins, merges company routes (e.g. Storefront) with
 * superadmin-only routes (Companies, Add-ons, …).
 */
export function getGlobalSearchEntries(opts: {
  roles: string[];
  permissions: string[];
  activatedPackages?: string[];
  primaryRole?: string;
}): NavSearchEntry[] {
  const { roles, permissions, activatedPackages = [], primaryRole } = opts;
  const isSuperAdminUser = isSuperAdmin(roles);

  const prepare = (core: NavItem[]) => {
    const sorted = [...core].sort((a, b) => (a.order || 999) - (b.order || 999));
    let permitted = filterByPermission(sorted, permissions, roles, primaryRole);
    permitted = filterByActivatedPackages(permitted, activatedPackages);
    return permitted;
  };

  const settingsEntries = getSettingsSearchEntries({
    permissions,
    roles,
    activatedPackages,
    isSuperAdmin: isSuperAdminUser,
  });
  const extraEntries = filterExtraSearchRoutes(EXTRA_GLOBAL_SEARCH_ROUTES, permissions);

  const companyFlat = mergeSearchEntryLists(
    flattenNavForSearch(prepare(getCompanyMenu())),
    [...settingsEntries, ...extraEntries],
  );

  if (!isSuperAdminUser) {
    return companyFlat;
  }

  const superFlat = flattenNavForSearch(prepare(getSuperAdminMenu()));
  return mergeSearchEntryLists(superFlat, companyFlat);
}
