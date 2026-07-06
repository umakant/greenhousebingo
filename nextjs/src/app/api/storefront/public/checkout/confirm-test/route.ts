import { NextRequest, NextResponse } from "next/server";

import { markStorefrontOrderPaidTest } from "@/lib/storefront/checkout-order-service";
import { getPublicStorefrontContextFromHost } from "@/lib/storefront/public-host-context";

export const dynamic = "force-dynamic";

/** Dev/test: mark a pending storefront order paid and decrement inventory (Day 28–29 stand-in when Stripe is not wired). */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_STOREFRONT_TEST_PAYMENT !== "1") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 403 });
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const ctx = await getPublicStorefrontContextFromHost(host);
  if (!ctx) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const orderId = body?.orderId != null ? String(body.orderId) : "";
  if (!orderId) return NextResponse.json({ ok: false, error: "orderId required" }, { status: 400 });

  let oid: bigint;
  try {
    oid = BigInt(orderId);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid order" }, { status: 400 });
  }

  try {
    const order = await markStorefrontOrderPaidTest(oid, ctx.organizationId);
    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }
    /** Prisma rows include BigInt — JSON cannot serialize them raw. */
    return NextResponse.json({
      ok: true,
      order: {
        id: order.id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: Number(order.total),
        currency: order.currency,
        paidAt: order.paidAt?.toISOString() ?? null,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
