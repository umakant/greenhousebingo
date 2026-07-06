import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getActivatedPackagesForUser } from "@/lib/addons-server";
import { canAccessComplianceDashboard } from "@/lib/compliance/compliance-access";
import { complianceTenantActorFromRequest } from "@/lib/compliance/compliance-tenant-context";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

export function canManageComplianceSection(perms: string[], sectionPermission: string): boolean {
  if (perms.includes("*")) return true;
  if (hasPermission(perms, "manage-compliance")) return true;
  if (canAccessComplianceDashboard(perms)) return true;
  return hasPermission(perms, sectionPermission);
}

export async function requireComplianceApiAccess(
  req: NextRequest,
  sectionPermission: string,
): Promise<
  | {
      ok: true;
      actor: { userId: bigint; organizationId: bigint; name: string | null; email: string | null };
      perms: string[];
    }
  | { ok: false; response: NextResponse }
> {
  const actor = await complianceTenantActorFromRequest(req);
  if (!actor) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 }) };
  }

  const perms = await getPermissionsFromRequest(req);
  if (!canManageComplianceSection(perms, sectionPermission)) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 }) };
  }

  const rolesRaw = req.cookies.get("pf_roles")?.value ?? "[]";
  let roles: string[] = [];
  try {
    const parsed = JSON.parse(rolesRaw) as unknown;
    if (Array.isArray(parsed)) roles = parsed.filter((r): r is string => typeof r === "string");
  } catch {
    /* ignore */
  }
  const isSuper = roles.includes("superadmin") || roles.includes("super_admin");
  const activated = await getActivatedPackagesForUser(actor.userId, isSuper);
  if (!activated.map((p) => p.toLowerCase()).includes("compliance")) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, message: "Compliance add-on is not enabled." }, { status: 403 }),
    };
  }

  return { ok: true, actor, perms };
}
