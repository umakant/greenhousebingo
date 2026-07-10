import { NextRequest, NextResponse } from "next/server";

import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { createEventHostInvitation } from "@/lib/event-platform/hosts/host-invite-service";
import { eventHostInviteSchema } from "@/lib/event-platform/hosts/host-schemas";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const actor = await requireEventPlatformApi(req, "hosts.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const { id: idRaw } = await ctx.params;
    let hostId: bigint;
    try {
      hostId = BigInt(idRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid host id." }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const parsed = eventHostInviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }

    const result = await createEventHostInvitation({
      organizationId: actor.organizationId,
      hostId,
      invitedById: actor.userId,
      input: parsed.data,
    });

    return NextResponse.json({
      ok: true,
      invitation: result.invitation,
      email: result.email,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Invite failed.";
    const status = message.includes("not found") ? 404 : message.includes("already") ? 409 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
