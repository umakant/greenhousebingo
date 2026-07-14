import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { eventPlantCatalogUpdateSchema } from "@/lib/event-platform/plant-catalog/plant-catalog-schemas";
import {
  getEventPlantCatalogById,
  getEventPlantCatalogByIdForOrg,
  serializeEventPlantCatalog,
} from "@/lib/event-platform/plant-catalog/plant-catalog-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const actor = await requireEventPlatformApi(req, "plantCatalog.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const { id: idRaw } = await ctx.params;
    let id: bigint;
    try {
      id = BigInt(idRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid plant id." }, { status: 400 });
    }

    const existing = await getEventPlantCatalogById(actor.organizationId, id);
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Plant not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = eventPlantCatalogUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }
    const p = parsed.data;

    const updated = await prisma.eventPlantCatalog.update({
      where: { id: existing.id },
      data: {
        name: p.name?.trim() ?? undefined,
        scientificName: p.scientificName !== undefined ? p.scientificName?.trim() || null : undefined,
        category: p.category !== undefined ? p.category?.trim() || null : undefined,
        careLevel: p.careLevel ?? undefined,
        light: p.light !== undefined ? p.light?.trim() || null : undefined,
        water: p.water !== undefined ? p.water?.trim() || null : undefined,
        petSafe: p.petSafe ?? undefined,
        description: p.description !== undefined ? p.description?.trim() || null : undefined,
        imageUrl: p.imageUrl !== undefined ? p.imageUrl?.trim() || null : undefined,
        retailValue: p.retailValue !== undefined ? p.retailValue : undefined,
        sortOrder: p.sortOrder ?? undefined,
        status: p.status ?? undefined,
        archivedAt: p.status === "archived" ? new Date() : p.status === "active" ? null : undefined,
        updatedById: actor.userId,
        updatedAt: new Date(),
      },
    });

    await writeEventAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "plant_catalog.updated",
      entityType: "event_plant_catalog",
      entityId: updated.id.toString(),
    });

    return NextResponse.json({ ok: true, item: serializeEventPlantCatalog(updated) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Update failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const actor = await requireEventPlatformApi(req, "plantCatalog.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const { id: idRaw } = await ctx.params;
    const permanent = new URL(req.url).searchParams.get("permanent") === "1";
    let id: bigint;
    try {
      id = BigInt(idRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid plant id." }, { status: 400 });
    }

    const existing = permanent
      ? await getEventPlantCatalogByIdForOrg(actor.organizationId, id)
      : await getEventPlantCatalogById(actor.organizationId, id);
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Plant not found." }, { status: 404 });
    }

    if (permanent) {
      await prisma.eventPlantCatalog.delete({ where: { id: existing.id } });
      await writeEventAuditLog({
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "plant_catalog.deleted",
        entityType: "event_plant_catalog",
        entityId: existing.id.toString(),
      });
      return NextResponse.json({ ok: true });
    }

    await prisma.eventPlantCatalog.update({
      where: { id: existing.id },
      data: { status: "archived", archivedAt: new Date(), updatedById: actor.userId, updatedAt: new Date() },
    });

    await writeEventAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "plant_catalog.archived",
      entityType: "event_plant_catalog",
      entityId: existing.id.toString(),
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const permanent = new URL(req.url).searchParams.get("permanent") === "1";
    const message = e instanceof Error ? e.message : permanent ? "Delete failed." : "Archive failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
