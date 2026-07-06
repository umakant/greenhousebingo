import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { logStorefrontAudit } from "@/lib/storefront/storefront-audit";
import {
  STOREFRONT_EVENTS_SETUP_MESSAGE,
  createEvent,
  findEventBySlug,
  isMissingEventsTableError,
  listEventsForOrg,
  rowToDto,
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

/** Build the legacy single-line `location` display label from structured parts. */
function composeLocationLabel(
  city: string | null,
  state: string | null,
  fallback: string | null,
): string | null {
  const parts = [city, state].filter((p): p is string => !!p);
  if (parts.length > 0) return parts.join(", ");
  return fallback;
}

export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: [STOREFRONT_PERMISSION.PAGE_MANAGE, STOREFRONT_PERMISSION.PUBLISH, STOREFRONT_PERMISSION.VIEW],
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const wid = req.nextUrl.searchParams.get("websiteId")?.trim();
  let websiteFilter: bigint | undefined;
  if (wid && /^\d+$/.test(wid)) {
    try {
      websiteFilter = BigInt(wid);
    } catch {
      websiteFilter = undefined;
    }
  }

  try {
    const rows = await listEventsForOrg(org.organizationId, {
      websiteId: websiteFilter ?? null,
    });
    return NextResponse.json({
      ok: true,
      events: rows.map(rowToDto),
    });
  } catch (e) {
    if (isMissingEventsTableError(e)) {
      return NextResponse.json({
        ok: true,
        events: [],
        storefrontNotice: STOREFRONT_EVENTS_SETUP_MESSAGE,
      });
    }
    throw e;
  }
}

export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.PAGE_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ ok: false, message: "Title is required." }, { status: 400 });
  }

  const slugRaw = String(body.slug ?? "").trim();
  const slug = slugify(slugRaw || title);
  const websiteId = parseWebsiteId(body.websiteId);

  try {
    const dup = await findEventBySlug(org.organizationId, slug);
    if (dup) {
      return NextResponse.json({ ok: false, message: "An event with this slug already exists." }, { status: 400 });
    }

    const status = String(body.status ?? "draft").toLowerCase();
    const normalizedStatus = status === "published" || status === "archived" ? status : "draft";

    const addressLine = strOrNull(body.addressLine);
    const city = strOrNull(body.city);
    const state = strOrNull(body.state);
    const postalCode = strOrNull(body.postalCode);
    const country = strOrNull(body.country);
    const explicitLocation = strOrNull(body.location);

    const row = await createEvent({
      organizationId: org.organizationId,
      websiteId,
      slug,
      title,
      location: composeLocationLabel(city, state, explicitLocation),
      venue: strOrNull(body.venue),
      eventDate: parseDateOrNull(body.eventDate),
      endDate: parseDateOrNull(body.endDate),
      imageUrl: strOrNull(body.imageUrl),
      linkUrl: strOrNull(body.linkUrl),
      description: body.description != null ? String(body.description) : null,
      status: normalizedStatus,
      sortOrder: Math.max(0, Number(body.sortOrder) || 0),
      isFeatured: Boolean(body.isFeatured),
      addressLine,
      city,
      state,
      postalCode,
      country,
      latitude: parseFiniteNumber(body.latitude),
      longitude: parseFiniteNumber(body.longitude),
      createdById: org.userId,
    });

    await logStorefrontAudit({
      organizationId: org.organizationId,
      websiteId,
      eventType: "storefront.event.create",
      actorUserId: org.userId,
      resourceType: "storefront_event",
      resourceId: row.id.toString(),
      message: `Storefront event created: ${title}`,
      metadata: { slug },
      saas: saasActorFromRequest(req),
    });

    return NextResponse.json({ ok: true, id: row.id.toString(), event: rowToDto(row) }, { status: 201 });
  } catch (e) {
    if (isMissingEventsTableError(e)) {
      return NextResponse.json({ ok: false, message: STOREFRONT_EVENTS_SETUP_MESSAGE }, { status: 503 });
    }
    throw e;
  }
}
