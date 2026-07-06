import { isAddOnEnabledForScope } from "@/lib/addon-scope";
import { hasPermission } from "@/lib/authz";
import type { CommandCenterQuickAction, CommandCenterShortcut } from "@/lib/launchpad/command-center-types";

export type CommandCenterLinkDef = {
  id: string;
  label: string;
  href: string;
  icon: string;
  /** Show in the top circular quicklinks row */
  pinned?: boolean;
  permissions?: string[];
  addonScope?: string;
};

export type CommandCenterCategoryDef = {
  id: string;
  label: string;
  icon: string;
  addonScope?: string;
  links: CommandCenterLinkDef[];
};

export const COMMAND_CENTER_CATEGORIES: CommandCenterCategoryDef[] = [
  {
    id: "people-hr",
    label: "People & HR",
    icon: "users",
    addonScope: "hrm",
    links: [
      {
        id: "add-employee",
        label: "Add New Employee",
        href: "/hrm/employees",
        icon: "user-plus",
        pinned: true,
        permissions: ["manage-employees"],
        addonScope: "hrm",
      },
      {
        id: "mark-attendance",
        label: "Mark Attendance",
        href: "/hrm/attendances",
        icon: "clock",
        pinned: true,
        permissions: ["manage-attendances"],
        addonScope: "hrm",
      },
      {
        id: "apply-leave",
        label: "Apply for Leave",
        href: "/hrm/leave-applications",
        icon: "calendar",
        permissions: ["manage-leave-applications"],
        addonScope: "hrm",
      },
      {
        id: "process-payroll",
        label: "Process Payroll",
        href: "/hrm/payrolls",
        icon: "credit-card",
        permissions: ["manage-payrolls"],
        addonScope: "hrm",
      },
      {
        id: "create-promotion",
        label: "Create Promotion",
        href: "/hrm/promotions",
        icon: "trending-up",
        permissions: ["manage-promotions"],
        addonScope: "hrm",
      },
      {
        id: "create-holiday",
        label: "Create Holiday",
        href: "/hrm/holidays",
        icon: "calendar-days",
        permissions: ["manage-holidays"],
        addonScope: "hrm",
      },
      {
        id: "create-resignation",
        label: "Create Resignation",
        href: "/hrm/resignations",
        icon: "trending-down",
        permissions: ["manage-resignations"],
        addonScope: "hrm",
      },
      {
        id: "create-warning",
        label: "Create Warning",
        href: "/hrm/warnings",
        icon: "alert-triangle",
        permissions: ["manage-warnings"],
        addonScope: "hrm",
      },
      {
        id: "hrm-dashboard",
        label: "HRM Dashboard",
        href: "/hrm",
        icon: "layout-grid",
        permissions: ["manage-hrm"],
        addonScope: "hrm",
      },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    icon: "folder-kanban",
    addonScope: "project",
    links: [
      {
        id: "new-project",
        label: "New Project",
        href: "/projects",
        icon: "folder-kanban",
        pinned: true,
        permissions: ["manage-project"],
        addonScope: "project",
      },
      {
        id: "project-roadmap",
        label: "Project Roadmap",
        href: "/projects/board",
        icon: "kanban",
        permissions: ["manage-project"],
        addonScope: "project",
      },
      {
        id: "field-map",
        label: "FieldMap",
        href: "/projects/field-map",
        icon: "map",
        permissions: ["manage-project"],
        addonScope: "project",
      },
      {
        id: "routes",
        label: "Routes",
        href: "/projects/routes",
        icon: "route",
        permissions: ["manage-project"],
        addonScope: "project",
      },
      {
        id: "missions-board",
        label: "Missions Board",
        href: "/projects/missions",
        icon: "target",
        permissions: ["manage-project"],
        addonScope: "project",
      },
      {
        id: "project-dashboard",
        label: "Project Dashboard",
        href: "/project/dashboard",
        icon: "layout-grid",
        permissions: ["manage-project-dashboard"],
        addonScope: "project",
      },
    ],
  },
  {
    id: "sales-crm",
    label: "Sales & CRM",
    icon: "contact",
    addonScope: "crm",
    links: [
      {
        id: "add-lead",
        label: "Add Lead",
        href: "/crm/leads",
        icon: "user-plus",
        pinned: true,
        permissions: ["manage-leads"],
        addonScope: "crm",
      },
      {
        id: "deals",
        label: "Deals",
        href: "/crm/deals",
        icon: "handshake",
        permissions: ["manage-deals"],
        addonScope: "crm",
      },
      {
        id: "crm-dashboard",
        label: "CRM Dashboard",
        href: "/crm/dashboard",
        icon: "layout-grid",
        permissions: ["manage-crm-dashboard"],
        addonScope: "crm",
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: "calculator",
    addonScope: "account",
    links: [
      {
        id: "add-customer",
        label: "Add Customer",
        href: "/account/customers",
        icon: "users",
        permissions: ["manage-customers"],
        addonScope: "account",
      },
      {
        id: "add-vendor",
        label: "Add Vendor",
        href: "/account/vendors",
        icon: "building-2",
        permissions: ["manage-vendors"],
        addonScope: "account",
      },
      {
        id: "customer-payments",
        label: "Customer Payments",
        href: "/account/customer-payments",
        icon: "wallet",
        permissions: ["manage-customer-payments"],
        addonScope: "account",
      },
      {
        id: "expenses",
        label: "Expenses",
        href: "/account/expenses",
        icon: "receipt",
        permissions: ["manage-expenses"],
        addonScope: "account",
      },
      {
        id: "account-dashboard",
        label: "Account Dashboard",
        href: "/account",
        icon: "layout-grid",
        permissions: ["manage-account-dashboard"],
        addonScope: "account",
      },
    ],
  },
  {
    id: "learning",
    label: "Learning",
    icon: "graduation-cap",
    addonScope: "lms",
    links: [
      {
        id: "create-course",
        label: "Create Course",
        href: "/lms/courses",
        icon: "book-open",
        permissions: ["manage-lms-courses", "manage-lms"],
        addonScope: "lms",
      },
      {
        id: "lms-dashboard",
        label: "LMS Dashboard",
        href: "/lms/dashboard",
        icon: "layout-grid",
        permissions: ["manage-lms-dashboard"],
        addonScope: "lms",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: "life-buoy",
    links: [
      {
        id: "support-ticket",
        label: "Support Tickets",
        href: "/support-ticket/tickets",
        icon: "life-buoy",
        permissions: ["manage-tickets", "manage-support-ticket"],
        addonScope: "supportticket",
      },
      {
        id: "expense-report",
        label: "Expense Reports",
        href: "/expense-management/expenses",
        icon: "receipt",
        permissions: ["manage-expense-entries", "manage-expense-management"],
        addonScope: "expensemanagement",
      },
      {
        id: "pos",
        label: "Point of Sale",
        href: "/pos",
        icon: "monitor",
        permissions: ["view-pos", "manage-pos"],
        addonScope: "pos",
      },
      {
        id: "storefront",
        label: "Storefront Setup",
        href: "/storefront/onboarding",
        icon: "store",
        permissions: ["storefront.view", "manage-storefront-settings"],
        addonScope: "storefront",
      },
      {
        id: "compliance",
        label: "Compliance",
        href: "/compliance",
        icon: "shield-check",
        permissions: ["manage-compliance-dashboard"],
        addonScope: "compliance",
      },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    icon: "building-2",
    links: [
      {
        id: "invite-team",
        label: "Invite Team",
        href: "/settings?tab=user-management",
        icon: "user-plus",
        pinned: true,
        permissions: ["manage-users", "create-users"],
      },
      {
        id: "company-profile",
        label: "Company Profile",
        href: "/settings?tab=company",
        icon: "building-2",
        pinned: true,
        permissions: ["manage-company-settings", "manage-settings", "edit-settings"],
      },
      {
        id: "settings",
        label: "Settings",
        href: "/settings",
        icon: "settings",
        permissions: ["manage-settings"],
      },
      {
        id: "launchpad",
        label: "Launchpad Overview",
        href: "/launchpad",
        icon: "rocket",
        permissions: ["manage-dashboard"],
      },
    ],
  },
];

/** Top-row hero quick actions (mockup order + colors). */
export const COMMAND_CENTER_HERO_ACTIONS: Array<CommandCenterLinkDef & { colorClass: string }> = [
  {
    id: "add-employee",
    label: "Add Employee",
    href: "/hrm/employees",
    icon: "user-plus",
    colorClass: "bg-blue-500/15 text-blue-600",
    permissions: ["manage-employees"],
    addonScope: "hrm",
  },
  {
    id: "new-project",
    label: "New Project",
    href: "/projects",
    icon: "folder-kanban",
    colorClass: "bg-sky-500/15 text-sky-600",
    permissions: ["manage-project"],
    addonScope: "project",
  },
  {
    id: "new-lead",
    label: "New Lead",
    href: "/crm/leads",
    icon: "contact",
    colorClass: "bg-pink-500/15 text-pink-600",
    permissions: ["manage-leads", "manage-crm"],
    addonScope: "crm",
  },
  {
    id: "create-invoice",
    label: "Create Invoice",
    href: "/account/revenues",
    icon: "receipt",
    colorClass: "bg-violet-500/15 text-violet-600",
    permissions: ["manage-revenues", "manage-account"],
    addonScope: "account",
  },
  {
    id: "schedule-shift",
    label: "Schedule Shift",
    href: "/hrm/shifts",
    icon: "clock",
    colorClass: "bg-indigo-500/15 text-indigo-600",
    permissions: ["manage-shifts"],
    addonScope: "hrm",
  },
  {
    id: "add-vendor",
    label: "Add Vendor",
    href: "/account/vendors",
    icon: "building-2",
    colorClass: "bg-indigo-600/15 text-indigo-700",
    permissions: ["manage-vendors"],
    addonScope: "account",
  },
  {
    id: "run-payroll",
    label: "Run Payroll",
    href: "/hrm/payrolls",
    icon: "credit-card",
    colorClass: "bg-slate-500/15 text-slate-600",
    permissions: ["manage-payrolls"],
    addonScope: "hrm",
  },
  {
    id: "send-announcement",
    label: "Send Announcement",
    href: "/hrm/announcements",
    icon: "megaphone",
    colorClass: "bg-red-500/15 text-red-600",
    permissions: ["manage-announcements"],
    addonScope: "hrm",
  },
];

export const COMMAND_CENTER_DASHBOARD_SHORTCUTS: CommandCenterShortcut[] = [
  {
    id: "hr-dashboard",
    label: "HR Dashboard",
    href: "/hrm",
    icon: "users",
    colorClass: "bg-blue-500/15 text-blue-600",
    permissions: ["manage-hrm"],
    addonScope: "hrm",
  },
  {
    id: "crm-dashboard",
    label: "CRM Dashboard",
    href: "/crm/dashboard",
    icon: "contact",
    colorClass: "bg-pink-500/15 text-pink-600",
    permissions: ["manage-crm-dashboard", "manage-crm"],
    addonScope: "crm",
  },
  {
    id: "finance-dashboard",
    label: "Finance Dashboard",
    href: "/account",
    icon: "calculator",
    colorClass: "bg-emerald-500/15 text-emerald-600",
    permissions: ["manage-account-dashboard", "manage-account"],
    addonScope: "account",
  },
  {
    id: "projects-dashboard",
    label: "Projects Dashboard",
    href: "/project/dashboard",
    icon: "folder-kanban",
    colorClass: "bg-sky-500/15 text-sky-600",
    permissions: ["manage-project-dashboard", "manage-project"],
    addonScope: "project",
  },
  {
    id: "compliance-dashboard",
    label: "Compliance Dashboard",
    href: "/compliance",
    icon: "shield-check",
    colorClass: "bg-violet-500/15 text-violet-600",
    permissions: ["manage-compliance-dashboard"],
    addonScope: "compliance",
  },
  {
    id: "support-tickets",
    label: "Support Tickets",
    href: "/support-ticket/tickets",
    icon: "life-buoy",
    colorClass: "bg-orange-500/15 text-orange-600",
    permissions: ["manage-tickets", "manage-support-ticket"],
    addonScope: "supportticket",
  },
  {
    id: "document-center",
    label: "Document Center",
    href: "/hrm/documents",
    icon: "file-text",
    colorClass: "bg-slate-500/15 text-slate-600",
    permissions: ["manage-hrm-documents", "manage-compliance-documents"],
  },
  {
    id: "reports-center",
    label: "Reports Center",
    href: "/compliance/reports",
    icon: "bar-chart",
    colorClass: "bg-amber-500/15 text-amber-600",
    permissions: ["manage-compliance-reports", "manage-account-reports", "view-reports"],
  },
];

function canSeeLink(
  permissions: string[],
  link: CommandCenterLinkDef,
  activatedPackages: string[],
): boolean {
  if (permissions.includes("*")) return true;
  if (link.addonScope && !isAddOnEnabledForScope(activatedPackages, link.addonScope)) return false;
  if (!link.permissions?.length) return true;
  return link.permissions.some((p) => hasPermission(permissions, p));
}

function canSeeCategory(
  permissions: string[],
  category: CommandCenterCategoryDef,
  activatedPackages: string[],
): boolean {
  if (category.addonScope && !isAddOnEnabledForScope(activatedPackages, category.addonScope)) return false;
  return category.links.some((link) => canSeeLink(permissions, link, activatedPackages));
}

export type CommandCenterCategorySnapshot = {
  id: string;
  label: string;
  icon: string;
  links: CommandCenterLinkDef[];
};

export function buildCommandCenterLinks(
  permissions: string[],
  activatedPackages: string[],
): { pinned: CommandCenterLinkDef[]; categories: CommandCenterCategorySnapshot[] } {
  const pinned: CommandCenterLinkDef[] = [];
  const seenPinned = new Set<string>();

  for (const category of COMMAND_CENTER_CATEGORIES) {
    if (!canSeeCategory(permissions, category, activatedPackages)) continue;

    for (const link of category.links) {
      if (!link.pinned || !canSeeLink(permissions, link, activatedPackages)) continue;
      if (seenPinned.has(link.id)) continue;
      seenPinned.add(link.id);
      pinned.push(link);
    }
  }

  const categories = COMMAND_CENTER_CATEGORIES.filter((category) =>
    canSeeCategory(permissions, category, activatedPackages),
  ).map((category) => ({
    id: category.id,
    label: category.label,
    icon: category.icon,
    links: category.links.filter((link) => canSeeLink(permissions, link, activatedPackages)),
  }));

  return { pinned, categories };
}

export function buildCommandCenterQuickActions(
  permissions: string[],
  activatedPackages: string[],
): CommandCenterQuickAction[] {
  return COMMAND_CENTER_HERO_ACTIONS.filter((link) => canSeeLink(permissions, link, activatedPackages)).map(
    ({ colorClass, ...link }) => ({ ...link, colorClass }),
  );
}

export function buildCommandCenterShortcuts(
  permissions: string[],
  activatedPackages: string[],
): CommandCenterShortcut[] {
  return COMMAND_CENTER_DASHBOARD_SHORTCUTS.filter((item) => {
    if (permissions.includes("*")) return true;
    if (item.addonScope && !isAddOnEnabledForScope(activatedPackages, item.addonScope)) return false;
    if (!item.permissions?.length) return true;
    return item.permissions.some((p) => hasPermission(permissions, p));
  });
}
