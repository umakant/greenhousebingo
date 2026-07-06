import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.DISCOUNT_MANAGE });
    if (denied) return denied;
    const org = await requireStorefrontOrganization(req);
    if (!org.ok) return org.response;

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

    const rows = await prisma.storefrontDiscountRule.findMany({
      where: {
        organizationId: org.organizationId,
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      include: { codes: { orderBy: { id: "asc" } } },
      orderBy: { id: "desc" },
    });

    return NextResponse.json({
      ok: true,
      rules: rows.map((r) => ({
        id: r.id.toString(),
        websiteId: r.websiteId?.toString() ?? null,
        name: r.name,
        scope: r.scope,
        kind: r.kind,
        value: Number(r.value),
        startsAt: r.startsAt?.toISOString() ?? null,
        endsAt: r.endsAt?.toISOString() ?? null,
        maxUses: r.maxUses,
        perCustomerLimit: r.perCustomerLimit,
        productIds: r.productIds,
        isActive: r.isActive,
        codes: r.codes.map((c) => ({
          id: c.id.toString(),
          code: c.code,
          usesCount: c.usesCount,
        })),
      })),
    });
  } catch (e) {
    console.error("[storefront/discount-rules GET]", e);
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Failed to load discount rules." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.DISCOUNT_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ ok: false, message: "name is required" }, { status: 400 });
  }

  const kind = body.kind === "percent" || body.kind === "fixed" ? body.kind : "percent";
  const scope = body.scope === "line" ? "line" : "order";
  const value = Number(body.value);
  if (Number.isNaN(value) || value < 0) {
    return NextResponse.json({ ok: false, message: "Invalid value" }, { status: 400 });
  }

  let websiteId: bigint | null = null;
  if (body.websiteId != null && String(body.websiteId).trim() !== "") {
    try {
      websiteId = BigInt(String(body.websiteId));
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid websiteId" }, { status: 400 });
    }
  }

  const rule = await prisma.storefrontDiscountRule.create({
    data: {
      organizationId: org.organizationId,
      websiteId,
      name: body.name.trim(),
      scope,
      kind,
      value: new Prisma.Decimal(value),
      startsAt: body.startsAt != null ? new Date(String(body.startsAt)) : null,
      endsAt: body.endsAt != null ? new Date(String(body.endsAt)) : null,
      maxUses: body.maxUses != null ? Number(body.maxUses) : null,
      perCustomerLimit: body.perCustomerLimit != null ? Number(body.perCustomerLimit) : null,
      productIds: Array.isArray(body.productIds) ? body.productIds : undefined,
      isActive: body.isActive !== false,
    },
  });

  const initialCode =
    typeof body.initialCode === "string" && body.initialCode.trim()
      ? body.initialCode.trim().toUpperCase()
      : null;
  if (initialCode) {
    await prisma.storefrontDiscountCode.create({
      data: {
        organizationId: org.organizationId,
        ruleId: rule.id,
        code: initialCode,
      },
    });
  }

  return NextResponse.json({ ok: true, id: rule.id.toString() });
}
