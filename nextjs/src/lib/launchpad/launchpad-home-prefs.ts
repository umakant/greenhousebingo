/** Per-tenant browser preference: skip Launchpad as the default sign-in landing page. */
const STORAGE_PREFIX = "pf_launchpad_home_skip_v1_";

export const LAUNCHPAD_HOME_SKIPPED_EVENT = "pf:launchpad-home-skipped";

export type LaunchpadHomeSkippedEventDetail = { tenantId: string; skipped: boolean };

function storageKey(tenantId: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(tenantId.trim() || "_")}`;
}

export function isLaunchpadHomeSkipped(tenantId: string): boolean {
  if (typeof window === "undefined" || !tenantId.trim()) return false;
  try {
    return localStorage.getItem(storageKey(tenantId)) === "1";
  } catch {
    return false;
  }
}

export function setLaunchpadHomeSkipped(tenantId: string, skipped: boolean) {
  if (typeof window === "undefined" || !tenantId.trim()) return;
  try {
    const key = storageKey(tenantId);
    if (skipped) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(
    new CustomEvent<LaunchpadHomeSkippedEventDetail>(LAUNCHPAD_HOME_SKIPPED_EVENT, {
      detail: { tenantId, skipped },
    }),
  );
}
