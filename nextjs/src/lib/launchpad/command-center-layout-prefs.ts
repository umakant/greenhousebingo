export const COMMAND_CENTER_LAYOUT_PREFS_EVENT = "pf:command-center-layout-prefs";

export type CommandCenterMainBlockId =
  | "greeting"
  | "tasks-activity"
  | "pending-approvals"
  | "snapshots"
  | "compliance-notifications"
  | "shortcuts";

export type CommandCenterSidebarBlockId = "calendar" | "schedule" | "health-score";

export const DEFAULT_MAIN_BLOCK_ORDER: CommandCenterMainBlockId[] = [
  "greeting",
  "tasks-activity",
  "pending-approvals",
  "snapshots",
  "compliance-notifications",
  "shortcuts",
];

export const DEFAULT_SIDEBAR_BLOCK_ORDER: CommandCenterSidebarBlockId[] = [
  "calendar",
  "schedule",
  "health-score",
];

function mainStorageKey(tenantId: string): string {
  return `pf_command_center_main_blocks_v1_${encodeURIComponent(tenantId.trim() || "_")}`;
}

function sidebarStorageKey(tenantId: string): string {
  return `pf_command_center_sidebar_blocks_v1_${encodeURIComponent(tenantId.trim() || "_")}`;
}

function dispatchLayoutChanged(tenantId: string) {
  window.dispatchEvent(
    new CustomEvent(COMMAND_CENTER_LAYOUT_PREFS_EVENT, { detail: { tenantId } }),
  );
}

/** Keep saved order, drop missing ids, append newly available blocks at the end. */
export function mergeBlockOrder<T extends string>(
  saved: T[] | undefined,
  defaults: T[],
  available: Set<T>,
): T[] {
  const seen = new Set<T>();
  const next: T[] = [];

  for (const id of saved ?? defaults) {
    if (!available.has(id) || seen.has(id)) continue;
    next.push(id);
    seen.add(id);
  }

  for (const id of defaults) {
    if (!available.has(id) || seen.has(id)) continue;
    next.push(id);
    seen.add(id);
  }

  for (const id of available) {
    if (seen.has(id)) continue;
    next.push(id);
    seen.add(id);
  }

  return next;
}

export function loadMainBlockOrder(tenantId: string): CommandCenterMainBlockId[] | undefined {
  if (typeof window === "undefined" || !tenantId) return undefined;
  try {
    const raw = localStorage.getItem(mainStorageKey(tenantId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CommandCenterMainBlockId[];
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function saveMainBlockOrder(tenantId: string, order: CommandCenterMainBlockId[]) {
  if (typeof window === "undefined" || !tenantId) return;
  localStorage.setItem(mainStorageKey(tenantId), JSON.stringify(order));
  dispatchLayoutChanged(tenantId);
}

export function loadSidebarBlockOrder(tenantId: string): CommandCenterSidebarBlockId[] | undefined {
  if (typeof window === "undefined" || !tenantId) return undefined;
  try {
    const raw = localStorage.getItem(sidebarStorageKey(tenantId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CommandCenterSidebarBlockId[];
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function saveSidebarBlockOrder(tenantId: string, order: CommandCenterSidebarBlockId[]) {
  if (typeof window === "undefined" || !tenantId) return;
  localStorage.setItem(sidebarStorageKey(tenantId), JSON.stringify(order));
  dispatchLayoutChanged(tenantId);
}
