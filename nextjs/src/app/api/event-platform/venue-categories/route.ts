import { NextRequest, NextResponse } from "next/server";

import {
  isVenueManagementApiError,
  requireVenueManagementApi,
} from "@/lib/venue-management/venue-management-api-auth";
import { venueLookupCreateSchema } from "@/lib/event-platform/venues/venue-lookup-schemas";
import {
  createVenueCategory,
  listVenueCategories,
} from "@/lib/event-platform/venues/venue-lookup-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireVenueManagementApi(req, "venues.view");
  if (isVenueManagementApiError(actor)) return actor;
  try {
    const activeOnly = req.nextUrl.searchParams.get("active") === "1";
    const items = await listVenueCategories(actor.organizationId, activeOnly);
    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await requireVenueManagementApi(req, "venues.manage");
  if (isVenueManagementApiError(actor)) return actor;
  try {
    const body = await req.json().catch(() => null);
    const parsed = venueLookupCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }
    const item = await createVenueCategory(
      actor.organizationId,
      parsed.data.name,
      parsed.data.sortOrder ?? 0,
    );
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
