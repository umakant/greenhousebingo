import { NextRequest, NextResponse } from "next/server";

import { lmsEventCreateWizardSchema } from "@/lib/lms-events/schemas";
import { lmsEventAdminRepoFromRequest } from "@/lib/lms-events/server-context";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const repo = await lmsEventAdminRepoFromRequest(req);
    if (!repo) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const { eventId } = await ctx.params;
    const [event, tickets, attendeesResult] = await Promise.all([
      repo.getEventById(eventId),
      repo.listTickets(eventId),
      repo.listAttendees(eventId).then(
        (rows) => ({ ok: true as const, rows }),
        (error) => {
          console.error("[GET /api/lms/admin/events/[eventId]] listAttendees failed", error);
          return { ok: false as const, rows: [] };
        },
      ),
    ]);

    if (!event) {
      return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      event,
      tickets,
      attendees: attendeesResult.rows,
    });
  } catch (e) {
    console.error("[GET /api/lms/admin/events/[eventId]]", e);
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Could not load event." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const repo = await lmsEventAdminRepoFromRequest(req);
    if (!repo) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const { eventId } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = lmsEventCreateWizardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid event data." },
        { status: 400 },
      );
    }

    const actor = await lmsTenantActorFromRequest(req);
    const updated = await repo.updateAdminEvent(eventId, parsed.data, actor?.userId.toString());

    return NextResponse.json({ ok: true, event: updated.event, ticket: updated.ticket });
  } catch (e) {
    console.error("[PATCH /api/lms/admin/events/[eventId]]", e);
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Could not update event." },
      { status: 500 },
    );
  }
}
