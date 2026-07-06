import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX = 200;

export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.CUSTOMER_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const statusRaw = searchParams.get("status")?.trim().toLowerCase() ?? "";
  const statusWhere =
    statusRaw === "active" ? { status: "active" as const } : statusRaw === "suspended" ? { status: "suspended" as const } : {};

  let websiteIdFilter: bigint | undefined;
  const wid = searchParams.get("websiteId")?.trim() ?? "";
  if (wid && /^\d+$/.test(wid)) {
    try {
      websiteIdFilter = BigInt(wid);
    } catch {
      websiteIdFilter = undefined;
    }
  }

  const where: Prisma.StorefrontCustomerWhereInput = {
    organizationId: org.organizationId,
    ...statusWhere,
    ...(websiteIdFilter != null ? { websiteId: websiteIdFilter } : {}),
  };
  if (q) {
    const or: Prisma.StorefrontCustomerWhereInput[] = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
    if (q.length >= 2) {
      or.push({ phone: { contains: q, mode: "insensitive" } });
    }
    where.OR = or;
  }

  const rows = await prisma.storefrontCustomer.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      status: true,
      createdAt: true,
      emailVerifiedAt: true,
      websiteId: true,
      website: { select: { id: true, name: true } },
      _count: { select: { orders: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: MAX,
  });

  return NextResponse.json({
    ok: true,
    customers: rows.map((c) => ({
      id: c.id.toString(),
      email: c.email,
      name: c.name,
      phone: c.phone,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      emailVerifiedAt: c.emailVerifiedAt?.toISOString() ?? null,
      websiteId: c.websiteId.toString(),
      websiteName: c.website.name,
      orderCount: c._count.orders,
    })),
  });
}
