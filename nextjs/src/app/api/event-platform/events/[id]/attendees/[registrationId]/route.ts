import { NextRequest, NextResponse } from "next/server";

import {
  refundAttendee,
  resendAttendeeTicket,
} from "@/lib/event-platform/attendees/attendee-actions-service";
import { getEventAttendeeDetail } from "@/lib/event-platform/attendees/event-attendees-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; registrationId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.view");
  if (isEventPlatformApiError(actor)) return actor;

  const { id, registrationId } = await ctx.params;
  try {
    const detail = await getEventAttendeeDetail(actor.organizationId, id, registrationId);
    if (!detail) {
      return NextResponse.json({ ok: false, message: "Attendee not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, detail });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not load attendee.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "bookings.manage");
  if (isEventPlatformApiError(actor)) return actor;

  const { id, registrationId } = await ctx.params;
  let eventId: bigint;
  let regId: bigint;
  try {
    eventId = BigInt(id);
    regId = BigInt(registrationId);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid identifiers." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = body?.action as string | undefined;
  if (!action) {
    return NextResponse.json({ ok: false, message: "Action required." }, { status: 400 });
  }

  try {
    if (action === "resend_ticket") {
      const result = await resendAttendeeTicket({
        organizationId: actor.organizationId,
        eventId,
        actorUserId: actor.userId,
        registrationId: regId,
        channel: typeof body?.channel === "string" ? (body.channel as string) : undefined,
      });
      return NextResponse.json({
        ok: true,
        message: `Ticket re-sent to ${result.email}.`,
        data: result,
      });
    }

    if (action === "refund") {
      const result = await refundAttendee({
        organizationId: actor.organizationId,
        eventId,
        actorUserId: actor.userId,
        registrationId: regId,
        amount: typeof body?.amount === "number" ? (body.amount as number) : null,
        reason: typeof body?.reason === "string" ? (body.reason as string) : null,
      });
      return NextResponse.json({
        ok: true,
        message: `Refunded ${result.amount.toFixed(2)} ${result.currency}.`,
        data: result,
      });
    }

    return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Action failed.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
