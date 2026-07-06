import { NextRequest, NextResponse } from "next/server";

import { lmsEventRegistrationWizardSchema } from "@/lib/lms-events/schemas";
import { lmsEventMockRepoFromRequest } from "@/lib/lms-events/server-context";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const repo = await lmsEventMockRepoFromRequest(req);
  if (!repo) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { eventId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = lmsEventRegistrationWizardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid registration." },
      { status: 400 },
    );
  }

  try {
    const registration = await repo.registerForEvent({
      eventId,
      ticketId: parsed.data.ticketId,
      attendeeName: parsed.data.attendeeName,
      attendeeEmail: parsed.data.attendeeEmail,
    });
    return NextResponse.json({ ok: true, registration });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Registration failed.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
