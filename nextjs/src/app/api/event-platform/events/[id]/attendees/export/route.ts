import { NextRequest, NextResponse } from "next/server";

import type { EventAttendeesListQuery } from "@/lib/event-platform/attendees/event-attendees-types";
import { exportEventAttendees } from "@/lib/event-platform/attendees/event-attendees-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function parseExportQuery(req: NextRequest): EventAttendeesListQuery {
  const sp = req.nextUrl.searchParams;
  return {
    q: sp.get("q") ?? undefined,
    phone: sp.get("phone") ?? undefined,
    email: sp.get("email") ?? undefined,
    registrationStatus: sp.get("registrationStatus") ?? undefined,
    checkInStatus: (sp.get("checkInStatus") as EventAttendeesListQuery["checkInStatus"]) ?? undefined,
    customerType: (sp.get("customerType") as EventAttendeesListQuery["customerType"]) ?? undefined,
    ticketTierId: sp.get("ticketTierId") ?? undefined,
    bonusCardBuyer: (sp.get("bonusCardBuyer") as EventAttendeesListQuery["bonusCardBuyer"]) ?? undefined,
    registrationSource: sp.get("registrationSource") ?? undefined,
    spendMin: sp.get("spendMin") ? Number(sp.get("spendMin")) : undefined,
    spendMax: sp.get("spendMax") ? Number(sp.get("spendMax")) : undefined,
    newOrReturning: (sp.get("newOrReturning") as EventAttendeesListQuery["newOrReturning"]) ?? undefined,
    guestsOnly: sp.get("guestsOnly") === "true" ? true : undefined,
    sort: (sp.get("sort") as EventAttendeesListQuery["sort"]) ?? undefined,
    sortDir: sp.get("sortDir") === "asc" ? "asc" : "desc",
  };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.view");
  if (isEventPlatformApiError(actor)) return actor;

  const { id } = await ctx.params;
  try {
    const exported = await exportEventAttendees(actor.organizationId, id, parseExportQuery(req));
    if (!exported) {
      return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
    }
    return new NextResponse(exported.csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exported.filename}"`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Export failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
