import { NextRequest, NextResponse } from "next/server";

import {
  readGlobalCommissionRate,
  writeGlobalCommissionRate,
  writeEventAuditLog,
} from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "commissions.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const globalCommissionRate = await readGlobalCommissionRate(actor.organizationId);
  return NextResponse.json({ ok: true, globalCommissionRate });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "commissions.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const body = (await req.json().catch(() => null)) as { globalCommissionRate?: unknown } | null;
  const n = typeof body?.globalCommissionRate === "number"
    ? body.globalCommissionRate
    : Number(String(body?.globalCommissionRate ?? ""));
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return NextResponse.json({ ok: false, message: "Commission rate must be between 0 and 100." }, { status: 400 });
  }
  await writeGlobalCommissionRate(actor.organizationId, n);
  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "commission.settings.updated",
    entityType: "event_platform_settings",
    metadata: { globalCommissionRate: n },
  });
  return NextResponse.json({ ok: true, globalCommissionRate: n });
}
