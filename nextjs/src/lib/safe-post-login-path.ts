/**
 * Paths like /en/dashboards/crm or /en/dashboard match the [...path] placeholder, not real routes.
 * Never use them as post-login or ?next= destinations.
 */
const LOCALE_DASHBOARDS_PLACEHOLDER = /^\/[a-z]{2}(?:-[A-Za-z]{2})?\/dashboards(?:\/|$)/;
const LOCALE_DASHBOARD_PLACEHOLDER = /^\/[a-z]{2}(?:-[A-Za-z]{2})?\/dashboard(?:\/|$)/;

export function sanitizePostLoginPath(path: string): string {
  const trimmed = path.trim();
  const pathOnly = (trimmed.split("?")[0] ?? "").split("#")[0] ?? "";
  if (LOCALE_DASHBOARDS_PLACEHOLDER.test(pathOnly) || LOCALE_DASHBOARD_PLACEHOLDER.test(pathOnly)) {
    return "/dashboard";
  }
  return trimmed;
}
