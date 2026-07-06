import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.CUSTOMER_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let cid: bigint;
  try {
    cid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.storefrontCustomer.findFirst({
    where: { id: cid, organizationId: org.organizationId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });

  const status = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
  if (status !== "active" && status !== "suspended") {
    return NextResponse.json({ ok: false, message: "status must be active or suspended" }, { status: 400 });
  }

  await prisma.storefrontCustomer.update({
    where: { id: cid },
    data: { status },
  });

  return NextResponse.json({ ok: true });
}
