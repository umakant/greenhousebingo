/**
 * Stable id for scoping dashboard sidebar prefs (order + labels) per company tenant.
 * Aligns with tenant resolution used for media and POS (`createdBy` / `creatorId` for staff).
 */
export function resolveDashboardSidebarTenantId(user: {
  id: bigint | number | string;
  type: string | null | undefined;
  createdBy?: bigint | number | string | null;
  creatorId?: bigint | number | string | null;
}): string {
  const t = (user.type ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (t === "superadmin") return "superadmin";
  if (t === "company") return String(user.id);
  const owner = user.createdBy ?? user.creatorId;
  if (owner != null && String(owner).length > 0) return String(owner);
  return String(user.id);
}
