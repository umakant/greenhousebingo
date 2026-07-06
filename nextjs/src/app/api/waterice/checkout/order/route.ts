import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { markStorefrontOrderPaid } from "@/lib/storefront/checkout-order-service";
import { sendWelcomeEmail } from "@/lib/send-welcome-email";
import { sanitizeItems, computeTotal, PRINT_FORMAT } from "@/lib/waterice/checkout-pricing";
import { resolveWaterIceStripe } from "@/lib/waterice/waterice-stripe";
import { findOrCreateWaterIceCustomerWithLogin } from "@/lib/waterice/waterice-customer";
import { createWaterIceOrder } from "@/lib/waterice/waterice-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CustomerInput = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  address?: unknown;
  city?: unknown;
  state?: unknown;
  zip?: unknown;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: NextRequest) {
  let body: {
    items?: unknown;
    promoApplied?: unknown;
    customer?: CustomerInput;
    paymentIntentId?: unknown;
    mock?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const items = sanitizeItems(body.items);
  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: "Cart is empty" }, { status: 400 });
  }

  const customer = body.customer ?? {};
  const firstName = str(customer.firstName);
  const lastName = str(customer.lastName);
  const email = str(customer.email).toLowerCase();
  const phone = str(customer.phone);
  if (!firstName || !email) {
    return NextResponse.json(
      { ok: false, error: "First name and email are required." },
      { status: 400 },
    );
  }

  const promoApplied = body.promoApplied === true;
  const totals = computeTotal(items, promoApplied);
  const amountCents = Math.round(totals.total * 100);
  const paymentIntentId = str(body.paymentIntentId);

  // Resolve tenant + Stripe credentials (storefront → platform → env).
  const cfg = await resolveWaterIceStripe(req.headers.get("host"));
  if (!cfg) {
    return NextResponse.json(
      { ok: false, error: "Storefront not configured for this site." },
      { status: 500 },
    );
  }
  const ctx = cfg;
  const stripeEnabled = cfg.enabled;
  const secretKey = cfg.secretKey;

  // Authoritatively confirm the payment before recording the order.
  let paymentMode: "stripe" | "mock";
  if (paymentIntentId) {
    if (!stripeEnabled || !secretKey) {
      return NextResponse.json(
        { ok: false, error: "Card payments are not enabled." },
        { status: 400 },
      );
    }
    try {
      const stripe = new Stripe(secretKey, { typescript: true });
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (pi.status !== "succeeded") {
        return NextResponse.json(
          { ok: false, error: "Payment has not completed." },
          { status: 402 },
        );
      }
      if (pi.metadata?.source !== "waterice") {
        return NextResponse.json({ ok: false, error: "Payment mismatch." }, { status: 400 });
      }
      if (typeof pi.amount === "number" && pi.amount !== amountCents) {
        return NextResponse.json(
          { ok: false, error: "Order total does not match the payment." },
          { status: 400 },
        );
      }
      paymentMode = "stripe";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not verify payment.";
      return NextResponse.json({ ok: false, error: message }, { status: 502 });
    }
  } else {
    // No PaymentIntent: only allowed when Stripe is off (the mock fallback flow).
    if (stripeEnabled && secretKey) {
      return NextResponse.json({ ok: false, error: "Payment required." }, { status: 402 });
    }
    paymentMode = "mock";
  }

  // Build address JSON (shipping fields only collected for printed copies).
  const hasPrint = items.some((i) => i.format === PRINT_FORMAT);
  const fullName = `${firstName} ${lastName}`.trim();
  const addressJson: Prisma.InputJsonValue | null = hasPrint
    ? {
        name: fullName,
        address_line_1: str(customer.address),
        city: str(customer.city),
        state: str(customer.state),
        zip_code: str(customer.zip),
        country: "US",
        email,
        phone,
      }
    : { name: fullName, email, phone, country: "US" };

  try {
    const cust = await findOrCreateWaterIceCustomerWithLogin({
      organizationId: ctx.organizationId,
      firstName,
      lastName,
      email,
      phone,
      shippingAddress: addressJson,
    });

    const order = await createWaterIceOrder({
      organizationId: ctx.organizationId,
      websiteId: ctx.websiteId,
      crmCustomerId: cust.customerId,
      customerEmail: email,
      customerName: fullName || null,
      items,
      totals,
      shippingAddress: addressJson,
      billingAddress: addressJson,
    });

    // Mark the order paid. Stripe is authoritative; mock is best-effort (test).
    if (paymentMode === "stripe") {
      await markStorefrontOrderPaid({
        orderId: order.id,
        organizationId: ctx.organizationId,
        paymentSource: "stripe",
        stripePaymentIntentId: paymentIntentId,
      });
      // Tag the PaymentIntent with the order so the webhook backstop can reconcile.
      try {
        const stripe = new Stripe(secretKey, { typescript: true });
        await stripe.paymentIntents.update(paymentIntentId, {
          metadata: {
            source: "waterice",
            orderId: order.id.toString(),
            organizationId: ctx.organizationId.toString(),
          },
        });
      } catch {
        /* metadata tagging is best-effort */
      }
    } else {
      try {
        await markStorefrontOrderPaid({
          orderId: order.id,
          organizationId: ctx.organizationId,
          paymentSource: "test",
        });
      } catch {
        // Test payments are blocked in production — leave the order pending_payment.
      }
    }

    // Email new portal logins their credentials (best-effort).
    if (cust.plainPassword) {
      try {
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
        const companyRow = await prisma.user.findUnique({
          where: { id: ctx.organizationId },
          select: { name: true },
        });
        await sendWelcomeEmail({
          to: email,
          name: fullName || email,
          email,
          password: cust.plainPassword,
          appUrl: appUrl || undefined,
          companyName: companyRow?.name?.trim() || undefined,
          companyId: ctx.organizationId,
        });
      } catch (e) {
        console.warn("[waterice/checkout/order] welcome email failed:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id.toString(),
      orderNumber: order.orderNumber,
      accountCreated: cust.createdCustomer,
    });
  } catch (err) {
    console.error("[POST /api/waterice/checkout/order]", err);
    const message = err instanceof Error ? err.message : "Could not complete the order.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
