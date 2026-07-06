import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { hasAccountPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { syncCustomerPortalRolesForCompany } from "@/lib/account-customer-role";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: {
  id: bigint;
  type: string | null;
  createdBy: bigint | null;
}): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.id;
}

/** Re-sync client role + expense portal permissions for all customers under the company. */
export async function POST(req: NextRequest) {
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const perms = await getPermissionsFromRequest(req);
  if (!hasAccountPermission(perms, "manage-customers")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = getCompanyId(actor);
  const synced = await syncCustomerPortalRolesForCompany(companyId);

  return NextResponse.json({
    ok: true,
    synced,
    message: `Portal access updated for ${synced} customer login(s).`,
  });
}
