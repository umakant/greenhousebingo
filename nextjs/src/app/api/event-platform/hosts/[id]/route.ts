import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { eventHostUpdateSchema } from "@/lib/event-platform/hosts/host-schemas";
import { getEventHostById, serializeEventHost } from "@/lib/event-platform/hosts/host-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const actor = await requireEventPlatformApi(req, "hosts.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const { id: idRaw } = await ctx.params;
    let id: bigint;
    try {
      id = BigInt(idRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid host id." }, { status: 400 });
    }

    const existing = await getEventHostById(actor.organizationId, id);
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Host not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = eventHostUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    const p = parsed.data;

    const updated = await prisma.eventHost.update({
      where: { id: existing.id },
      data: {
        displayName: p.displayName?.trim() ?? undefined,
        email: p.email?.trim().toLowerCase() ?? undefined,
        phone: p.phone !== undefined ? p.phone?.trim() || null : undefined,
        bio: p.bio !== undefined ? p.bio?.trim() || null : undefined,
        imageUrl: p.imageUrl !== undefined ? p.imageUrl?.trim() || null : undefined,
        status: p.status ?? undefined,
        archivedAt: p.status === "archived" ? new Date() : p.status === "active" ? null : undefined,
        updatedById: actor.userId,
        updatedAt: new Date(),
      },
    });

    await writeEventAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "host.updated",
      entityType: "event_host",
      entityId: updated.id.toString(),
    });

    return NextResponse.json({ ok: true, item: serializeEventHost(updated) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Update failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const actor = await requireEventPlatformApi(req, "hosts.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const { id: idRaw } = await ctx.params;
    let id: bigint;
    try {
      id = BigInt(idRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid host id." }, { status: 400 });
    }

    const existing = await getEventHostById(actor.organizationId, id);
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Host not found." }, { status: 404 });
    }

    await prisma.eventHost.update({
      where: { id: existing.id },
      data: { status: "archived", archivedAt: new Date(), updatedById: actor.userId, updatedAt: new Date() },
    });

    await writeEventAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "host.archived",
      entityType: "event_host",
      entityId: existing.id.toString(),
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Archive failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
