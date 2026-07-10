import { NextRequest, NextResponse } from "next/server";

import { respondToHostInvite } from "@/lib/event-platform/hosts/host-invite-service";
import { eventHostInviteRespondSchema } from "@/lib/event-platform/hosts/host-schemas";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { token } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = eventHostInviteRespondSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }

    const result = await respondToHostInvite(token, parsed.data.action);
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, status: result.status });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not respond to invitation.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
