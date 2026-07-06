import { NextRequest, NextResponse } from "next/server";

import { jsonSafe } from "@/lib/json-serialize";
import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { deleteDomain, updateDomain } from "@/lib/storefront/services/domain-service";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.WEBSITE_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let domainId: bigint;
  try {
    domainId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { status?: string; isPrimary?: boolean };
  try {
    const d = await updateDomain(
      org.organizationId,
      domainId,
      { status: body.status, isPrimary: body.isPrimary },
      org.userId,
      { ...saasActorFromRequest(req) },
    );
    return NextResponse.json(jsonSafe({ ok: true, data: { ...d, id: d.id.toString() } }));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.WEBSITE_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let domainId: bigint;
  try {
    domainId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const ok = await deleteDomain(org.organizationId, domainId, org.userId, { ...saasActorFromRequest(req) });
  if (!ok) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
