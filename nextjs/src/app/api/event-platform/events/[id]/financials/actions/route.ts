import { NextRequest, NextResponse } from "next/server";

import {
  approveEventExpense,
  createEventExpense,
  createEventRevenueEntry,
  isEventFinancialsLocked,
  markEventExpensePaid,
  setEventFinancialLock,
} from "@/lib/event-platform/event-financials/event-financials-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.update");
  if (isEventPlatformApiError(actor)) return actor;

  const { id } = await ctx.params;
  let eventId: bigint;
  try {
    eventId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid event." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = body?.action as string | undefined;

  if (await isEventFinancialsLocked(actor.organizationId, eventId)) {
    if (action !== "unlock") {
      return NextResponse.json({ ok: false, message: "Financials are locked." }, { status: 403 });
    }
  }

  try {
    if (action === "add_expense") {
      const { action: _a, ...expenseData } = body ?? {};
      const result = await createEventExpense({
        organizationId: actor.organizationId,
        eventId,
        actorUserId: actor.userId,
        data: expenseData as Parameters<typeof createEventExpense>[0]["data"],
      });
      if (!result) return NextResponse.json({ ok: false, message: "Could not add expense." }, { status: 400 });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "add_revenue") {
      const { action: _a, ...revenueData } = body ?? {};
      const result = await createEventRevenueEntry({
        organizationId: actor.organizationId,
        eventId,
        actorUserId: actor.userId,
        data: revenueData as Parameters<typeof createEventRevenueEntry>[0]["data"],
      });
      if (!result) return NextResponse.json({ ok: false, message: "Could not add revenue." }, { status: 400 });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "approve_expense" && body?.expenseId) {
      const ok = await approveEventExpense({
        organizationId: actor.organizationId,
        eventId,
        expenseId: BigInt(String(body.expenseId)),
        actorUserId: actor.userId,
      });
      return NextResponse.json({ ok });
    }

    if (action === "mark_paid" && body?.expenseId) {
      const ok = await markEventExpensePaid({
        organizationId: actor.organizationId,
        eventId,
        expenseId: BigInt(String(body.expenseId)),
        actorUserId: actor.userId,
      });
      return NextResponse.json({ ok });
    }

    if (action === "lock" || action === "unlock") {
      await setEventFinancialLock({
        organizationId: actor.organizationId,
        eventId,
        locked: action === "lock",
        actorUserId: actor.userId,
        notes: typeof body?.notes === "string" ? body.notes : null,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Action failed.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
