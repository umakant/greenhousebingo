import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.TAX_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const rows = await prisma.storefrontTaxRule.findMany({
    where: {
      organizationId: org.organizationId,
      ...(q
        ? {
            OR: [
              { country: { contains: q, mode: "insensitive" } },
              { region: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ country: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json({
    ok: true,
    rules: rows.map((r) => ({
      id: r.id.toString(),
      websiteId: r.websiteId?.toString() ?? null,
      country: r.country,
      region: r.region,
      ratePercent: Number(r.ratePercent),
      isActive: r.isActive,
      sortOrder: r.sortOrder,
    })),
  });
}

export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.TAX_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const country = typeof body?.country === "string" ? body.country.trim().toUpperCase().slice(0, 2) : "";
  const rate = body?.ratePercent != null ? Number(body.ratePercent) : NaN;
  if (!country || country.length !== 2 || Number.isNaN(rate) || rate < 0) {
    return NextResponse.json({ ok: false, message: "country (2-letter) and ratePercent required" }, { status: 400 });
  }

  let websiteId: bigint | null = null;
  if (body?.websiteId != null && String(body.websiteId).trim() !== "") {
    try {
      websiteId = BigInt(String(body.websiteId));
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid websiteId" }, { status: 400 });
    }
  }

  const region =
    body?.region != null && String(body.region).trim() !== "" ? String(body.region).trim().slice(0, 64) : null;

  const row = await prisma.storefrontTaxRule.create({
    data: {
      organizationId: org.organizationId,
      websiteId,
      country,
      region,
      ratePercent: new Prisma.Decimal(rate),
      isActive: body?.isActive !== false,
      sortOrder: body?.sortOrder != null ? Number(body.sortOrder) : 0,
    },
  });

  return NextResponse.json({ ok: true, id: row.id.toString() });
}
