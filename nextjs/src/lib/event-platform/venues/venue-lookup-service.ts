import "server-only";

import type { EventVenueCategory, EventVenueType } from "@prisma/client";

import {
  EVENT_VENUE_CATEGORIES,
  EVENT_VENUE_TYPES,
} from "@/lib/event-platform/venues/venue-constants";
import type { VenueLookupDto } from "@/lib/event-platform/venues/venue-types";
import { prisma } from "@/lib/prisma";

export type { VenueLookupDto };

function serializeCategory(row: EventVenueCategory): VenueLookupDto {
  return {
    id: row.id.toString(),
    name: row.name,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

function serializeType(row: EventVenueType): VenueLookupDto {
  return {
    id: row.id.toString(),
    name: row.name,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export async function ensureDefaultVenueCategories(organizationId: bigint) {
  const count = await prisma.eventVenueCategory.count({ where: { organizationId } });
  if (count > 0) return;
  await prisma.eventVenueCategory.createMany({
    data: EVENT_VENUE_CATEGORIES.map((name, index) => ({
      organizationId,
      name,
      sortOrder: index,
      isActive: true,
    })),
    skipDuplicates: true,
  });
}

export async function ensureDefaultVenueTypes(organizationId: bigint) {
  const count = await prisma.eventVenueType.count({ where: { organizationId } });
  if (count > 0) return;
  await prisma.eventVenueType.createMany({
    data: EVENT_VENUE_TYPES.map((name, index) => ({
      organizationId,
      name,
      sortOrder: index,
      isActive: true,
    })),
    skipDuplicates: true,
  });
}

export async function listVenueCategories(organizationId: bigint, activeOnly = false) {
  await ensureDefaultVenueCategories(organizationId);
  const rows = await prisma.eventVenueCategory.findMany({
    where: {
      organizationId,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(serializeCategory);
}

export async function listVenueTypes(organizationId: bigint, activeOnly = false) {
  await ensureDefaultVenueTypes(organizationId);
  const rows = await prisma.eventVenueType.findMany({
    where: {
      organizationId,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(serializeType);
}

export async function createVenueCategory(organizationId: bigint, name: string, sortOrder = 0) {
  const row = await prisma.eventVenueCategory.create({
    data: { organizationId, name: name.trim(), sortOrder, isActive: true },
  });
  return serializeCategory(row);
}

export async function createVenueType(organizationId: bigint, name: string, sortOrder = 0) {
  const row = await prisma.eventVenueType.create({
    data: { organizationId, name: name.trim(), sortOrder, isActive: true },
  });
  return serializeType(row);
}

export async function updateVenueCategory(
  organizationId: bigint,
  id: bigint,
  data: { name?: string; sortOrder?: number; isActive?: boolean },
) {
  const existing = await prisma.eventVenueCategory.findFirst({ where: { id, organizationId } });
  if (!existing) return null;
  const row = await prisma.eventVenueCategory.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
  return serializeCategory(row);
}

export async function updateVenueType(
  organizationId: bigint,
  id: bigint,
  data: { name?: string; sortOrder?: number; isActive?: boolean },
) {
  const existing = await prisma.eventVenueType.findFirst({ where: { id, organizationId } });
  if (!existing) return null;
  const row = await prisma.eventVenueType.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
  return serializeType(row);
}

export async function deleteVenueCategory(organizationId: bigint, id: bigint) {
  const existing = await prisma.eventVenueCategory.findFirst({ where: { id, organizationId } });
  if (!existing) return false;
  await prisma.eventVenueCategory.delete({ where: { id } });
  return true;
}

export async function deleteVenueType(organizationId: bigint, id: bigint) {
  const existing = await prisma.eventVenueType.findFirst({ where: { id, organizationId } });
  if (!existing) return false;
  await prisma.eventVenueType.delete({ where: { id } });
  return true;
}
