export const COMMAND_CENTER_SHORTCUT_PREFS_EVENT = "pf:command-center-shortcut-prefs";

export type CommandCenterSubLink = {
  id: string;
  label: string;
  href: string;
};

export type CommandCenterShortcutDirectory = {
  id: string;
  label: string;
  /** Dashboard sidebar scope (e.g. project, hrm) when created from nav. */
  dashboardScope?: string;
  icon: string;
  colorClass: string;
  children: CommandCenterSubLink[];
};

function storageKey(tenantId: string): string {
  return `pf_command_center_shortcut_dirs_v1_${encodeURIComponent(tenantId.trim() || "_")}`;
}

export function loadCommandCenterShortcutDirs(tenantId: string): CommandCenterShortcutDirectory[] {
  if (typeof window === "undefined" || !tenantId) return [];
  try {
    const raw = localStorage.getItem(storageKey(tenantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CommandCenterShortcutDirectory[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((d) => d?.id && d?.label);
  } catch {
    return [];
  }
}

export function saveCommandCenterShortcutDirs(tenantId: string, dirs: CommandCenterShortcutDirectory[]) {
  if (typeof window === "undefined" || !tenantId) return;
  const key = storageKey(tenantId);
  if (!dirs.length) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(dirs));
  }
  window.dispatchEvent(
    new CustomEvent(COMMAND_CENTER_SHORTCUT_PREFS_EVENT, { detail: { tenantId } }),
  );
}

export function newShortcutId(): string {
  return `cc-dir-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
