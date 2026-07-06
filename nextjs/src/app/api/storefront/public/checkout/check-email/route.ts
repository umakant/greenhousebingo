import { NextRequest, NextResponse } from "next/server";

import { checkStorefrontCustomerEmailForCheckout } from "@/lib/storefront/storefront-customer-email-check";
import { getPublicStorefrontContextFromHost } from "@/lib/storefront/public-host-context";

export const dynamic = "force-dynamic";

/** Validate whether checkout email can be used for storefront customer account creation. */
export async function POST(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const ctx = await getPublicStorefrontContextFromHost(host);
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Store not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const email = body?.email != null ? String(body.email) : "";
  if (!email.trim()) {
    return NextResponse.json({ ok: false, message: "Email is required." }, { status: 400 });
  }

  const result = await checkStorefrontCustomerEmailForCheckout({
    email,
    websiteId: ctx.websiteId,
    organizationId: ctx.organizationId,
  });

  return NextResponse.json({
    ok: result.ok,
    allowedForSignup: result.allowedForSignup,
    existingCustomer: result.existingCustomer,
    message: result.message,
  });
}
