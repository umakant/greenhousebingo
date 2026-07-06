import { NextRequest, NextResponse } from "next/server";

import { lmsEventMockRepoFromRequest } from "@/lib/lms-events/server-context";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const repo = await lmsEventMockRepoFromRequest(req);
  if (!repo) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { eventId } = await ctx.params;
  try {
    const wishlisted = await repo.toggleWishlist(eventId);
    return NextResponse.json({ ok: true, wishlisted });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update wishlist.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
