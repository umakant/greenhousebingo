import { NextRequest, NextResponse } from "next/server";

import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { listCommissionLedger } from "@/lib/event-platform/commissions/ledger-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "commissions.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const items = await listCommissionLedger(actor.organizationId);
  return NextResponse.json({ ok: true, items });
}
