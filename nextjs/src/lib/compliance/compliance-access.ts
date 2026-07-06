import { hasPermission } from "@/lib/authz";
import type { ComplianceRole } from "@/lib/compliance/compliance-day4";

export const COMPLIANCE_DASHBOARD_PERMISSIONS = [
  "manage-compliance",
  "manage-compliance-dashboard",
  "manage-compliance-frameworks",
  "manage-compliance-controls",
  "manage-compliance-evidence",
  "manage-compliance-policies",
  "manage-compliance-documents",
  "manage-compliance-monitors",
  "manage-compliance-risks",
  "manage-compliance-vendors",
  "manage-compliance-access-reviews",
  "manage-compliance-vulnerabilities",
  "manage-compliance-audits",
  "manage-compliance-trust-center",
  "manage-compliance-integrations",
  "manage-compliance-launchpad",
  "manage-compliance-reports",
  "manage-compliance-tasks",
  "manage-compliance-settings",
] as const;

export function hasAnyCompliancePermission(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return COMPLIANCE_DASHBOARD_PERMISSIONS.some((p) => hasPermission(perms, p));
}

export function canAccessComplianceDashboard(perms: string[], role?: string): boolean {
  if (perms.includes("*")) return true;
  if (role === "superadmin" || role === "super_admin") return true;
  return (
    hasPermission(perms, "manage-compliance-dashboard") ||
    hasPermission(perms, "manage-compliance") ||
    hasAnyCompliancePermission(perms)
  );
}

export function resolveComplianceRole(
  primaryRole: string,
  roles: string[],
  perms: string[] = [],
): ComplianceRole {
  if (perms.includes("*")) return "super_admin";
  if (roles.includes("superadmin") || roles.includes("super_admin") || primaryRole === "superadmin") {
    return "super_admin";
  }
  if (primaryRole === "company" || primaryRole === "company_admin") return "company_admin";
  if (hasPermission(perms, "manage-compliance") || primaryRole.includes("compliance")) return "compliance_manager";
  if (primaryRole === "auditor" || roles.includes("auditor")) return "auditor";
  if (primaryRole === "staff" || primaryRole === "employee" || roles.includes("staff")) return "employee";
  return "compliance_manager";
}

const AUDITOR_READ_ONLY_PATHS = [
  "/compliance",
  "/compliance/frameworks",
  "/compliance/controls",
  "/compliance/evidence",
  "/compliance/documents",
  "/compliance/audits",
];

const EMPLOYEE_ALLOWED_PATHS = ["/compliance", "/compliance/policies"];

export function complianceRoleMayAccessPath(
  path: string,
  role: ComplianceRole,
  perms: string[],
): boolean {
  if (role === "super_admin" || role === "company_admin" || role === "compliance_manager") {
    return canAccessComplianceDashboard(perms);
  }
  if (role === "auditor") {
    return AUDITOR_READ_ONLY_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  }
  if (role === "employee") {
    return EMPLOYEE_ALLOWED_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  }
  return false;
}

export function complianceRoleMayWriteSection(role: ComplianceRole, sectionPermission: string): boolean {
  if (role === "auditor" || role === "employee") return false;
  if (role === "super_admin" || role === "company_admin" || role === "compliance_manager") return true;
  return hasPermission([], sectionPermission);
}

export function userMayAccessComplianceRoute(path: string, perms: string[], role?: string): boolean {
  if (canAccessComplianceDashboard(perms, role)) return true;
  if (path.startsWith("/compliance/settings")) {
    return hasPermission(perms, "manage-compliance-settings");
  }
  return false;
}

export function sectionPermissionForPath(path: string): string | null {
  const section = path.replace(/^\/compliance\/?/, "").split("/")[0];
  const map: Record<string, string> = {
    frameworks: "manage-compliance-frameworks",
    controls: "manage-compliance-controls",
    evidence: "manage-compliance-evidence",
    policies: "manage-compliance-policies",
    documents: "manage-compliance-documents",
    monitors: "manage-compliance-monitors",
    risks: "manage-compliance-risks",
    vendors: "manage-compliance-vendors",
    "access-reviews": "manage-compliance-access-reviews",
    vulnerabilities: "manage-compliance-vulnerabilities",
    audits: "manage-compliance-audits",
    "trust-center": "manage-compliance-trust-center",
    integrations: "manage-compliance-integrations",
    launchpad: "manage-compliance-launchpad",
    reports: "manage-compliance-reports",
    tasks: "manage-compliance-tasks",
    settings: "manage-compliance-settings",
  };
  return map[section] ?? null;
}
