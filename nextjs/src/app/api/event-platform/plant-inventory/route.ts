import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { eventPlantCatalogCreateSchema } from "@/lib/event-platform/plant-catalog/plant-catalog-schemas";
import {
  listEventPlantCatalog,
  resolvePlantCatalogUpdaterNames,
  serializeEventPlantCatalog,
} from "@/lib/event-platform/plant-catalog/plant-catalog-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "plantCatalog.view");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const rows = await listEventPlantCatalog(actor.organizationId, true);
    const updaterNames = await resolvePlantCatalogUpdaterNames(rows);
    const items = rows.map((row) =>
      serializeEventPlantCatalog(
        row,
        (row.updatedById ?? row.createdById)
          ? updaterNames.get((row.updatedById ?? row.createdById)!.toString()) || null
          : null,
      ),
    );
    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "plantCatalog.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const body = await req.json().catch(() => null);
    const parsed = eventPlantCatalogCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }
    const p = parsed.data;

    const created = await prisma.eventPlantCatalog.create({
      data: {
        organizationId: actor.organizationId,
        name: p.name.trim(),
        scientificName: p.scientificName?.trim() || null,
        category: p.category?.trim() || null,
        careLevel: p.careLevel ?? "Easy",
        light: p.light?.trim() || null,
        water: p.water?.trim() || null,
        petSafe: p.petSafe ?? false,
        description: p.description?.trim() || null,
        imageUrl: p.imageUrl?.trim() || null,
        retailValue: p.retailValue ?? null,
        sortOrder: p.sortOrder ?? 0,
        status: p.status ?? "active",
        createdById: actor.userId,
        updatedById: actor.userId,
      },
    });

    await writeEventAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "plant_catalog.created",
      entityType: "event_plant_catalog",
      entityId: created.id.toString(),
    });

    return NextResponse.json({ ok: true, item: serializeEventPlantCatalog(created) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
