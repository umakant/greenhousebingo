import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { loadStorefrontActorUser, resolveStorefrontOrganizationId } from "@/lib/storefront/org-resolution";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type OrgOption = { id: string; name: string };

/**
 * Lists organizations the current user can edit storefront settings for.
 * Superadmins must pick a company (no implicit tenant); tenant users get a single org.
 */
export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.SETTINGS_MANAGE });
  if (denied) return denied;

  const uidRaw = req.cookies.get("pf_user_id")?.value?.trim();
  if (!uidRaw) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  let userId: bigint;
  try {
    userId = BigInt(uidRaw);
  } catch {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const user = await loadStorefrontActorUser(userId);
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const t = (user.type ?? "").trim().toLowerCase();
  const isSuperadmin = t === "superadmin" || t === "super admin";

  const resolved = resolveStorefrontOrganizationId(user);
  if (!isSuperadmin && resolved != null) {
    const company = await prisma.user.findFirst({
      where: { id: resolved, type: { in: ["company", "company_admin"] } },
      select: { id: true, name: true },
    });
    const organizations: OrgOption[] = company
      ? [{ id: company.id.toString(), name: (company.name ?? "").trim() || `Company #${company.id}` }]
      : [];
    return NextResponse.json({
      ok: true,
      isSuperadmin: false,
      organizations,
      defaultOrganizationId: organizations[0]?.id ?? null,
    });
  }

  if (isSuperadmin) {
    const rows = await prisma.user.findMany({
      where: { type: { in: ["company", "company_admin"] } },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }],
      take: 500,
    });
    const organizations: OrgOption[] = rows.map((r) => ({
      id: r.id.toString(),
      name: (r.name ?? "").trim() || `Company #${r.id}`,
    }));
    return NextResponse.json({
      ok: true,
      isSuperadmin: true,
      organizations,
      defaultOrganizationId: organizations[0]?.id ?? null,
    });
  }

  return NextResponse.json({ ok: false, message: "No organization context." }, { status: 400 });
}
