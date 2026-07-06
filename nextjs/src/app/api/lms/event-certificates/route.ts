import { NextRequest, NextResponse } from "next/server";

import { lmsEventMockRepoFromRequest } from "@/lib/lms-events/server-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const repo = await lmsEventMockRepoFromRequest(req);
  if (!repo) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const certificates = await repo.listCertificates();
  return NextResponse.json({ ok: true, certificates });
}
