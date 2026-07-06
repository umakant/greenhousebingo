import type { NavItem } from "@/types";

/** Pre–per-tenant storage (migrated once per tenant key on first read). */
const LEGACY_STORAGE_KEY = "pf_dashboard_sidebar_prefs_v1";

export const DASHBOARD_SIDEBAR_PREFS_EVENT = "pf:dashboard-sidebar-prefs";

export type DashboardSidebarPrefsEventDetail = { tenantId: string };

export type DashboardSidebarPrefs = {
  /** `dashboardScope` values in display order (e.g. `project`, `account`). */
  order?: string[];
  /** Custom label by `dashboardScope`; overrides translated default title in the sidebar only. */
  labels?: Record<string, string>;
};

function storageKeyForTenant(tenantId: string): string {
  const safe = encodeURIComponent(tenantId.trim() || "_");
  return `pf_dashboard_sidebar_prefs_v1_${safe}`;
}

/** Copy legacy global prefs into this tenant's key once, then remove legacy. */
function migrateLegacyToTenant(tenantId: string): void {
  if (typeof window === "undefined" || !tenantId) return;
  try {
    const key = storageKeyForTenant(tenantId);
    if (localStorage.getItem(key)) return;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return;
    localStorage.setItem(key, legacy);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

function dispatchPrefsChanged(tenantId: string) {
  window.dispatchEvent(
    new CustomEvent<DashboardSidebarPrefsEventDetail>(DASHBOARD_SIDEBAR_PREFS_EVENT, {
      detail: { tenantId },
    }),
  );
}

export function loadDashboardPrefs(tenantId: string): DashboardSidebarPrefs {
  if (typeof window === "undefined" || !tenantId) return {};
  migrateLegacyToTenant(tenantId);
  try {
    const raw = localStorage.getItem(storageKeyForTenant(tenantId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DashboardSidebarPrefs;
    const order = Array.isArray(parsed.order) ? parsed.order.map(String) : undefined;
    const labels =
      parsed.labels && typeof parsed.labels === "object" && !Array.isArray(parsed.labels)
        ? Object.fromEntries(
            Object.entries(parsed.labels).map(([k, v]) => [String(k), String(v ?? "").trim()]).filter(([, v]) => v),
          )
        : undefined;
    return { order, labels };
  } catch {
    return {};
  }
}

export function saveDashboardPrefs(tenantId: string, prefs: DashboardSidebarPrefs) {
  if (typeof window === "undefined" || !tenantId) return;
  migrateLegacyToTenant(tenantId);
  const toSave: DashboardSidebarPrefs = {};
  if (prefs.order?.length) toSave.order = prefs.order;
  if (prefs.labels && Object.keys(prefs.labels).length) toSave.labels = prefs.labels;
  const key = storageKeyForTenant(tenantId);
  if (!toSave.order && !toSave.labels) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(toSave));
  }
  dispatchPrefsChanged(tenantId);
}

/** Merge into existing saved prefs (e.g. update one label while keeping order). */
export function patchDashboardPrefs(tenantId: string, patch: Partial<DashboardSidebarPrefs>) {
  if (!tenantId) return;
  const cur = loadDashboardPrefs(tenantId);
  const labels = { ...(cur.labels ?? {}), ...(patch.labels ?? {}) };
  for (const k of Object.keys(labels)) {
    if (!labels[k]?.trim()) delete labels[k];
  }
  saveDashboardPrefs(tenantId, {
    order: patch.order ?? cur.order,
    labels: Object.keys(labels).length ? labels : undefined,
  });
}

export function clearDashboardPrefs(tenantId: string) {
  if (typeof window === "undefined" || !tenantId) return;
  localStorage.removeItem(storageKeyForTenant(tenantId));
  dispatchPrefsChanged(tenantId);
}

/** Visible label for sorting / display (uses custom label when set). */
export function dashboardChildLabel(child: NavItem, tt: (key: string) => string): string {
  if (child.displayTitle?.trim()) return child.displayTitle.trim();
  return tt(child.title);
}

/** Scopes sorted A–Z by visible label (after any `displayTitle` from a previous merge pass). */
export function buildAlphabeticalScopeOrder(children: NavItem[], tt: (key: string) => string): string[] {
  return [...children]
    .filter((c) => c.dashboardScope && c.dashboardScope !== LAUNCHPAD_SCOPE)
    .sort((a, b) =>
      dashboardChildLabel(a, tt).localeCompare(dashboardChildLabel(b, tt), undefined, { sensitivity: "base" }),
    )
    .map((c) => c.dashboardScope as string);
}

/**
 * Clones the nav tree and applies saved order + custom labels to the company "dashboard" group children.
 */
const LAUNCHPAD_SCOPE = "launchpad";

function isPinnedDashboardChild(child: NavItem): boolean {
  const scope = child.dashboardScope ?? "";
  return !scope || scope === LAUNCHPAD_SCOPE;
}

export function applyDashboardPrefsToNav(
  items: NavItem[],
  prefs: DashboardSidebarPrefs,
  tt: (key: string) => string,
): NavItem[] {
  return items.map((item) => {
    if (item.name !== "dashboard" || !item.children?.length) return item;

    const children = item.children.map((c) => ({ ...c }));
    const order = prefs.order;
    const labels = prefs.labels ?? {};

    const pinned = children.filter(isPinnedDashboardChild);
    const scoped = children.filter((c) => c.dashboardScope && !isPinnedDashboardChild(c));

    let orderedScoped = scoped;
    if (order?.length) {
      const map = new Map(scoped.map((c) => [c.dashboardScope as string, c] as const));
      const next: NavItem[] = [];
      for (const scope of order) {
        if (scope === LAUNCHPAD_SCOPE) continue;
        const ch = map.get(scope);
        if (ch) {
          next.push(ch);
          map.delete(scope);
        }
      }
      for (const ch of scoped) {
        const sc = ch.dashboardScope as string;
        if (map.has(sc)) next.push(ch);
      }
      orderedScoped = next;
    }

    const ordered = [...pinned, ...orderedScoped];

    return {
      ...item,
      children: ordered.map((c) => {
        const sc = c.dashboardScope;
        if (!sc) return { ...c };
        const custom = labels[sc]?.trim();
        if (!custom) return { ...c };
        return { ...c, displayTitle: custom };
      }),
    };
  });
}
