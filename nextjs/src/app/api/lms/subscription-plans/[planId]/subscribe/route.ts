import { NextRequest, NextResponse } from "next/server";

import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { getLmsSubscriptionPlan } from "@/lib/lms-subscription-plan-service";
import { serializeLmsStudentSubscription } from "@/lib/lms-subscription-serialize";
import {
  planPriceForPeriod,
  subscribeStudentToLmsPlan,
  type LmsBillingPeriodInput,
} from "@/lib/lms-student-subscription-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/lms/subscription-plans/[planId]/subscribe
 * Learner subscribes to a bundle plan (free assigns immediately; paid POS returns checkout info).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ planId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { planId: planIdStr } = await ctx.params;
  const planId = parseLmsBigIntId(planIdStr);
  if (planId == null) {
    return NextResponse.json({ ok: false, message: "Invalid plan id." }, { status: 400 });
  }

  let body: { pricingPeriod?: string } = {};
  try {
    body = (await req.json().catch(() => ({}))) as { pricingPeriod?: string };
  } catch {
    /* optional */
  }
  const billingPeriod: LmsBillingPeriodInput = body.pricingPeriod === "yearly" ? "yearly" : "monthly";

  const plan = await getLmsSubscriptionPlan(actor.organizationId, planId);
  if (!plan || !plan.status) {
    return NextResponse.json({ ok: false, message: "Plan not found." }, { status: 404 });
  }

  const price = planPriceForPeriod(plan, billingPeriod);
  const linked = plan.linkedPosProduct;

  if (!plan.freePlan && plan.linkedPosProductId != null && price > 0) {
    return NextResponse.json({
      ok: true,
      requiresCheckout: true,
      checkout: {
        productId: plan.linkedPosProductId.toString(),
        planId: plan.id.toString(),
        billingPeriod,
        price,
        shopProductUrl: linked?.slug?.trim()
          ? `/shop/products/${encodeURIComponent(linked.slug.trim())}`
          : null,
        shopCartUrl: "/shop/cart",
      },
    });
  }

  try {
    const sub = await subscribeStudentToLmsPlan({
      organizationId: actor.organizationId,
      planId,
      studentUserId: actor.userId,
      billingPeriod,
    });
    if (!sub) {
      return NextResponse.json({ ok: false, message: "Subscription failed." }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      subscription: serializeLmsStudentSubscription(sub),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not subscribe.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
