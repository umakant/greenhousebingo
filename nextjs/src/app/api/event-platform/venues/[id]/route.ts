import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isVenueManagementApiError,
  requireVenueManagementApi,
} from "@/lib/venue-management/venue-management-api-auth";
import {
  eventVenueUpdateSchema,
  normalizeBusinessHours,
  parseLatitude,
  parseLongitude,
  parseSeating,
} from "@/lib/event-platform/venues/venue-schemas";
import { getEventVenueById, serializeEventVenue } from "@/lib/event-platform/venues/venue-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseId(raw: string): bigint | null {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireVenueManagementApi(req, "venues.view");
  if (isVenueManagementApiError(actor)) return actor;
  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (id == null) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  const row = await getEventVenueById(actor.organizationId, id);
  if (!row) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true, item: serializeEventVenue(row) });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireVenueManagementApi(req, "venues.manage");
  if (isVenueManagementApiError(actor)) return actor;
  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (id == null) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const existing = await getEventVenueById(actor.organizationId, id);
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = eventVenueUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const p = parsed.data;
  const data: Prisma.EventVenueUpdateInput = { updatedById: actor.userId };

  if (p.name !== undefined) data.name = p.name.trim();
  if (p.imageUrl !== undefined) data.imageUrl = p.imageUrl?.trim() || null;
  if (p.phone !== undefined) data.phone = p.phone?.trim() || null;
  if (p.website !== undefined) data.website = p.website?.trim() || null;
  if (p.address !== undefined) data.address = p.address?.trim() || null;
  if (p.address2 !== undefined) data.address2 = p.address2?.trim() || null;
  if (p.city !== undefined) data.city = p.city?.trim() || null;
  if (p.state !== undefined) data.state = p.state?.trim() || null;
  if (p.zip !== undefined) data.zip = p.zip?.trim() || null;
  if (p.latitude !== undefined) {
    const lat = parseLatitude(p.latitude);
    data.latitude = lat != null ? new Prisma.Decimal(lat) : null;
  }
  if (p.longitude !== undefined) {
    const lng = parseLongitude(p.longitude);
    data.longitude = lng != null ? new Prisma.Decimal(lng) : null;
  }
  if (p.category !== undefined) data.category = p.category?.trim() || null;
  if (p.venueType !== undefined) data.venueType = p.venueType?.trim() || null;
  if (p.contactFirstName !== undefined) data.contactFirstName = p.contactFirstName?.trim() || null;
  if (p.contactLastName !== undefined) data.contactLastName = p.contactLastName?.trim() || null;
  if (p.contactPhone !== undefined) data.contactPhone = p.contactPhone?.trim() || null;
  if (p.contactEmail !== undefined) data.contactEmail = p.contactEmail?.trim() || null;
  if (p.seating !== undefined) data.seating = parseSeating(p.seating);
  if (p.age21Plus !== undefined) data.age21Plus = p.age21Plus;
  if (p.drinksAlcohol !== undefined) data.drinksAlcohol = p.drinksAlcohol;
  if (p.food !== undefined) data.food = p.food;
  if (p.businessHours !== undefined) {
    const hours = normalizeBusinessHours(p.businessHours);
    data.businessHours = hours ?? Prisma.JsonNull;
  }
  if (p.status !== undefined) data.status = p.status;

  const updated = await prisma.eventVenue.update({ where: { id }, data });

  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "venue.updated",
    entityType: "event_venue",
    entityId: id.toString(),
  });

  return NextResponse.json({ ok: true, item: serializeEventVenue(updated) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireVenueManagementApi(req, "venues.manage");
  if (isVenueManagementApiError(actor)) return actor;
  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (id == null) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const existing = await getEventVenueById(actor.organizationId, id);
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  await prisma.eventVenue.update({
    where: { id },
    data: { status: "archived", archivedAt: new Date(), updatedById: actor.userId },
  });

  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "venue.archived",
    entityType: "event_venue",
    entityId: id.toString(),
  });

  return NextResponse.json({ ok: true });
}
