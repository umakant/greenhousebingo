import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.ORDER_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { searchParams } = new URL(req.url);
  const take = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50")));
  const q = searchParams.get("q")?.trim() ?? "";

  const rows = await prisma.storefrontOrder.findMany({
    where: {
      organizationId: org.organizationId,
      source: { in: ["storefront", "waterice"] },
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" } },
              { customerEmail: { contains: q, mode: "insensitive" } },
              { customerName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      lines: { take: 5 },
      events: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });

  return NextResponse.json({
    ok: true,
    orders: rows.map((o) => ({
      id: o.id.toString(),
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      fulfillmentStatus: o.fulfillmentStatus,
      total: Number(o.total),
      currency: o.currency,
      customerEmail: o.customerEmail,
      customerName: o.customerName,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
      lineCount: o.lines.length,
      recentEvents: o.events.map((e) => ({
        kind: e.kind,
        message: e.message,
        createdAt: e.createdAt.toISOString(),
      })),
    })),
  });
}
