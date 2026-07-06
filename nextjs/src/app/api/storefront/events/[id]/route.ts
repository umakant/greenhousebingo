import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { logStorefrontAudit } from "@/lib/storefront/storefront-audit";
import {
  STOREFRONT_EVENTS_SETUP_MESSAGE,
  deleteEvent,
  findEventBySlug,
  getEventById,
  isMissingEventsTableError,
  rowToDto,
  updateEvent,
} from "@/lib/storefront/storefront-events-prisma";

export const dynamic = "force-dynamic";

function slugify(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "event";
}

function parseDateOrNull(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseWebsiteId(raw: unknown): bigint | null {
  if (raw == null || String(raw).trim() === "") return null;
  try {
    return BigInt(String(raw));
  } catch {
    return null;
  }
}

function parseFiniteNumber(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

function strOrNull(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s ? s : null;
}

function composeLocationLabel(
  city: string | null,
  state: string | null,
  fallback: string | null,
): string | null {
  const parts = [city, state].filter((p): p is string => !!p);
  if (parts.length > 0) return parts.join(", ");
  return fallback;
}

async function resolveEventId(rawId: string): Promise<bigint | null> {
  if (!/^\d+$/.test(rawId)) return null;
  try {
    return BigInt(rawId);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: [STOREFRONT_PERMISSION.PAGE_MANAGE, STOREFRONT_PERMISSION.PUBLISH, STOREFRONT_PERMISSION.VIEW],
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id: idRaw } = await ctx.params;
  const id = await resolveEventId(idRaw);
  if (!id) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  try {
    const row = await getEventById(org.organizationId, id);
    if (!row) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
    return NextResponse.json({ ok: true, event: rowToDto(row) });
  } catch (e) {
    if (isMissingEventsTableError(e)) {
      return NextResponse.json({ ok: false, message: STOREFRONT_EVENTS_SETUP_MESSAGE }, { status: 503 });
    }
    throw e;
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return updateHandler(req, ctx);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return updateHandler(req, ctx);
}

async function updateHandler(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.PAGE_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id: idRaw } = await ctx.params;
  const id = await resolveEventId(idRaw);
  if (!id) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const existing = await getEventById(org.organizationId, id);
    if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

    /** Slug uniqueness — only re-check when caller is changing it. */
    let nextSlug: string | undefined;
    if (body.slug !== undefined) {
      const proposed = slugify(String(body.slug ?? "").trim() || existing.title);
      if (proposed !== existing.slug) {
        const dup = await findEventBySlug(org.organizationId, proposed);
        if (dup && dup.id !== existing.id) {
          return NextResponse.json({ ok: false, message: "An event with this slug already exists." }, { status: 400 });
        }
      }
      nextSlug = proposed;
    }

    let nextStatus: string | undefined;
    if (body.status !== undefined) {
      const s = String(body.status ?? "").toLowerCase();
      nextStatus = s === "published" || s === "archived" ? s : "draft";
    }

    /**
     * Address handling: when any structured-address field is provided, also recompute
     * the legacy `location` display label from `city`/`state` (preserving anything the
     * caller passes in `body.location` explicitly).
     */
    const nextAddressLine = body.addressLine !== undefined ? strOrNull(body.addressLine) : undefined;
    const nextCity = body.city !== undefined ? strOrNull(body.city) : undefined;
    const nextState = body.state !== undefined ? strOrNull(body.state) : undefined;
    const nextPostalCode = body.postalCode !== undefined ? strOrNull(body.postalCode) : undefined;
    const nextCountry = body.country !== undefined ? strOrNull(body.country) : undefined;
    const nextLatitude = body.latitude !== undefined ? parseFiniteNumber(body.latitude) : undefined;
    const nextLongitude = body.longitude !== undefined ? parseFiniteNumber(body.longitude) : undefined;

    let nextLocation: string | null | undefined;
    if (body.location !== undefined) {
      nextLocation = strOrNull(body.location);
    } else if (nextCity !== undefined || nextState !== undefined) {
      const cityForLabel = nextCity !== undefined ? nextCity : existing.city;
      const stateForLabel = nextState !== undefined ? nextState : existing.state;
      nextLocation = composeLocationLabel(cityForLabel, stateForLabel, existing.location);
    }

    const updated = await updateEvent(org.organizationId, id, {
      websiteId: body.websiteId !== undefined ? parseWebsiteId(body.websiteId) : undefined,
      slug: nextSlug,
      title: body.title !== undefined ? String(body.title).trim() : undefined,
      location: nextLocation,
      venue: body.venue !== undefined ? strOrNull(body.venue) : undefined,
      eventDate: body.eventDate !== undefined ? parseDateOrNull(body.eventDate) : undefined,
      endDate: body.endDate !== undefined ? parseDateOrNull(body.endDate) : undefined,
      imageUrl: body.imageUrl !== undefined ? strOrNull(body.imageUrl) : undefined,
      linkUrl: body.linkUrl !== undefined ? strOrNull(body.linkUrl) : undefined,
      description: body.description !== undefined ? String(body.description) || null : undefined,
      status: nextStatus,
      sortOrder: body.sortOrder !== undefined ? Math.max(0, Number(body.sortOrder) || 0) : undefined,
      isFeatured: body.isFeatured !== undefined ? Boolean(body.isFeatured) : undefined,
      addressLine: nextAddressLine,
      city: nextCity,
      state: nextState,
      postalCode: nextPostalCode,
      country: nextCountry,
      latitude: nextLatitude,
      longitude: nextLongitude,
      updatedById: org.userId,
    });

    if (!updated) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

    await logStorefrontAudit({
      organizationId: org.organizationId,
      websiteId: updated.website_id,
      eventType: "storefront.event.update",
      actorUserId: org.userId,
      resourceType: "storefront_event",
      resourceId: updated.id.toString(),
      message: `Storefront event updated: ${updated.title}`,
      metadata: { slug: updated.slug },
      saas: saasActorFromRequest(req),
    });

    return NextResponse.json({ ok: true, event: rowToDto(updated) });
  } catch (e) {
    if (isMissingEventsTableError(e)) {
      return NextResponse.json({ ok: false, message: STOREFRONT_EVENTS_SETUP_MESSAGE }, { status: 503 });
    }
    throw e;
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.PAGE_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id: idRaw } = await ctx.params;
  const id = await resolveEventId(idRaw);
  if (!id) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  try {
    const existing = await getEventById(org.organizationId, id);
    if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

    const ok = await deleteEvent(org.organizationId, id);
    if (!ok) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

    await logStorefrontAudit({
      organizationId: org.organizationId,
      websiteId: existing.website_id,
      eventType: "storefront.event.delete",
      actorUserId: org.userId,
      resourceType: "storefront_event",
      resourceId: existing.id.toString(),
      message: `Storefront event deleted: ${existing.title}`,
      metadata: { slug: existing.slug },
      saas: saasActorFromRequest(req),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isMissingEventsTableError(e)) {
      return NextResponse.json({ ok: false, message: STOREFRONT_EVENTS_SETUP_MESSAGE }, { status: 503 });
    }
    throw e;
  }
}
