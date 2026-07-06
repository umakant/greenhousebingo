import { NextRequest, NextResponse } from "next/server";

import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { menuItemUpdateSchema } from "@/lib/event-platform/menus/menu-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "menus.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const { id: menuId, itemId } = await ctx.params;

  let menuIdBig: bigint;
  let itemIdBig: bigint;
  try {
    menuIdBig = BigInt(menuId);
    itemIdBig = BigInt(itemId);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const menu = await prisma.eventMenu.findFirst({
    where: { id: menuIdBig, organizationId: actor.organizationId },
    select: { id: true },
  });
  if (!menu) return NextResponse.json({ ok: false, message: "Menu not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = menuItemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const updated = await prisma.eventMenuItem.updateMany({
    where: { id: itemIdBig, menuId: menuIdBig },
    data: {
      ...(parsed.data.label != null ? { label: parsed.data.label.trim() } : {}),
      ...(parsed.data.itemType != null ? { itemType: parsed.data.itemType } : {}),
      ...(parsed.data.pageId !== undefined
        ? { pageId: parsed.data.pageId ? BigInt(parsed.data.pageId) : null }
        : {}),
      ...(parsed.data.url !== undefined ? { url: parsed.data.url?.trim() || null } : {}),
      ...(parsed.data.target != null ? { target: parsed.data.target } : {}),
      ...(parsed.data.isEnabled != null ? { isEnabled: parsed.data.isEnabled } : {}),
    },
  });
  if (updated.count === 0) {
    return NextResponse.json({ ok: false, message: "Item not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "menus.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const { id: menuId, itemId } = await ctx.params;

  let menuIdBig: bigint;
  let itemIdBig: bigint;
  try {
    menuIdBig = BigInt(menuId);
    itemIdBig = BigInt(itemId);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const menu = await prisma.eventMenu.findFirst({
    where: { id: menuIdBig, organizationId: actor.organizationId },
    select: { id: true },
  });
  if (!menu) return NextResponse.json({ ok: false, message: "Menu not found." }, { status: 404 });

  await prisma.eventMenuItem.deleteMany({ where: { id: itemIdBig, menuId: menuIdBig } });
  return NextResponse.json({ ok: true });
}
