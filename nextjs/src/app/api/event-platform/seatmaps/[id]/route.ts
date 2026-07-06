import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { seatmapUpdateSchema } from "@/lib/event-platform/seatmaps/seatmap-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "cms.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const { id } = await ctx.params;
  let seatmapId: bigint;
  try {
    seatmapId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const row = await prisma.eventSeatmapTemplate.findFirst({
    where: { id: seatmapId, organizationId: actor.organizationId, archivedAt: null },
  });
  if (!row) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  return NextResponse.json({
    ok: true,
    item: {
      id: row.id.toString(),
      name: row.name,
      description: row.description,
      layout: row.layoutJson,
      status: row.status,
    },
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "cms.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const { id } = await ctx.params;
  let seatmapId: bigint;
  try {
    seatmapId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = seatmapUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const updated = await prisma.eventSeatmapTemplate.updateMany({
    where: { id: seatmapId, organizationId: actor.organizationId, archivedAt: null },
    data: {
      ...(parsed.data.name != null ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description?.trim() || null }
        : {}),
      ...(parsed.data.layout != null ? { layoutJson: parsed.data.layout } : {}),
      ...(parsed.data.status != null ? { status: parsed.data.status } : {}),
      updatedById: actor.userId,
    },
  });
  if (updated.count === 0) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "seatmap.updated",
    entityType: "event_seatmap_template",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "cms.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const { id } = await ctx.params;
  let seatmapId: bigint;
  try {
    seatmapId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  await prisma.eventSeatmapTemplate.updateMany({
    where: { id: seatmapId, organizationId: actor.organizationId },
    data: { archivedAt: new Date(), status: "archived", updatedById: actor.userId },
  });
  return NextResponse.json({ ok: true });
}
