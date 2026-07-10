import { NextRequest, NextResponse } from "next/server";

import { getPublicHostInviteByToken } from "@/lib/event-platform/hosts/host-invite-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { token } = await ctx.params;
    const invite = await getPublicHostInviteByToken(token);
    if (!invite) {
      return NextResponse.json({ ok: false, message: "Invitation not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, invite });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not load invitation.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
