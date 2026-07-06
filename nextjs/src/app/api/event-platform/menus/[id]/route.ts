import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import {
  menuItemCreateSchema,
  menuItemsReorderSchema,
  menuUpdateSchema,
} from "@/lib/event-platform/menus/menu-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function parseMenuId(id: string): bigint | null {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "menus.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const { id } = await ctx.params;
  const menuId = parseMenuId(id);
  if (!menuId) return NextResponse.json({ ok: false, message: "Invalid menu." }, { status: 400 });

  const menu = await prisma.eventMenu.findFirst({
    where: { id: menuId, organizationId: actor.organizationId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!menu) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  return NextResponse.json({
    ok: true,
    item: {
      id: menu.id.toString(),
      name: menu.name,
      location: menu.location,
      isActive: menu.isActive,
      items: menu.items.map((i) => ({
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
    },
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "menus.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const { id } = await ctx.params;
  const menuId = parseMenuId(id);
  if (!menuId) return NextResponse.json({ ok: false, message: "Invalid menu." }, { status: 400 });

  const body = await req.json().catch(() => null);
  const reorder = menuItemsReorderSchema.safeParse(body);
  if (reorder.success) {
    await prisma.$transaction(
      reorder.data.itemIds.map((itemId, index) =>
        prisma.eventMenuItem.updateMany({
          where: { id: BigInt(itemId), menuId },
          data: { sortOrder: index },
        }),
      ),
    );
    return NextResponse.json({ ok: true });
  }

  const parsed = menuUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const updated = await prisma.eventMenu.updateMany({
    where: { id: menuId, organizationId: actor.organizationId },
    data: {
      ...(parsed.data.name != null ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.location != null ? { location: parsed.data.location } : {}),
      ...(parsed.data.isActive != null ? { isActive: parsed.data.isActive } : {}),
      updatedById: actor.userId,
    },
  });
  if (updated.count === 0) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "menus.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const { id } = await ctx.params;
  const menuId = parseMenuId(id);
  if (!menuId) return NextResponse.json({ ok: false, message: "Invalid menu." }, { status: 400 });

  const deleted = await prisma.eventMenu.deleteMany({
    where: { id: menuId, organizationId: actor.organizationId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "menus.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const { id } = await ctx.params;
  const menuId = parseMenuId(id);
  if (!menuId) return NextResponse.json({ ok: false, message: "Invalid menu." }, { status: 400 });

  const menu = await prisma.eventMenu.findFirst({
    where: { id: menuId, organizationId: actor.organizationId },
    select: { id: true },
  });
  if (!menu) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = menuItemCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const maxOrder = await prisma.eventMenuItem.aggregate({
    where: { menuId },
    _max: { sortOrder: true },
  });

  const item = await prisma.eventMenuItem.create({
    data: {
      menuId,
      label: parsed.data.label.trim(),
      itemType: parsed.data.itemType,
      pageId: parsed.data.pageId ? BigInt(parsed.data.pageId) : null,
      url: parsed.data.url?.trim() || null,
      target: parsed.data.target,
      parentId: parsed.data.parentId ? BigInt(parsed.data.parentId) : null,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      isEnabled: parsed.data.isEnabled ?? true,
    },
  });

  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "menu_item.created",
    entityType: "event_menu_item",
    entityId: item.id.toString(),
  });

  return NextResponse.json({
    ok: true,
    item: {
      id: item.id.toString(),
      parentId: item.parentId?.toString() ?? null,
      label: item.label,
      itemType: item.itemType,
      pageId: item.pageId?.toString() ?? null,
      url: item.url,
      target: item.target,
      sortOrder: item.sortOrder,
      isEnabled: item.isEnabled,
    },
  });
}
