import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { sortPlansForDisplay } from "@/lib/plan-display-order";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

/**
 * Plans for the Create Company form. Same access as listing/managing companies:
 * superadmin + (manage-users or create-users). Uses async permission decode for compact cookies.
 */
export async function GET(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (
    !hasPermission(perms, "manage-users") &&
    !hasPermission(perms, "create-users") &&
    !hasPermission(perms, "edit-users")
  ) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  let rows = await prisma.plan.findMany({
    where: { status: true, customPlan: false },
    orderBy: [{ freePlan: "desc" }, { id: "asc" }],
    select: { id: true, name: true, freePlan: true, packagePriceMonthly: true, packagePriceYearly: true },
  });

  if (rows.length === 0) {
    rows = await prisma.plan.findMany({
      where: { status: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true, freePlan: true, packagePriceMonthly: true, packagePriceYearly: true },
    });
  }

  return NextResponse.json({
    ok: true,
    items: sortPlansForDisplay(
      rows.map((p) => ({
        id: p.id.toString(),
        name: p.name?.trim() || `Plan ${p.id.toString()}`,
        freePlan: p.freePlan,
        packagePriceMonthly: p.packagePriceMonthly?.toString?.() ?? String(p.packagePriceMonthly ?? "0"),
        packagePriceYearly: p.packagePriceYearly?.toString?.() ?? String(p.packagePriceYearly ?? "0"),
      })),
    ),
  });
}
