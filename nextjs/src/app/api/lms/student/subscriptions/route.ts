import { NextRequest, NextResponse } from "next/server";

import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { serializeLmsStudentSubscription } from "@/lib/lms-subscription-serialize";
import { listStudentSubscriptions } from "@/lib/lms-student-subscription-service";

export const dynamic = "force-dynamic";

/** GET /api/lms/student/subscriptions — current learner's subscription seats. */
export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const rows = await listStudentSubscriptions({
    organizationId: actor.organizationId,
    studentUserId: actor.userId,
  });

  return NextResponse.json({
    ok: true,
    items: rows.map((r) => serializeLmsStudentSubscription(r)),
  });
}
