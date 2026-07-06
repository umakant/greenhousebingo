import { NextRequest, NextResponse } from "next/server";

import { lmsEventMockRepoFromRequest } from "@/lib/lms-events/server-context";

export const dynamic = "force-dynamic";

const TABS = ["upcoming", "completed", "cancelled", "waitlisted"] as const;

export async function GET(req: NextRequest) {
  const repo = await lmsEventMockRepoFromRequest(req);
  if (!repo) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const tabRaw = req.nextUrl.searchParams.get("tab")?.trim().toLowerCase();
  const tab = TABS.includes(tabRaw as (typeof TABS)[number])
    ? (tabRaw as (typeof TABS)[number])
    : undefined;

  const registrations = await repo.listMyRegistrations(tab);
  const events = await Promise.all(registrations.map((r) => repo.getEventById(r.eventId)));
  const items = registrations.map((r, i) => ({
    registration: r,
    event: events[i],
  }));

  return NextResponse.json({ ok: true, items });
}
