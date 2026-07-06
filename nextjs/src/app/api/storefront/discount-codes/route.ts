import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.DISCOUNT_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const ruleId = body?.ruleId != null ? String(body.ruleId) : "";
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!ruleId || !code) {
    return NextResponse.json({ ok: false, message: "ruleId and code are required" }, { status: 400 });
  }

  let rid: bigint;
  try {
    rid = BigInt(ruleId);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid ruleId" }, { status: 400 });
  }

  const rule = await prisma.storefrontDiscountRule.findFirst({
    where: { id: rid, organizationId: org.organizationId },
  });
  if (!rule) return NextResponse.json({ ok: false, message: "Rule not found" }, { status: 404 });

  const row = await prisma.storefrontDiscountCode.create({
    data: {
      organizationId: org.organizationId,
      ruleId: rid,
      code,
    },
  });

  return NextResponse.json({ ok: true, id: row.id.toString() });
}
