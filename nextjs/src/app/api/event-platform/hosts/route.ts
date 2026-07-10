import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { getEventHostsListPayload } from "@/lib/event-platform/hosts/host-list-service";
import { eventHostCreateSchema } from "@/lib/event-platform/hosts/host-schemas";
import { serializeEventHost } from "@/lib/event-platform/hosts/host-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "hosts.view");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const payload = await getEventHostsListPayload(actor.organizationId);
    return NextResponse.json({ ok: true, ...payload });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "hosts.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const body = await req.json().catch(() => null);
    const parsed = eventHostCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    const p = parsed.data;

    const created = await prisma.eventHost.create({
      data: {
        organizationId: actor.organizationId,
        displayName: p.displayName.trim(),
        email: p.email.trim().toLowerCase(),
        phone: p.phone?.trim() || null,
        bio: p.bio?.trim() || null,
        imageUrl: p.imageUrl?.trim() || null,
        status: p.status ?? "active",
        createdById: actor.userId,
        updatedById: actor.userId,
      },
    });

    await writeEventAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "host.created",
      entityType: "event_host",
      entityId: created.id.toString(),
    });

    return NextResponse.json({ ok: true, item: serializeEventHost(created) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
