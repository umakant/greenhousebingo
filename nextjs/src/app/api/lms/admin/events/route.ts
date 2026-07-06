import { NextRequest, NextResponse } from "next/server";

import { lmsEventCreateWizardSchema, lmsEventListFiltersSchema } from "@/lib/lms-events/schemas";
import { lmsEventAdminRepoFromRequest } from "@/lib/lms-events/server-context";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

function parseListFilters(params: URLSearchParams) {
  return lmsEventListFiltersSchema.safeParse({
    search: params.get("search") ?? undefined,
    categoryId: params.get("categoryId") ?? undefined,
    eventType: params.get("eventType") ?? undefined,
    status: params.get("status") ?? undefined,
    deliveryMode: params.get("deliveryMode") ?? undefined,
    location: params.get("location") ?? undefined,
    dateFrom: params.get("dateFrom") ?? undefined,
    dateTo: params.get("dateTo") ?? undefined,
    freeOnly: params.get("freeOnly") === "true" ? true : undefined,
    paidOnly: params.get("paidOnly") === "true" ? true : undefined,
    certificationOnly: params.get("certificationOnly") === "true" ? true : undefined,
  });
}

export async function GET(req: NextRequest) {
  try {
    const repo = await lmsEventAdminRepoFromRequest(req);
    if (!repo) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const parsed = parseListFilters(req.nextUrl.searchParams);
    const filters = parsed.success ? parsed.data : {};

    const [categories, events, kpis] = await Promise.all([
      repo.listCategories(),
      repo.listAdminEvents(filters),
      repo.getOrganizerKpis(),
    ]);

    return NextResponse.json({ ok: true, categories, events, kpis });
  } catch (e) {
    console.error("[GET /api/lms/admin/events]", e);
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Could not load events." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const repo = await lmsEventAdminRepoFromRequest(req);
    if (!repo) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = lmsEventCreateWizardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid event data." },
        { status: 400 },
      );
    }

    const actor = await lmsTenantActorFromRequest(req);
    const created = await repo.createAdminEvent(parsed.data, actor?.userId.toString());

    return NextResponse.json({ ok: true, event: created.event, ticket: created.ticket });
  } catch (e) {
    console.error("[POST /api/lms/admin/events]", e);
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Could not create event." },
      { status: 500 },
    );
  }
}
