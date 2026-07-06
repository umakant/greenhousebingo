import { NextRequest, NextResponse } from "next/server";

import { lmsEventListFiltersSchema } from "@/lib/lms-events/schemas";
import { lmsEventMockRepoFromRequest } from "@/lib/lms-events/server-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const repo = await lmsEventMockRepoFromRequest(req);
  if (!repo) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = lmsEventListFiltersSchema.safeParse({
    search: params.search,
    categoryId: params.categoryId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    location: params.location,
    freeOnly: params.freeOnly === "true",
    paidOnly: params.paidOnly === "true",
    certificationOnly: params.certificationOnly === "true",
    deliveryMode: params.deliveryMode,
  });
  const filters = parsed.success ? parsed.data : {};

  const [categories, events] = await Promise.all([repo.listCategories(), repo.listEvents(filters)]);
  return NextResponse.json({ ok: true, categories, events });
}
