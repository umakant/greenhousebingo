import { NextRequest, NextResponse } from "next/server";

import { listEventHosts, serializeEventHost } from "@/lib/event-platform/hosts/host-service";
import { canAccessLmsEventAdminFromRequest } from "@/lib/lms-events/admin-access";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

/** Active hosts for event create/edit forms (LMS event admin). */
export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const allowed = await canAccessLmsEventAdminFromRequest(req);
  if (!allowed) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }
  try {
    const rows = await listEventHosts(actor.organizationId);
    const items = rows.filter((h) => h.status === "active");
    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not load hosts.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
