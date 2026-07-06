import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { listRecentEventLogs } from "@/lib/storefront/services/event-log-service";

export const dynamic = "force-dynamic";

/** Day 7 — tenant storefront event log (filterable by websiteId, eventType, eventPrefix, q). */
export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: [STOREFRONT_PERMISSION.ANALYTICS_VIEW, STOREFRONT_PERMISSION.VIEW],
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const sp = req.nextUrl.searchParams;
  const wid = sp.get("websiteId");
  const eventType = sp.get("eventType") ?? undefined;
  const eventPrefix = sp.get("eventPrefix") ?? undefined;
  const eventPrefixesRaw = sp.get("eventPrefixes");
  const eventPrefixes = eventPrefixesRaw
    ? eventPrefixesRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  const q = sp.get("q") ?? undefined;
  let websiteId: bigint | undefined;
  if (wid && /^\d+$/.test(wid)) {
    try {
      websiteId = BigInt(wid);
    } catch {
      /* ignore */
    }
  }

  try {
    const rows = await listRecentEventLogs(org.organizationId, {
      websiteId,
      eventType: eventType ?? undefined,
      ...(eventPrefixes && eventPrefixes.length > 0
        ? { eventPrefixes }
        : { eventPrefix: eventPrefix ?? undefined }),
      q: q ?? undefined,
      take: 200,
    });
    /** JSON cannot serialize bigint — map explicitly (do not spread Prisma row). */
    const data = rows.map((r) => ({
      id: r.id.toString(),
      websiteId: r.websiteId != null ? r.websiteId.toString() : null,
      eventType: r.eventType,
      message: r.message,
      severity: r.severity,
      resourceType: r.resourceType,
      resourceId: r.resourceId,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load event logs";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
