import { hasPermission } from "@/lib/authz";

/** Organization owner / company admin accounts (not staff or superadmin). */
export function isCompanyTenantAdminUser(userType: string | null | undefined): boolean {
  const t = (userType ?? "").trim().toLowerCase();
  return t === "company" || t === "company_admin";
}

/** HRM employee portal logins (users.type = staff, role name staff / label Employee). */
export function isEmployeePortalUser(userType: string | null | undefined): boolean {
  const t = (userType ?? "").trim().toLowerCase();
  return t === "staff";
}

export function canAccessLaunchpad(input: {
  role: string;
  roles: string[];
  userType: string | null | undefined;
  permissions: string[];
}): boolean {
  const role = input.role.trim().toLowerCase();
  const roles = input.roles.map((r) => r.trim().toLowerCase());
  if (role === "superadmin" || roles.includes("superadmin") || roles.includes("super_admin")) {
    return false;
  }
  const isStaff =
    isEmployeePortalUser(input.userType) || role === "staff" || roles.includes("staff");
  if (!isCompanyTenantAdminUser(input.userType) && !isStaff) return false;
  if (input.permissions.includes("*")) return true;
  return hasPermission(input.permissions, "manage-dashboard");
}
