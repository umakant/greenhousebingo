import { NextRequest, NextResponse } from "next/server";

import {
  isEventFinancialsLocked,
  updateEventExpense,
} from "@/lib/event-platform/event-financials/event-financials-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; expenseId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.update");
  if (isEventPlatformApiError(actor)) return actor;

  const { id, expenseId } = await ctx.params;
  const eventId = BigInt(id);

  if (await isEventFinancialsLocked(actor.organizationId, eventId)) {
    return NextResponse.json({ ok: false, message: "Financials are locked." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const ok = await updateEventExpense({
    organizationId: actor.organizationId,
    eventId,
    expenseId: BigInt(expenseId),
    actorUserId: actor.userId,
    data: body ?? {},
  });

  if (!ok) {
    return NextResponse.json({ ok: false, message: "Expense not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
