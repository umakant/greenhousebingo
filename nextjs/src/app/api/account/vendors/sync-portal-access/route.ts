import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { hasAccountPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { syncVendorPortalAccessForCompany } from "@/lib/account-vendor-role";

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

/** Create or refresh vendor portal logins for all vendors with an email. */
export async function POST(req: NextRequest) {
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const perms = await getPermissionsFromRequest(req);
  if (!hasAccountPermission(perms, "manage-vendors")) {
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
  const { linked, created, skipped } = await syncVendorPortalAccessForCompany(companyId);

  return NextResponse.json({
    ok: true,
    linked,
    created,
    skipped,
    message:
      created > 0
        ? `Portal access enabled for ${linked} vendor(s) (${created} new login(s) created).`
        : `Portal access updated for ${linked} vendor login(s).`,
  });
}
