/** Mirror of `SYSTEM_PORTAL_ROLE_NAMES` — kept here so this module stays client-safe (no Prisma). */
const SYSTEM_PORTAL_ROLE_NAMES = new Set([
  "client",
  "staff",
  "vendor",
  "lms-student",
  "lms-instructor",
  "support-staff",
  "expense-supervisor",
  "expense-billing",
]);

function isSystemPortalRoleName(name: string | null | undefined): boolean {
  return SYSTEM_PORTAL_ROLE_NAMES.has((name ?? "").trim().toLowerCase());
}

export type RoleRowForAccess = {
  name: string;
  editable: boolean;
  createdBy: bigint | null;
};

/** Reserved role slugs — shared across tenants; only superadmin may edit permissions. */
export function isReservedPlatformRoleName(name: string | null | undefined): boolean {
  const n = (name ?? "").trim().toLowerCase();
  return isSystemPortalRoleName(n) || n === "superadmin" || n === "company";
}

/** Whether the actor may PATCH permissions / label on this role. */
export function roleCanEditForActor(
  role: RoleRowForAccess,
  isSuperadmin: boolean,
  companyId: bigint,
): boolean {
  if (isSuperadmin) return true;
  if (isReservedPlatformRoleName(role.name)) return false;
  if (!role.editable) return false;
  return role.createdBy != null && role.createdBy === companyId;
}

/** Whether the actor may DELETE this role row. */
export function roleCanDeleteForActor(
  role: RoleRowForAccess,
  isSuperadmin: boolean,
  companyId: bigint,
): boolean {
  if (isReservedPlatformRoleName(role.name)) return false;
  if (!role.editable) return false;
  if (role.createdBy == null || role.createdBy !== companyId) return false;
  return true;
}

export function roleReadOnlyHint(
  role: RoleRowForAccess,
  canEdit: boolean,
  isSuperadmin: boolean,
): string | null {
  if (canEdit) {
    if (isSuperadmin && isReservedPlatformRoleName(role.name)) {
      return "Platform role — permission changes apply to all organizations using this template.";
    }
    return null;
  }
  if (isSuperadmin) return null;
  if (isReservedPlatformRoleName(role.name)) {
    return "Shared system roles cannot be edited here. Use Create Role to define custom permissions for your team, then assign that role to users.";
  }
  if (!role.editable) return "This role is managed by the system and cannot be edited.";
  return "You can only edit roles created for your organization.";
}
