import { NextRequest, NextResponse } from "next/server";

import { lmsEventSupportTicketSchema } from "@/lib/lms-events/schemas";
import { lmsEventMockRepoFromRequest } from "@/lib/lms-events/server-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const repo = await lmsEventMockRepoFromRequest(req);
  if (!repo) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const tickets = await repo.listSupportTickets();
  return NextResponse.json({ ok: true, tickets });
}

export async function POST(req: NextRequest) {
  const repo = await lmsEventMockRepoFromRequest(req);
  if (!repo) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = lmsEventSupportTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid ticket." },
      { status: 400 },
    );
  }

  try {
    const ticket = await repo.createSupportTicket(parsed.data);
    return NextResponse.json({ ok: true, ticket });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create ticket.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
