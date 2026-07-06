import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { prisma } from "@/lib/prisma";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";

export const dynamic = "force-dynamic";

type TimelineRow = {
  at: string;
  kind: string;
  title: string;
  detail: string | null;
  href: string | null;
};

/** Day 53 — merged merchant-visible timeline (orders + tickets + storefront events). */
export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.VIEW });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const take = Math.min(40, Math.max(10, parseInt(req.nextUrl.searchParams.get("take") ?? "25", 10) || 25));
  const oid = org.organizationId;

  try {
    const [orders, tickets, events] = await Promise.all([
      prisma.storefrontOrder.findMany({
        where: { organizationId: oid },
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
        },
      }),
      prisma.stTicket.findMany({
        where: { organizationId: oid },
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          ticketCode: true,
          subject: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.eventLog.findMany({
        where: { organizationId: oid },
        orderBy: { createdAt: "desc" },
        take,
        select: {
          eventType: true,
          message: true,
          resourceType: true,
          resourceId: true,
          createdAt: true,
        },
      }),
    ]);

    const rows: TimelineRow[] = [];

    for (const o of orders) {
      rows.push({
        at: o.createdAt.toISOString(),
        kind: "order",
        title: `Order ${o.orderNumber}`,
        detail: `${o.status} · ${Number(o.total)}`,
        href: "/storefront/orders",
      });
    }
    for (const t of tickets) {
      rows.push({
        at: t.createdAt.toISOString(),
        kind: "ticket",
        title: `Ticket ${t.ticketCode}`,
        detail: `${t.status} · ${t.subject}`,
        href: "/support-ticket/tickets",
      });
    }
    for (const e of events) {
      rows.push({
        at: e.createdAt.toISOString(),
        kind: "event",
        title: e.eventType,
        detail: e.message,
        href: "/storefront/analytics",
      });
    }

    rows.sort((a, b) => (a.at < b.at ? 1 : -1));

    return NextResponse.json({ ok: true, data: rows.slice(0, take) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load timeline";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
