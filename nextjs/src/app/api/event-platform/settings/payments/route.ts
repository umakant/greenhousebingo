import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import {
  readOfflinePaymentMethods,
  readPaymentGateways,
  writeOfflinePaymentMethods,
  writePaymentGateways,
  type OfflinePaymentMethod,
  type PaymentGatewayConfig,
} from "@/lib/event-platform/event-platform-settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "payments.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const type = req.nextUrl.searchParams.get("type");
  if (type === "offline") {
    const methods = await readOfflinePaymentMethods(actor.organizationId);
    return NextResponse.json({ ok: true, items: methods });
  }
  const gateways = await readPaymentGateways(actor.organizationId);
  return NextResponse.json({ ok: true, items: gateways });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "payments.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const body = (await req.json().catch(() => null)) as {
    type?: string;
    items?: PaymentGatewayConfig[] | OfflinePaymentMethod[];
  } | null;
  if (!body?.items || !Array.isArray(body.items)) {
    return NextResponse.json({ ok: false, message: "Invalid body." }, { status: 400 });
  }

  if (body.type === "offline") {
    await writeOfflinePaymentMethods(actor.organizationId, body.items as OfflinePaymentMethod[]);
  } else {
    await writePaymentGateways(actor.organizationId, body.items as PaymentGatewayConfig[]);
  }

  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: body.type === "offline" ? "payments.offline.updated" : "payments.gateways.updated",
    entityType: "event_platform_settings",
  });

  return NextResponse.json({ ok: true });
}
