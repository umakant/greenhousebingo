import { NextRequest, NextResponse } from "next/server";

import { LMS_TICKET_STATUSES } from "@/lib/lms-events/constants";
import type { LmsEventTicketStatus } from "@/lib/lms-events/constants";
import { lmsEventAdminRepoFromRequest } from "@/lib/lms-events/server-context";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string; ticketId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const repo = await lmsEventAdminRepoFromRequest(req);
    if (!repo) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const { eventId, ticketId } = await ctx.params;
    const body = (await req.json().catch(() => null)) as {
      name?: string;
      description?: string | null;
      price?: number;
      currency?: string;
      quantity?: number | null;
      ticketStatus?: string;
      isFree?: boolean;
    } | null;

    if (!body) {
      return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
    }

    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ ok: false, message: "Ticket name is required." }, { status: 400 });
    }
    if (
      body.ticketStatus !== undefined &&
      !LMS_TICKET_STATUSES.includes(body.ticketStatus as LmsEventTicketStatus)
    ) {
      return NextResponse.json({ ok: false, message: "Invalid ticket status." }, { status: 400 });
    }
    if (body.price !== undefined && (!Number.isFinite(body.price) || body.price < 0)) {
      return NextResponse.json({ ok: false, message: "Price must be zero or greater." }, { status: 400 });
    }
    if (body.quantity != null && (!Number.isInteger(body.quantity) || body.quantity < 0)) {
      return NextResponse.json({ ok: false, message: "Capacity must be a whole number." }, { status: 400 });
    }

    const actor = await lmsTenantActorFromRequest(req);
    const ticket = await repo.updateTicket(
      eventId,
      ticketId,
      {
        name: body.name,
        description: body.description,
        price: body.price,
        currency: body.currency,
        quantity: body.quantity,
        ticketStatus: body.ticketStatus as LmsEventTicketStatus | undefined,
        isFree: body.isFree,
      },
      actor?.userId.toString(),
    );

    return NextResponse.json({ ok: true, ticket });
  } catch (e) {
    console.error("[PATCH /api/lms/admin/events/[eventId]/tickets/[ticketId]]", e);
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Could not update ticket." },
      { status: 500 },
    );
  }
}
