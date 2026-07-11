import { NextRequest, NextResponse } from "next/server";

import type { EventAttendeesListQuery } from "@/lib/event-platform/attendees/event-attendees-types";
import { listEventAttendees } from "@/lib/event-platform/attendees/event-attendees-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function parseListQuery(req: NextRequest): EventAttendeesListQuery {
  const sp = req.nextUrl.searchParams;
  const pageSizeRaw = Number.parseInt(sp.get("pageSize") ?? "25", 10);
  const pageSize = pageSizeRaw === 50 || pageSizeRaw === 100 ? pageSizeRaw : 25;
  const spendMin = sp.get("spendMin");
  const spendMax = sp.get("spendMax");

  return {
    page: Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1),
    pageSize,
    q: sp.get("q") ?? undefined,
    phone: sp.get("phone") ?? undefined,
    email: sp.get("email") ?? undefined,
    registrationStatus: sp.get("registrationStatus") ?? undefined,
    checkInStatus: (sp.get("checkInStatus") as EventAttendeesListQuery["checkInStatus"]) ?? undefined,
    customerType: (sp.get("customerType") as EventAttendeesListQuery["customerType"]) ?? undefined,
    ticketTierId: sp.get("ticketTierId") ?? undefined,
    bonusCardBuyer: (sp.get("bonusCardBuyer") as EventAttendeesListQuery["bonusCardBuyer"]) ?? undefined,
    bingoWinner: (sp.get("bingoWinner") as EventAttendeesListQuery["bingoWinner"]) ?? undefined,
    hasPlantRequest: (sp.get("hasPlantRequest") as EventAttendeesListQuery["hasPlantRequest"]) ?? undefined,
    registrationSource: sp.get("registrationSource") ?? undefined,
    spendMin: spendMin != null && spendMin !== "" ? Number(spendMin) : undefined,
    spendMax: spendMax != null && spendMax !== "" ? Number(spendMax) : undefined,
    newOrReturning: (sp.get("newOrReturning") as EventAttendeesListQuery["newOrReturning"]) ?? undefined,
    sort: (sp.get("sort") as EventAttendeesListQuery["sort"]) ?? undefined,
    sortDir: sp.get("sortDir") === "asc" ? "asc" : "desc",
  };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.view");
  if (isEventPlatformApiError(actor)) return actor;

  const { id } = await ctx.params;
  try {
    const result = await listEventAttendees(actor.organizationId, id, parseListQuery(req));
    if (!result) {
      return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not load attendees.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
