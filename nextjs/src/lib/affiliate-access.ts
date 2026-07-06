import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getActivatedPackagesForUser } from "@/lib/addons-server";
import { affiliateTenantActorFromRequest } from "@/lib/affiliate-tenant-context";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

export function canManageAffiliateSection(perms: string[], section: string): boolean {
  if (perms.includes("*")) return true;
  if (hasPermission(perms, "manage-affiliate-business")) return true;
  return hasPermission(perms, section);
}

export async function requireAffiliateApiAccess(
  req: NextRequest,
  sectionPermission: string,
): Promise<
  | { ok: true; actor: { userId: bigint; organizationId: bigint }; perms: string[] }
  | { ok: false; response: NextResponse }
> {
  const actor = await affiliateTenantActorFromRequest(req);
  if (!actor) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 }) };
  }

  const perms = await getPermissionsFromRequest(req);
  if (!canManageAffiliateSection(perms, sectionPermission)) {
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
  if (!activated.map((p) => p.toLowerCase()).includes("affiliatebusiness")) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, message: "Affiliate Business add-on is not enabled." }, { status: 403 }),
    };
  }

  return { ok: true, actor, perms };
}

export function decimalToNumber(v: { toString(): string } | null | undefined): number {
  if (v == null) return 0;
  const n = Number(v.toString());
  return Number.isFinite(n) ? n : 0;
}
