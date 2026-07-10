import { NextRequest, NextResponse } from "next/server";

import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { revokeEventHostInvitation } from "@/lib/event-platform/hosts/host-invite-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const actor = await requireEventPlatformApi(req, "hosts.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const { id: idRaw } = await ctx.params;
    let invitationId: bigint;
    try {
      invitationId = BigInt(idRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid invitation id." }, { status: 400 });
    }

    await revokeEventHostInvitation({
      organizationId: actor.organizationId,
      invitationId,
      actorUserId: actor.userId,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Revoke failed.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
