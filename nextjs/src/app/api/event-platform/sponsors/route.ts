import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { eventSponsorCreateSchema } from "@/lib/event-platform/sponsors/sponsor-schemas";
import { listEventSponsors, serializeEventSponsor, sponsorNameFromFields } from "@/lib/event-platform/sponsors/sponsor-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "sponsors.view");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const rows = await listEventSponsors(actor.organizationId);
    return NextResponse.json({ ok: true, items: rows.map(serializeEventSponsor) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "sponsors.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const body = await req.json().catch(() => null);
    const parsed = eventSponsorCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    const p = parsed.data;
    const firstName = p.firstName.trim();
    const lastName = p.lastName.trim();
    const company = p.company?.trim() || null;

    const created = await prisma.eventSponsor.create({
      data: {
        organizationId: actor.organizationId,
        firstName,
        lastName,
        company,
        name: sponsorNameFromFields({ firstName, lastName, company }),
        address: p.address?.trim() || null,
        phone: p.phone?.trim() || null,
        perk: p.perk?.trim() || null,
        imageUrl: p.imageUrl?.trim() || null,
        website: p.website?.trim() || null,
        status: p.status ?? "active",
        createdById: actor.userId,
        updatedById: actor.userId,
      },
    });

    await writeEventAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "sponsor.created",
      entityType: "event_sponsor",
      entityId: created.id.toString(),
    });

    return NextResponse.json({ ok: true, item: serializeEventSponsor(created) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
