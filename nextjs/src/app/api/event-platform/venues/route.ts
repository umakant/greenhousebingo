import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isVenueManagementApiError,
  requireVenueManagementApi,
} from "@/lib/venue-management/venue-management-api-auth";
import { getEventVenuesListPayload } from "@/lib/event-platform/venues/venue-list-service";
import {
  eventVenueCreateSchema,
  normalizeBusinessHours,
  parseLatitude,
  parseLongitude,
  parseSeating,
} from "@/lib/event-platform/venues/venue-schemas";
import { serializeEventVenue } from "@/lib/event-platform/venues/venue-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireVenueManagementApi(req, "venues.view");
  if (isVenueManagementApiError(actor)) return actor;
  try {
    const payload = await getEventVenuesListPayload(actor.organizationId);
    return NextResponse.json({ ok: true, ...payload });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await requireVenueManagementApi(req, "venues.manage");
  if (isVenueManagementApiError(actor)) return actor;
  try {
    const body = await req.json().catch(() => null);
    const parsed = eventVenueCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    const p = parsed.data;
    const lat = parseLatitude(p.latitude);
    const lng = parseLongitude(p.longitude);
    const seating = parseSeating(p.seating);
    const businessHours = normalizeBusinessHours(p.businessHours);

    const created = await prisma.eventVenue.create({
      data: {
        organizationId: actor.organizationId,
        name: p.name.trim(),
        imageUrl: p.imageUrl?.trim() || null,
        phone: p.phone?.trim() || null,
        website: p.website?.trim() || null,
        address: p.address?.trim() || null,
        address2: p.address2?.trim() || null,
        city: p.city?.trim() || null,
        state: p.state?.trim() || null,
        zip: p.zip?.trim() || null,
        latitude: lat != null ? new Prisma.Decimal(lat) : null,
        longitude: lng != null ? new Prisma.Decimal(lng) : null,
        category: p.category?.trim() || null,
        venueType: p.venueType?.trim() || null,
        contactFirstName: p.contactFirstName?.trim() || null,
        contactLastName: p.contactLastName?.trim() || null,
        contactPhone: p.contactPhone?.trim() || null,
        contactEmail: p.contactEmail?.trim() || null,
        seating,
        age21Plus: p.age21Plus ?? false,
        drinksAlcohol: p.drinksAlcohol ?? false,
        food: p.food ?? false,
        businessHours: businessHours ?? Prisma.JsonNull,
        status: p.status ?? "active",
        createdById: actor.userId,
        updatedById: actor.userId,
      },
    });

    await writeEventAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "venue.created",
      entityType: "event_venue",
      entityId: created.id.toString(),
    });

    return NextResponse.json({ ok: true, item: serializeEventVenue(created) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
