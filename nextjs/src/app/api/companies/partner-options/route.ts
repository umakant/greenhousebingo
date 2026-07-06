import { NextResponse, type NextRequest } from "next/server";

import { hasPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

export type CompanyPartnerOption = {
  id: string;
  name: string;
  brandName: string | null;
  referralCode: string | null;
};

/**
 * Partners for the Create Company form: referral partners plus brand-ownership partners
 * (Partnerships → Partners). Uses the same access as available-plans (manage-users).
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

  const [referralPartners, ownershipHolders] = await Promise.all([
    prisma.partner.findMany({
      where: { status: { in: ["active", "pending"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, brandName: true, referralCode: true },
    }),
    prisma.ownershipBrandHolder.findMany({
      where: {
        status: "active",
        isPrimaryBrandHolder: false,
      },
      include: { brand: { select: { name: true } } },
      orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  const byId = new Map<string, CompanyPartnerOption>();

  for (const p of referralPartners) {
    byId.set(p.id.toString(), {
      id: p.id.toString(),
      name: p.name,
      brandName: p.brandName,
      referralCode: p.referralCode,
    });
  }

  for (const h of ownershipHolders) {
    if (h.partnerId) {
      const key = h.partnerId.toString();
      if (!byId.has(key)) {
        byId.set(key, {
          id: key,
          name: h.name,
          brandName: h.brand.name,
          referralCode: h.referralCode,
        });
      }
      continue;
    }

    const key = `holder:${h.id.toString()}`;
    byId.set(key, {
      id: key,
      name: h.name,
      brandName: h.brand.name,
      referralCode: h.referralCode,
    });
  }

  const items = [...byId.values()].sort((a, b) => {
    const brandCmp = (a.brandName ?? "").localeCompare(b.brandName ?? "", undefined, { sensitivity: "base" });
    if (brandCmp !== 0) return brandCmp;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return NextResponse.json({ ok: true, items });
}
