import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { menuCreateSchema } from "@/lib/event-platform/menus/menu-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function serializeMenu(m: {
  id: bigint;
  name: string;
  location: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  items: {
    id: bigint;
    parentId: bigint | null;
    label: string;
    itemType: string;
    pageId: bigint | null;
    url: string | null;
    target: string;
    sortOrder: number;
    isEnabled: boolean;
  }[];
}) {
  return {
    id: m.id.toString(),
    name: m.name,
    location: m.location,
    isActive: m.isActive,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt?.toISOString() ?? null,
    items: m.items
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({
        id: i.id.toString(),
        parentId: i.parentId?.toString() ?? null,
        label: i.label,
        itemType: i.itemType,
        pageId: i.pageId?.toString() ?? null,
        url: i.url,
        target: i.target,
        sortOrder: i.sortOrder,
        isEnabled: i.isEnabled,
      })),
  };
}

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "menus.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const rows = await prisma.eventMenu.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { updatedAt: "desc" },
    include: { items: true },
  });
  return NextResponse.json({ ok: true, items: rows.map(serializeMenu) });
}

export async function POST(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "menus.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const body = await req.json().catch(() => null);
  const parsed = menuCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  const created = await prisma.eventMenu.create({
    data: {
      organizationId: actor.organizationId,
      name: parsed.data.name.trim(),
      location: parsed.data.location,
      isActive: parsed.data.isActive ?? true,
      createdById: actor.userId,
      updatedById: actor.userId,
    },
    include: { items: true },
  });
  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "menu.created",
    entityType: "event_menu",
    entityId: created.id.toString(),
  });
  return NextResponse.json({ ok: true, item: serializeMenu(created) });
}
