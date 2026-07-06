import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import {
  createLmsSubscriptionPlan,
  listActiveLmsSubscriptionPlansForLearner,
  listLmsSubscriptionPlans,
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

export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const catalog = req.nextUrl.searchParams.get("view")?.trim().toLowerCase() === "learner";
  if (catalog) {
    const rows = await listActiveLmsSubscriptionPlansForLearner(actor.organizationId);
    return NextResponse.json({
      ok: true,
      items: rows.map((r) => serializeLmsSubscriptionPlan(r)),
    });
  }

  const perms = await getPermissionsFromRequest(req);
  if (!canManageSubscriptions(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const rows = await listLmsSubscriptionPlans(actor.organizationId);
  return NextResponse.json({
    ok: true,
    items: rows.map((r) => serializeLmsSubscriptionPlan(r)),
  });
}

export async function POST(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageSubscriptions(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ ok: false, message: "Name is required." }, { status: 400 });
  }

  const courseIdsRaw = Array.isArray(body.courseIds) ? body.courseIds : [];
  const courseIds = courseIdsRaw
    .map((id) => parseLmsBigIntId(typeof id === "string" ? id : String(id)))
    .filter((id): id is bigint => id != null);

  const linkedPosProductId = parseLmsBigIntId(
    typeof body.linkedPosProductId === "string" ? body.linkedPosProductId : null,
  );

  try {
    const row = await createLmsSubscriptionPlan({
      organizationId: actor.organizationId,
      name,
      description: typeof body.description === "string" ? body.description : null,
      status: body.status !== false,
      freePlan: body.freePlan === true,
      packagePriceMonthly: Number(body.packagePriceMonthly ?? 0),
      packagePriceYearly: Number(body.packagePriceYearly ?? 0),
      trial: body.trial === true,
      trialDays: Number(body.trialDays ?? 0),
      linkedPosProductId: body.linkedPosProductId === null ? null : linkedPosProductId,
      courseIds,
    });
    if (!row) {
      return NextResponse.json({ ok: false, message: "Could not create plan." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, plan: serializeLmsSubscriptionPlan(row) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create plan.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
