import type { NextRequest } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

export function isGanttProjectAdmin(role: string | null | undefined, perms: string[]): boolean {
  if (role === "superadmin" || role === "company") return true;
  return perms.includes("*") || hasPermission(perms, "manage-project");
}

export async function resolveGanttProjectAdmin(req: NextRequest): Promise<boolean> {
  const perms = await getPermissionsFromRequest(req);
  const role = req.cookies.get("pf_role")?.value ?? null;
  return isGanttProjectAdmin(role, perms);
}
