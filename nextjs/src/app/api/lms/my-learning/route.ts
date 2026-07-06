import { NextRequest, NextResponse } from "next/server";

import { buildMyLearningHub } from "@/lib/lms-my-learning-hub-service";
import { lmsEmployeeLearnerFromRequest, lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  if (!lmsEmployeeLearnerFromRequest(req)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  try {
    const hub = await buildMyLearningHub({
      organizationId: actor.organizationId,
      studentUserId: actor.userId,
    });
    return NextResponse.json({ ok: true, ...hub });
  } catch (e) {
    console.error("[lms/my-learning GET]", e);
    return NextResponse.json({ ok: false, message: "Could not load My Learning." }, { status: 500 });
  }
}
