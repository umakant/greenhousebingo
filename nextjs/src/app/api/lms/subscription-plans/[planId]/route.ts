import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import {
  deleteLmsSubscriptionPlan,
  getLmsSubscriptionPlan,
  setLmsSubscriptionPlanCourses,
  updateLmsSubscriptionPlan,
} from "@/lib/lms-subscription-plan-service";
import { serializeLmsSubscriptionPlan } from "@/lib/lms-subscription-serialize";

export const dynamic = "force-dynamic";

function canManageSubscriptions(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-lms-subscriptions") ||
    hasPermission(perms, "manage-lms-courses") ||
    hasPermission(perms, "manage-lms")
  );
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ planId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const { planId: planIdStr } = await ctx.params;
  const planId = parseLmsBigIntId(planIdStr);
  if (planId == null) {
    return NextResponse.json({ ok: false, message: "Invalid plan id." }, { status: 400 });
  }

  const row = await getLmsSubscriptionPlan(actor.organizationId, planId);
  if (!row) {
    return NextResponse.json({ ok: false, message: "Plan not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, plan: serializeLmsSubscriptionPlan(row) });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ planId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageSubscriptions(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { planId: planIdStr } = await ctx.params;
  const planId = parseLmsBigIntId(planIdStr);
  if (planId == null) {
    return NextResponse.json({ ok: false, message: "Invalid plan id." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const linkedPosProductId =
    body.linkedPosProductId === null
      ? null
      : parseLmsBigIntId(typeof body.linkedPosProductId === "string" ? body.linkedPosProductId : null);

  try {
    if (Array.isArray(body.courseIds)) {
      const courseIds = body.courseIds
        .map((id) => parseLmsBigIntId(typeof id === "string" ? id : String(id)))
        .filter((id): id is bigint => id != null);
      await setLmsSubscriptionPlanCourses({
        organizationId: actor.organizationId,
        planId,
        courseIds,
      });
    }

    const row = await updateLmsSubscriptionPlan({
      organizationId: actor.organizationId,
      planId,
      data: {
        ...(typeof body.name === "string" ? { name: body.name } : {}),
        ...(body.description !== undefined
          ? { description: typeof body.description === "string" ? body.description : null }
          : {}),
        ...(body.status !== undefined ? { status: body.status !== false } : {}),
        ...(body.freePlan !== undefined ? { freePlan: body.freePlan === true } : {}),
        ...(body.packagePriceMonthly != null
          ? { packagePriceMonthly: Number(body.packagePriceMonthly) }
          : {}),
        ...(body.packagePriceYearly != null
          ? { packagePriceYearly: Number(body.packagePriceYearly) }
          : {}),
        ...(body.trial !== undefined ? { trial: body.trial === true } : {}),
        ...(body.trialDays != null ? { trialDays: Number(body.trialDays) } : {}),
        ...(body.linkedPosProductId !== undefined ? { linkedPosProductId } : {}),
      },
    });
    if (!row) {
      return NextResponse.json({ ok: false, message: "Plan not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, plan: serializeLmsSubscriptionPlan(row) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update plan.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ planId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageSubscriptions(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { planId: planIdStr } = await ctx.params;
  const planId = parseLmsBigIntId(planIdStr);
  if (planId == null) {
    return NextResponse.json({ ok: false, message: "Invalid plan id." }, { status: 400 });
  }

  const ok = await deleteLmsSubscriptionPlan(actor.organizationId, planId);
  if (!ok) {
    return NextResponse.json({ ok: false, message: "Plan not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
