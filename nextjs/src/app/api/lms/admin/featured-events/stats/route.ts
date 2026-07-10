import { NextRequest, NextResponse } from "next/server";

import { getFeaturedEventsStats } from "@/lib/event-platform/featured-events";
import { canAccessLmsEventAdminFromRequest } from "@/lib/lms-events/admin-access";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const allowed = await canAccessLmsEventAdminFromRequest(req);
  if (!allowed) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const excludeRaw = req.nextUrl.searchParams.get("excludeEventId")?.trim();
  let excludeEventId: bigint | undefined;
  if (excludeRaw) {
    try {
      excludeEventId = BigInt(excludeRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid excludeEventId." }, { status: 400 });
    }
  }

  const stats = await getFeaturedEventsStats(actor.organizationId, excludeEventId);
  return NextResponse.json({ ok: true, stats });
}
