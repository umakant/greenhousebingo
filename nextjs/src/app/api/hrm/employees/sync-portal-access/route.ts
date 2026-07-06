import { NextResponse, type NextRequest } from "next/server";

import {
  getHrmActor,
  getCompanyId,
  checkPerm,
  forbidden,
  unauthorized,
} from "@/lib/hrm-auth";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { syncEmployeePortalRolesForCompany } from "@/lib/hrm-employee-role";
import { provisionAllEmployeePortalAccessForCompany } from "@/lib/hrm-create-employee-portal-user";

/** Create missing portal logins and re-sync staff (Employee) role + permissions. */
export async function POST(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (!checkPerm(perms, "manage-employees", "manage-hrm")) {
    return forbidden();
  }

  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();

  const companyId = getCompanyId(actor);
  const provisioned = await provisionAllEmployeePortalAccessForCompany(companyId);
  const synced = await syncEmployeePortalRolesForCompany(companyId);

  const parts = [
    provisioned.created > 0 ? `${provisioned.created} new login(s) created` : null,
    provisioned.linked > 0 ? `${provisioned.linked} existing login(s) linked` : null,
    provisioned.refreshed > 0 ? `${provisioned.refreshed} login(s) refreshed` : null,
    `${synced} role sync(s)`,
  ].filter(Boolean);

  return NextResponse.json({
    ok: true,
    synced,
    provisioned,
    message: `Portal access: ${parts.join(", ")}.`,
    errors: provisioned.errors.length ? provisioned.errors.slice(0, 10) : undefined,
  });
}
