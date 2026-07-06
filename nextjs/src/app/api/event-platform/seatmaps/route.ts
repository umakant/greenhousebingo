import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import {
  EMPTY_SEATMAP_LAYOUT,
  seatmapCreateSchema,
} from "@/lib/event-platform/seatmaps/seatmap-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function serializeSeatmap(row: {
  id: bigint;
  name: string;
  description: string | null;
  layoutJson: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date | null;
}) {
  return {
    id: row.id.toString(),
    name: row.name,
    description: row.description,
    layout: row.layoutJson,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "cms.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const rows = await prisma.eventSeatmapTemplate.findMany({
    where: { organizationId: actor.organizationId, archivedAt: null },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ ok: true, items: rows.map(serializeSeatmap) });
}

export async function POST(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "cms.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const body = await req.json().catch(() => null);
  const parsed = seatmapCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const created = await prisma.eventSeatmapTemplate.create({
    data: {
      organizationId: actor.organizationId,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      layoutJson: parsed.data.layout ?? EMPTY_SEATMAP_LAYOUT,
      status: parsed.data.status ?? "draft",
      createdById: actor.userId,
      updatedById: actor.userId,
    },
  });

  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "seatmap.created",
    entityType: "event_seatmap_template",
    entityId: created.id.toString(),
  });

  return NextResponse.json({ ok: true, item: serializeSeatmap(created) });
}
