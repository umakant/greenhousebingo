import { NextResponse, type NextRequest } from "next/server";

import { guardPartnerApi } from "@/lib/partner-api-guard";
import { computePartnerStats } from "@/lib/partner-service";

export async function GET(req: NextRequest) {
  const guard = await guardPartnerApi(req);
  if ("error" in guard) return guard.error;

  const stats = await computePartnerStats(guard.partner.id);
  return NextResponse.json({ ok: true, stats });
}
