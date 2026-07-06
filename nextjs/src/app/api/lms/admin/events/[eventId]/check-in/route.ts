import { NextRequest, NextResponse } from "next/server";

import { getLmsEventAdminPermissionsFromRequest } from "@/lib/lms-events/admin-access";
import { lmsEventCheckInManualSchema } from "@/lib/lms-events/schemas";
import { canCheckInLmsEvents, lmsEventAdminRepoFromRequest } from "@/lib/lms-events/server-context";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const repo = await lmsEventAdminRepoFromRequest(req);
  if (!repo) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const perms = await getLmsEventAdminPermissionsFromRequest(req);
  if (!canCheckInLmsEvents(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { eventId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    qrToken?: string;
    query?: string;
    registrationId?: string;
  } | null;

  if (body?.registrationId) {
    const registration = await repo.checkInRegistration(eventId, body.registrationId);
    if (!registration) {
      return NextResponse.json({ ok: false, message: "Registration not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, registration });
  }

  const qrToken = body?.qrToken?.trim();
  if (qrToken) {
    const registration = await repo.checkInByQrToken(eventId, qrToken);
    if (!registration) {
      return NextResponse.json({ ok: false, message: "Ticket not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, registration });
  }

  const parsed = lmsEventCheckInManualSchema.safeParse({ query: body?.query ?? "" });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid search." },
      { status: 400 },
    );
  }

  const q = parsed.data.query.toLowerCase();
  const attendees = await repo.listAttendees(eventId);
  const match = attendees.find((a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  if (!match) {
    return NextResponse.json({ ok: false, message: "No matching attendee." }, { status: 404 });
  }

  const registration = await repo.checkInRegistration(eventId, match.registrationId);
  if (!registration) {
    return NextResponse.json({ ok: false, message: "Check-in failed." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, registration });
}
