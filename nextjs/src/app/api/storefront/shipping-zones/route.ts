import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.SHIPPING_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const rows = await prisma.storefrontShippingZone.findMany({
    where: {
      organizationId: org.organizationId,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    include: { methods: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({
    ok: true,
    zones: rows.map((z) => ({
      id: z.id.toString(),
      websiteId: z.websiteId?.toString() ?? null,
      name: z.name,
      countries: z.countries,
      isActive: z.isActive,
      sortOrder: z.sortOrder,
      methods: z.methods.map((m) => ({
        id: m.id.toString(),
        name: m.name,
        methodKey: m.methodKey,
        flatRate: Number(m.flatRate),
        sortOrder: m.sortOrder,
        isActive: m.isActive,
      })),
    })),
  });
}

export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.SHIPPING_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ ok: false, message: "name is required" }, { status: 400 });
  }
  const countries = Array.isArray(body.countries) ? body.countries : [];
  if (countries.length === 0) {
    return NextResponse.json({ ok: false, message: "countries must be a non-empty array of ISO codes" }, { status: 400 });
  }

  let websiteId: bigint | null = null;
  if (body.websiteId != null && String(body.websiteId).trim() !== "") {
    try {
      websiteId = BigInt(String(body.websiteId));
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid websiteId" }, { status: 400 });
    }
  }

  const zone = await prisma.storefrontShippingZone.create({
    data: {
      organizationId: org.organizationId,
      websiteId,
      name: body.name.trim(),
      countries: countries as Prisma.InputJsonValue,
      isActive: body.isActive !== false,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) : 0,
    },
  });

  return NextResponse.json({ ok: true, id: zone.id.toString() });
}
