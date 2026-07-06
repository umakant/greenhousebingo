import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

export function companyRouteForbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/** Superadmin with manage-users — async decode supports compact permission cookies. */
export async function requireSuperadminManageUsers(req: NextRequest): Promise<boolean> {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return false;
  const perms = await getPermissionsFromRequest(req);
  return hasPermission(perms, "manage-users");
}

export function parseCompanyIdFromParam(id: string): bigint | null {
  const n = Number.parseInt(id, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return BigInt(n);
}

export async function verifyCompanyTenant(companyId: bigint) {
  return prisma.user.findFirst({
    where: { id: companyId, type: { in: ["company", "company_admin"] } },
    select: { id: true },
  });
}
