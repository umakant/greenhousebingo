import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import {
  canReadSubscriptionCatalog,
  roleFromRequest,
} from "@/lib/subscription-catalog-auth";
import { t } from "@/lib/admin-t";
import {
  ensureAddOnVersionColumn,
  ensureAffiliateBusinessAddOnRow,
  ensureComplianceAddOnRow,
  ensureExpenseManagementAddOnRow,
} from "@/lib/ensure-add-on-db";


export async function GET(req: NextRequest) {
  const role = roleFromRequest(req);
  if (!role) return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const perms = await getPermissionsFromRequest(req);
  if (!canReadSubscriptionCatalog(role, perms)) {
    return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });
  }

  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const all = req.nextUrl.searchParams.get("all") === "1";
  const forAdminParam = (req.nextUrl.searchParams.get("for_admin") ?? "").trim().toLowerCase();
  const forAdmin =
    forAdminParam === "1" ? true : forAdminParam === "0" ? false : forAdminParam === "all" ? null : false;

  // Backward compatible defaults: only enabled + non-admin add-ons.
  const where: any = {};
  if (!all) where.isEnable = true;
  if (forAdmin !== null) where.forAdmin = forAdmin;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { module: { contains: search, mode: "insensitive" } },
      { packageName: { contains: search, mode: "insensitive" } },
    ];
  }

  await ensureAddOnVersionColumn(prisma);
  await ensureExpenseManagementAddOnRow(prisma);
  await ensureAffiliateBusinessAddOnRow(prisma);
  await ensureComplianceAddOnRow(prisma);

  const rows = await prisma.addOn.findMany({
    where,
    orderBy: [{ priority: "desc" }, { name: "asc" }],
    select: {
      module: true,
      name: true,
      image: true,
      monthlyPrice: true,
      yearlyPrice: true,
      isEnable: true,
      forAdmin: true,
      packageName: true,
    },
  });

  // Load `version` via raw SQL so this route works even if `@prisma/client` was not regenerated after adding `version` to the schema.
  const versionByModule = new Map<string, string>();
  try {
    const vrows = await prisma.$queryRaw<Array<{ module: string; version: string | null }>>`
      SELECT module, version FROM add_ons
    `;
    for (const r of vrows) {
      const v = (r.version ?? "1.0.0").trim();
      versionByModule.set(r.module, v || "1.0.0");
    }
  } catch (e) {
    console.error("[add-ons GET] could not read version column:", e);
  }

  return NextResponse.json({
    ok: true,
    items: rows.map((a) => ({
      module: a.module,
      alias: a.name,
      image: a.image || `/packages/workdo/${a.module}/favicon.png`,
      monthly_price: a.monthlyPrice?.toString?.() ?? String(a.monthlyPrice ?? "0"),
      yearly_price: a.yearlyPrice?.toString?.() ?? String(a.yearlyPrice ?? "0"),
      is_enable: a.isEnable,
      for_admin: a.forAdmin,
      package_name: a.packageName,
      version: versionByModule.get(a.module) ?? "1.0.0",
    })),
  });
}

