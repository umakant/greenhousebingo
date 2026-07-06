import { NextRequest, NextResponse } from "next/server";

import { getStorefrontCustomerFromRequest } from "@/lib/storefront-customer-api-guard";
import { createStorefrontCustomerSession } from "@/lib/storefront-customer-session";
import { completeStorefrontCustomerAccountForOrder } from "@/lib/storefront/storefront-customer-checkout-account";
import { getPublicStorefrontContextFromHost } from "@/lib/storefront/public-host-context";

export const dynamic = "force-dynamic";

/** After checkout payment: create/sign in storefront customer, link orders, set `sfc_session`. */
export async function POST(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const ctx = await getPublicStorefrontContextFromHost(host);
  if (!ctx) return NextResponse.json({ ok: false, message: "Store not found." }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const orderIdRaw = body?.orderId != null ? String(body.orderId) : "";
  const password = body?.password != null ? String(body.password) : undefined;
  const name = body?.name != null ? String(body.name).trim() || null : null;

  if (!orderIdRaw) {
    return NextResponse.json({ ok: false, message: "orderId is required." }, { status: 400 });
  }

  let orderId: bigint;
  try {
    orderId = BigInt(orderIdRaw);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid order." }, { status: 400 });
  }

  const existingSession = await getStorefrontCustomerFromRequest(req, ctx.websiteId);

  const result = await completeStorefrontCustomerAccountForOrder({
    organizationId: ctx.organizationId,
    websiteId: ctx.websiteId,
    orderId,
    password,
    name,
    sessionCustomerId: existingSession?.customerId ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
  }

  const res = NextResponse.json({
    ok: true,
    created: result.created,
    linkedOrders: result.linkedOrders,
    accountPath: `/storefront/account/w/${ctx.websiteId.toString()}/dashboard`,
  });

  const alreadyThisCustomer =
    existingSession != null && existingSession.customerId === result.customerId;

  if (!alreadyThisCustomer) {
    await createStorefrontCustomerSession(req, res, result.customerId);
  }

  return res;
}
