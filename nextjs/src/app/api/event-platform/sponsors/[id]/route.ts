import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { eventSponsorUpdateSchema } from "@/lib/event-platform/sponsors/sponsor-schemas";
import {
  getEventSponsorById,
  getEventSponsorByIdForOrg,
  serializeEventSponsor,
  sponsorNameFromFields,
} from "@/lib/event-platform/sponsors/sponsor-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const actor = await requireEventPlatformApi(req, "sponsors.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const { id: idRaw } = await ctx.params;
    let id: bigint;
    try {
      id = BigInt(idRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid sponsor id." }, { status: 400 });
    }

    const existing = await getEventSponsorById(actor.organizationId, id);
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Sponsor not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = eventSponsorUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    const p = parsed.data;

    const firstName = p.firstName !== undefined ? p.firstName.trim() : existing.firstName ?? "";
    const lastName = p.lastName !== undefined ? p.lastName.trim() : existing.lastName ?? "";
    const company =
      p.company !== undefined ? p.company?.trim() || null : existing.company;

    const updated = await prisma.eventSponsor.update({
      where: { id: existing.id },
      data: {
        firstName: p.firstName !== undefined ? firstName : undefined,
        lastName: p.lastName !== undefined ? lastName : undefined,
        company: p.company !== undefined ? company : undefined,
        name:
          p.firstName !== undefined || p.lastName !== undefined || p.company !== undefined
            ? sponsorNameFromFields({ firstName, lastName, company })
            : undefined,
        address: p.address !== undefined ? p.address?.trim() || null : undefined,
        phone: p.phone !== undefined ? p.phone?.trim() || null : undefined,
        perk: p.perk !== undefined ? p.perk?.trim() || null : undefined,
        imageUrl: p.imageUrl !== undefined ? p.imageUrl?.trim() || null : undefined,
        website: p.website !== undefined ? p.website?.trim() || null : undefined,
        status: p.status ?? undefined,
        archivedAt: p.status === "archived" ? new Date() : p.status === "active" ? null : undefined,
        updatedById: actor.userId,
        updatedAt: new Date(),
      },
    });

    await writeEventAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "sponsor.updated",
      entityType: "event_sponsor",
      entityId: updated.id.toString(),
    });

    return NextResponse.json({ ok: true, item: serializeEventSponsor(updated) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Update failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const actor = await requireEventPlatformApi(req, "sponsors.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const { id: idRaw } = await ctx.params;
    const permanent = new URL(req.url).searchParams.get("permanent") === "1";
    let id: bigint;
    try {
      id = BigInt(idRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid sponsor id." }, { status: 400 });
    }

    const existing = permanent
      ? await getEventSponsorByIdForOrg(actor.organizationId, id)
      : await getEventSponsorById(actor.organizationId, id);
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Sponsor not found." }, { status: 404 });
    }

    if (permanent) {
      await prisma.eventSponsor.delete({ where: { id: existing.id } });
      await writeEventAuditLog({
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "sponsor.deleted",
        entityType: "event_sponsor",
        entityId: existing.id.toString(),
      });
      return NextResponse.json({ ok: true });
    }

    await prisma.eventSponsor.update({
      where: { id: existing.id },
      data: { status: "archived", archivedAt: new Date(), updatedById: actor.userId, updatedAt: new Date() },
    });

    await writeEventAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "sponsor.archived",
      entityType: "event_sponsor",
      entityId: existing.id.toString(),
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const permanent = new URL(req.url).searchParams.get("permanent") === "1";
    const message = e instanceof Error ? e.message : permanent ? "Delete failed." : "Archive failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
