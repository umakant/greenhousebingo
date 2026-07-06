import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import {
  createInstructorPayoutDraft,
  updateInstructorPayoutStatus,
} from "@/lib/lms-instructor-commission-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function canManage(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-lms-analytics") ||
    hasPermission(perms, "manage-lms-instructors") ||
    hasPermission(perms, "manage-lms")
  );
}

export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManage(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const instructorProfileId = parseLmsBigIntId(req.nextUrl.searchParams.get("instructorProfileId") ?? undefined);

  const rows = await prisma.lmsInstructorPayout.findMany({
    where: {
      organizationId: actor.organizationId,
      ...(instructorProfileId != null ? { instructorProfileId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      instructorProfile: { select: { displayName: true, user: { select: { name: true } } } },
      _count: { select: { commissions: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    items: rows.map((p) => ({
      id: p.id.toString(),
      instructorProfileId: p.instructorProfileId.toString(),
      instructorName:
        p.instructorProfile.displayName?.trim() ||
        p.instructorProfile.user?.name?.trim() ||
        "Instructor",
      totalAmount: p.totalAmount.toString(),
      currency: p.currency,
      status: p.status,
      paidAt: p.paidAt?.toISOString() ?? null,
      notes: p.notes,
      commissionCount: p._count.commissions,
      accountingExpenseId: p.accountingExpenseId?.toString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}

/** POST — create draft payout from accrued commissions. */
export async function POST(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManage(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const instructorProfileId = parseLmsBigIntId(
    typeof body?.instructorProfileId === "string" ? body.instructorProfileId : null,
  );
  if (instructorProfileId == null) {
    return NextResponse.json({ ok: false, message: "instructorProfileId is required." }, { status: 400 });
  }

  const commissionIds = Array.isArray(body?.commissionIds)
    ? body.commissionIds
        .map((id) => parseLmsBigIntId(typeof id === "string" ? id : String(id)))
        .filter((id): id is bigint => id != null)
    : undefined;

  try {
    const payout = await createInstructorPayoutDraft({
      organizationId: actor.organizationId,
      instructorProfileId,
      commissionIds,
      notes: typeof body?.notes === "string" ? body.notes : null,
    });
    return NextResponse.json({
      ok: true,
      payout: {
        id: payout.id.toString(),
        totalAmount: payout.totalAmount.toString(),
        status: payout.status,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create payout.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}

/** PATCH via query ?payoutId= — update payout status (placeholder workflow). */
export async function PATCH(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManage(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const payoutId = parseLmsBigIntId(req.nextUrl.searchParams.get("payoutId") ?? undefined);
  if (payoutId == null) {
    return NextResponse.json({ ok: false, message: "payoutId query is required." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const status = body?.status;
  if (status !== "SCHEDULED" && status !== "PAID" && status !== "CANCELLED") {
    return NextResponse.json({ ok: false, message: "status must be SCHEDULED, PAID, or CANCELLED." }, { status: 400 });
  }

  try {
    await updateInstructorPayoutStatus({
      organizationId: actor.organizationId,
      payoutId,
      status,
      notes: typeof body?.notes === "string" ? body.notes : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
