import { NextRequest, NextResponse } from "next/server";

import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { loadLmsStudentPurchases } from "@/lib/lms-student-section-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const payload = await loadLmsStudentPurchases({
    organizationId: actor.organizationId,
    studentUserId: actor.userId,
  });

  return NextResponse.json({ ok: true, ...payload });
}
