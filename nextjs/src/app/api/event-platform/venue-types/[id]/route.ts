import { NextRequest, NextResponse } from "next/server";

import {
  isVenueManagementApiError,
  requireVenueManagementApi,
} from "@/lib/venue-management/venue-management-api-auth";
import { venueLookupUpdateSchema } from "@/lib/event-platform/venues/venue-lookup-schemas";
import { deleteVenueType, updateVenueType } from "@/lib/event-platform/venues/venue-lookup-service";

export const dynamic = "force-dynamic";

function parseId(raw: string): bigint | null {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireVenueManagementApi(req, "venues.manage");
  if (isVenueManagementApiError(actor)) return actor;
  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (id == null) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = venueLookupUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const item = await updateVenueType(actor.organizationId, id, parsed.data);
  if (!item) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireVenueManagementApi(req, "venues.manage");
  if (isVenueManagementApiError(actor)) return actor;
  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (id == null) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const ok = await deleteVenueType(actor.organizationId, id);
  if (!ok) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
