import "server-only";

import type { EventPlantCatalog } from "@prisma/client";

import type {
  EventPlantCareLevel,
  EventPlantCatalogDto,
  EventPlantCatalogStatus,
} from "@/lib/event-platform/plant-catalog/plant-catalog-types";
import { prisma } from "@/lib/prisma";

export type { EventPlantCatalogDto } from "@/lib/event-platform/plant-catalog/plant-catalog-types";
export { EVENT_PLANT_CATALOG_STATUSES } from "@/lib/event-platform/plant-catalog/plant-catalog-types";

export function serializeEventPlantCatalog(
  row: EventPlantCatalog,
  updatedByName: string | null = null,
): EventPlantCatalogDto {
  return {
    id: row.id.toString(),
    name: row.name,
    scientificName: row.scientificName,
    category: row.category,
    careLevel: row.careLevel as EventPlantCareLevel,
    light: row.light,
    water: row.water,
    petSafe: row.petSafe,
    description: row.description,
    imageUrl: row.imageUrl,
    retailValue: row.retailValue != null ? Number(row.retailValue) : null,
    sortOrder: row.sortOrder,
    status: row.status as EventPlantCatalogStatus,
    updatedByName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

/** Resolve display names for the users that last touched each plant. */
export async function resolvePlantCatalogUpdaterNames(
  rows: Array<Pick<EventPlantCatalog, "updatedById" | "createdById">>,
): Promise<Map<string, string>> {
  const ids = new Set<bigint>();
  for (const row of rows) {
    if (row.updatedById) ids.add(row.updatedById);
    else if (row.createdById) ids.add(row.createdById);
  }
  if (ids.size === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, name: true },
  });
  return new Map(users.map((u) => [u.id.toString(), u.name ?? ""]));
}

export async function listEventPlantCatalog(organizationId: bigint, includeArchived = false) {
  return prisma.eventPlantCatalog.findMany({
    where: {
      organizationId,
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getEventPlantCatalogById(organizationId: bigint, id: bigint) {
  return prisma.eventPlantCatalog.findFirst({
    where: { id, organizationId, archivedAt: null },
  });
}

export async function getEventPlantCatalogByIdForOrg(organizationId: bigint, id: bigint) {
  return prisma.eventPlantCatalog.findFirst({
    where: { id, organizationId },
  });
}
