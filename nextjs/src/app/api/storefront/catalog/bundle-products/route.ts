import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import {
  getBundleProductIdsForOrganization,
  setBundleProductIdsForOrganization,
  validateProductIdsForOrganization,
} from "@/lib/storefront/bundle-catalog";
import { logStorefrontAudit, STOREFRONT_AUDIT_EVENTS } from "@/lib/storefront/storefront-audit";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";

export const dynamic = "force-dynamic";

/** Ordered POS product ids configured for the storefront bundle builder section. */
export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.CATALOG_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const ids = await getBundleProductIdsForOrganization(org.organizationId);
  return NextResponse.json({ ok: true, productIds: ids });
}

/** Replace full bundle product id list (order preserved; duplicates dropped). */
export async function PUT(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.CATALOG_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const raw = body.productIds;
  const list = Array.isArray(raw) ? raw.map((x) => String(x ?? "").trim()).filter(Boolean) : [];

  const validated = await validateProductIdsForOrganization(org.organizationId, list);
  if (!validated.ok) {
    return NextResponse.json(
      { ok: false, message: "One or more products were not found for this company.", invalidIds: validated.invalid },
      { status: 400 },
    );
  }

  await setBundleProductIdsForOrganization(org.organizationId, validated.normalized);

  await logStorefrontAudit({
    organizationId: org.organizationId,
    eventType: STOREFRONT_AUDIT_EVENTS.SETTINGS_UPDATE,
    actorUserId: org.userId,
    resourceType: "bundle_products",
    resourceId: org.organizationId.toString(),
    message: "Storefront bundle product list updated",
    metadata: { count: validated.normalized.length, source: "catalog_admin" },
    saas: { ...saasActorFromRequest(req) },
  });

  const ids = await getBundleProductIdsForOrganization(org.organizationId);
  return NextResponse.json({ ok: true, productIds: ids });
}
