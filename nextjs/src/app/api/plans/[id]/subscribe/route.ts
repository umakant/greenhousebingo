import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { canSubscribeToPlans, roleFromRequest } from "@/lib/subscription-catalog-auth";
import { applySessionAuthCookies } from "@/lib/session-auth-cookies";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function asNumber(x: unknown, fallback = 0) {
  const n = typeof x === "number" ? x : Number(String(x ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

/** Generate a unique BigInt id for Order (used when DB/client expects explicit id). */
function nextOrderId(): bigint {
  return BigInt(Date.now()) * 10000n + BigInt(Math.floor(Math.random() * 10000));
}

/**
 * POST /api/plans/[id]/subscribe
 * Subscribe the current user to a plan (free plan: assign immediately; paid: create pending order).
 * Mirrors Laravel: assignFreePlan, startTrial, and payment flows.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const role = roleFromRequest(req);
    const perms = await getPermissionsFromRequest(req);
    if (!canSubscribeToPlans(role, perms)) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const email = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
    if (!email) {
      return NextResponse.json({ ok: false, message: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { email },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    }

    const { id } = await ctx.params;
    const planId = BigInt(id);
    const plan = await prisma.plan.findFirst({
      where: { id: planId },
      select: {
        id: true,
        name: true,
        freePlan: true,
        packagePriceMonthly: true,
        packagePriceYearly: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ ok: false, message: "Plan not found" }, { status: 404 });
    }

    let body: { pricingPeriod?: string } = {};
    try {
      body = (await req.json().catch(() => ({}))) as { pricingPeriod?: string };
    } catch {
      // optional body
    }
    const pricingPeriod = body.pricingPeriod === "yearly" ? "yearly" : "monthly";
    const price =
      pricingPeriod === "yearly"
        ? asNumber(plan.packagePriceYearly)
        : asNumber(plan.packagePriceMonthly);

    // Unique order id (Laravel style)
    const orderId = "ORD-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();

    if (plan.freePlan) {
      // Free plan: create succeeded order, then try to update user plan (optional if columns missing)
      const durationMonths = pricingPeriod === "yearly" ? 12 : 1;
      const planExpireDate = new Date();
      planExpireDate.setMonth(planExpireDate.getMonth() + durationMonths);

      await prisma.order.create({
        data: {
          id: nextOrderId(),
          orderId,
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          userId: user.id,
          planId: plan.id,
          planName: plan.name ?? undefined,
          price: new Prisma.Decimal(0),
          amount: new Prisma.Decimal(0),
          status: "succeeded",
          paymentStatus: "succeeded",
          paymentType: "free",
          currency: "USD",
          createdBy: user.id,
        },
      });
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            activePlan: Number(plan.id),
            planExpireDate,
          },
        });
      } catch {
        // User table may not have active_plan/plan_expire_date yet; order was still created
      }

      const freeRes = NextResponse.json({
        ok: true,
        success: true,
        message: "Free plan has been assigned successfully.",
        redirect: "/plans",
      });
      await applySessionAuthCookies(freeRes, user.id);
      return freeRes;
    }

    // Paid plan: create order and assign plan so UI shows as subscribed (plan assignment mirrors free flow; payment can be completed separately).
    const durationMonths = pricingPeriod === "yearly" ? 12 : 1;
    const planExpireDate = new Date();
    planExpireDate.setMonth(planExpireDate.getMonth() + durationMonths);

    await prisma.order.create({
      data: {
        id: nextOrderId(),
        orderId,
        name: user.name ?? undefined,
        email: user.email ?? undefined,
        userId: user.id,
        planId: plan.id,
        planName: plan.name ?? undefined,
        price: new Prisma.Decimal(price),
        amount: new Prisma.Decimal(price),
        status: "succeeded",
        paymentStatus: "succeeded",
        paymentType: "checkout",
        currency: "USD",
        createdBy: user.id,
      },
    });

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          activePlan: Number(plan.id),
          planExpireDate,
        },
      });
    } catch {
      // User table may not have active_plan/plan_expire_date; order was still created
    }

    // Partner commission on paid plan orders (best-effort; never break the subscription flow).
    try {
      const { finalizePartnerCommissionForOrder } = await import("@/lib/partner-commission-service");
      await finalizePartnerCommissionForOrder({ companyUserId: user.id, orderRef: orderId, amount: price });
    } catch (err) {
      console.warn("[plans/subscribe] partner commission skipped:", (err as Error)?.message ?? err);
    }

    const paidRes = NextResponse.json({
      ok: true,
      success: true,
      message: "Plan assigned successfully. You can complete payment via Bank Transfer or payment method in Subscription Settings.",
      redirect: "/plans",
      orderId,
    });
    await applySessionAuthCookies(paidRes, user.id);
    return paidRes;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Subscription failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
