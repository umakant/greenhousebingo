import type { NavItem } from "@/types";
import { t } from "@/lib/admin-t";
import {
  applyDashboardPrefsToNav,
  dashboardChildLabel,
  type DashboardSidebarPrefs,
} from "@/lib/dashboard-sidebar-prefs";
import { getMenuItems } from "@/utils/menu";

export type DashboardShortcutLink = {
  label: string;
  href: string;
};

export type DashboardShortcutOption = {
  scope: string;
  label: string;
  href?: string;
  children: DashboardShortcutLink[];
};

/** Route used so `getMenuItems` exposes the full module sub-menu for each dashboard scope. */
const SCOPE_HOME_URL: Record<string, string> = {
  project: "/project/dashboard",
  account: "/account",
  storefront: "/storefront/dashboard",
  hrm: "/hrm",
  crm: "/crm/dashboard",
  pos: "/pos/dashboard",
  supportticket: "/support-ticket",
  expensemanagement: "/expense-management",
  lms: "/lms/dashboard",
  affiliatebusiness: "/affiliate-business",
  compliance: "/compliance",
};

function navItemLabel(item: NavItem, tt: (key: string) => string): string {
  if (item.displayTitle?.trim()) return item.displayTitle.trim();
  return tt(item.title);
}

export function flattenNavLinks(
  items: NavItem[],
  tt: (key: string) => string,
  prefix = "",
): DashboardShortcutLink[] {
  const out: DashboardShortcutLink[] = [];
  for (const item of items) {
    const label = navItemLabel(item, tt);
    const fullLabel = prefix ? `${prefix} › ${label}` : label;
    if (item.href?.trim()) {
      out.push({ label: fullLabel, href: item.href.trim() });
    }
    if (item.children?.length) {
      out.push(...flattenNavLinks(item.children, tt, prefix ? fullLabel : label));
    }
  }
  return out;
}

function dedupeLinks(links: DashboardShortcutLink[]): DashboardShortcutLink[] {
  const seen = new Set<string>();
  const next: DashboardShortcutLink[] = [];
  for (const link of links) {
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    next.push(link);
  }
  return next;
}

function moduleLinksForScope(
  opts: {
    roles: string[];
    permissions: string[];
    activatedPackages: string[];
    primaryRole?: string;
    dashboardPrefs?: DashboardSidebarPrefs;
  },
  scope: string,
  dashboardHref?: string,
  dashboardLabel?: string,
): DashboardShortcutLink[] {
  const homeUrl = SCOPE_HOME_URL[scope] ?? dashboardHref ?? "/launchpad/command-center";
  let menu = getMenuItems({
    roles: opts.roles,
    permissions: opts.permissions,
    currentUrl: homeUrl,
    activatedPackages: opts.activatedPackages,
    primaryRole: opts.primaryRole,
  });
  if (opts.dashboardPrefs) {
    menu = applyDashboardPrefsToNav(menu, opts.dashboardPrefs, (k) => t(k));
  }

  const modules = menu.filter(
    (item) =>
      item.dashboardScope === scope &&
      item.name !== "dashboard" &&
      item.name !== "launchpad",
  );

  const links: DashboardShortcutLink[] = [];
  if (dashboardHref?.trim()) {
    links.push({
      label: dashboardLabel?.trim() || t("Dashboard"),
      href: dashboardHref.trim(),
    });
  }

  for (const mod of modules) {
    if (mod.children?.length) {
      links.push(...flattenNavLinks(mod.children, (k) => t(k)));
    } else if (mod.href?.trim()) {
      links.push({ label: navItemLabel(mod, (k) => t(k)), href: mod.href.trim() });
    }
  }

  return dedupeLinks(links);
}

export function buildDashboardShortcutOptions(opts: {
  roles: string[];
  permissions: string[];
  activatedPackages: string[];
  primaryRole?: string;
  dashboardPrefs?: DashboardSidebarPrefs;
}): DashboardShortcutOption[] {
  let menu = getMenuItems({
    roles: opts.roles,
    permissions: opts.permissions,
    currentUrl: "/launchpad/command-center",
    activatedPackages: opts.activatedPackages,
    primaryRole: opts.primaryRole,
  });
  if (opts.dashboardPrefs) {
    menu = applyDashboardPrefsToNav(menu, opts.dashboardPrefs, (k) => t(k));
  }

  const dashboardGroup = menu.find((item) => item.name === "dashboard");
  if (!dashboardGroup?.children?.length) return [];

  const tt = (key: string) => t(key);
  const options: DashboardShortcutOption[] = [];

  for (const dash of dashboardGroup.children) {
    const scope = dash.dashboardScope?.trim();
    if (!scope) continue;
    const label = dashboardChildLabel(dash, tt);
    options.push({
      scope,
      label,
      href: dash.href,
      children: moduleLinksForScope(opts, scope, dash.href, label),
    });
  }

  return options;
}

export const COMMAND_CENTER_SCOPE_ICON: Record<string, string> = {
  project: "folder-kanban",
  account: "calculator",
  storefront: "store",
  hrm: "users",
  crm: "contact",
  pos: "monitor",
  supportticket: "life-buoy",
  expensemanagement: "receipt",
  lms: "graduation-cap",
  affiliatebusiness: "handshake",
  compliance: "shield-check",
};

export const COMMAND_CENTER_SCOPE_COLOR: Record<string, string> = {
  project: "bg-sky-500/15 text-sky-600",
  account: "bg-emerald-500/15 text-emerald-600",
  storefront: "bg-violet-500/15 text-violet-600",
  hrm: "bg-blue-500/15 text-blue-600",
  crm: "bg-pink-500/15 text-pink-600",
  pos: "bg-amber-500/15 text-amber-600",
  supportticket: "bg-orange-500/15 text-orange-600",
  expensemanagement: "bg-teal-500/15 text-teal-600",
  lms: "bg-indigo-500/15 text-indigo-600",
  affiliatebusiness: "bg-rose-500/15 text-rose-600",
  compliance: "bg-purple-500/15 text-purple-600",
};
