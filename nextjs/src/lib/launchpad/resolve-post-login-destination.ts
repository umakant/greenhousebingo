import { isLaunchpadHomeSkipped } from "@/lib/launchpad/launchpad-home-prefs";

export const DEFAULT_COMPANY_LOGIN_HOME = "/launchpad";
export const LAUNCHPAD_SKIPPED_LOGIN_HOME = "/dashboard";

export function applyLaunchpadHomePreference(
  home: string,
  tenantId: string | null | undefined,
): string {
  const path = (home || DEFAULT_COMPANY_LOGIN_HOME).trim();
  if (!tenantId?.trim()) return path;
  if (isLaunchpadHomeSkipped(tenantId) && path === "/launchpad") {
    return LAUNCHPAD_SKIPPED_LOGIN_HOME;
  }
  return path;
}

export async function fetchDashboardSidebarTenantId(): Promise<string | null> {
  try {
    const r = await fetch("/api/auth/me", { credentials: "same-origin" });
    const j = (await r.json()) as { dashboardSidebarTenantId?: string | null };
    const tid =
      typeof j.dashboardSidebarTenantId === "string" ? j.dashboardSidebarTenantId.trim() : "";
    return tid || null;
  } catch {
    return null;
  }
}

export async function resolvePostLoginDestination(
  home: string | null | undefined,
  fallback = DEFAULT_COMPANY_LOGIN_HOME,
): Promise<string> {
  const tenantId = await fetchDashboardSidebarTenantId();
  return applyLaunchpadHomePreference(home ?? fallback, tenantId);
}

/** Apply Launchpad skip preference to a full redirect URL from impersonation APIs. */
export async function resolveImpersonationRedirect(redirectUrl: string): Promise<string> {
  try {
    const u = new URL(redirectUrl, window.location.origin);
    const tenantId = await fetchDashboardSidebarTenantId();
    const path = applyLaunchpadHomePreference(u.pathname, tenantId);
    u.pathname = path;
    return u.toString();
  } catch {
    return redirectUrl;
  }
}
