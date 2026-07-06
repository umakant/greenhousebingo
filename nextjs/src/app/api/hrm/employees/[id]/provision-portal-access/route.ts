import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  getHrmActor,
  getCompanyId,
  checkPerm,
  forbidden,
  unauthorized,
  notFound,
  jsonR,
} from "@/lib/hrm-auth";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { provisionEmployeePortalAccess } from "@/lib/hrm-create-employee-portal-user";

export const dynamic = "force-dynamic";

/** Enable portal login + staff role for one employee. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = await getPermissionsFromRequest(req);
  if (!checkPerm(perms, "manage-hrm", "manage-employees", "edit-employees")) {
    return forbidden();
  }

  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();

  const { id } = await params;
  const companyId = getCompanyId(actor);
  const body = (await req.json().catch(() => ({}))) as { send_welcome_email?: boolean };

  const existing = await prisma.hrmEmployee.findFirst({
    where: { id: BigInt(id), createdBy: companyId },
    select: { id: true },
  });
  if (!existing) return notFound();

  const result = await provisionEmployeePortalAccess({
    employeeId: BigInt(id),
    companyId,
    sendWelcomeEmail: body.send_welcome_email !== false,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const message = result.alreadyHadLogin
    ? result.linkedExistingUser
      ? "Existing login linked to this employee."
      : "Portal permissions refreshed for this employee."
    : "Portal login created. Welcome email sent if SMTP is configured.";

  return jsonR({
    ok: true,
    user_id: result.userId.toString(),
    portal_password: result.plainPassword ?? undefined,
    already_had_login: result.alreadyHadLogin,
    linked_existing_user: result.linkedExistingUser,
    message,
  });
}
