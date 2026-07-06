import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { loadStorefrontActorUser, resolveStorefrontOrganizationId } from "@/lib/storefront/org-resolution";
import { STOREFRONT_GRANULAR_PERMISSIONS, STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";
import { resolveWaterIceStoreOrgId, WATERICE_STORE_ORG_NAME } from "@/lib/waterice/waterice-store-org";

export const dynamic = "force-dynamic";

type OrgOption = { id: string; name: string };

/**
 * Same organization list as settings-context, gated with common storefront permissions so
 * Themes, Analytics, Settings, and other merchant UIs can resolve `organizationId` for superadmins.
 */
export async function GET(req: NextRequest) {
  /** Any granular Storefront permission (or legacy full/settings) so catalog-only staff can load org picker on Products, etc. */
  const denied = await assertStorefrontApiAccess(req, {
    permission: [
      ...STOREFRONT_GRANULAR_PERMISSIONS,
      STOREFRONT_PERMISSION.LEGACY_MANAGE,
      STOREFRONT_PERMISSION.LEGACY_SETTINGS,
    ],
  });
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
    const companyOrgs: OrgOption[] = rows.map((r) => ({
      id: r.id.toString(),
      name: (r.name ?? "").trim() || `Company #${r.id}`,
    }));

    // The superadmin-owned Water Ice Express store org is hidden from the Companies
    // list (its type is not company), so inject it explicitly and make it the default
    // selection. The superadmin Store then manages its own catalog/orders, separate
    // from any company; companies remain switchable.
    const storeOrgId = await resolveWaterIceStoreOrgId();
    const storeOption: OrgOption | null =
      storeOrgId != null ? { id: storeOrgId.toString(), name: WATERICE_STORE_ORG_NAME } : null;

    const organizations: OrgOption[] = storeOption
      ? [storeOption, ...companyOrgs.filter((o) => o.id !== storeOption.id)]
      : companyOrgs;
    const defaultOrganizationId = storeOption?.id ?? organizations[0]?.id ?? null;

    return NextResponse.json({
      ok: true,
      isSuperadmin: true,
      organizations,
      defaultOrganizationId,
    });
  }

  return NextResponse.json({ ok: false, message: "No organization context." }, { status: 400 });
}
