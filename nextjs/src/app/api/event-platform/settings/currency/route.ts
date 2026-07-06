import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import {
  readEventPlatformCurrencySettings,
  writeEventPlatformCurrencySettings,
} from "@/lib/event-platform/event-platform-settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "payments.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const settings = await readEventPlatformCurrencySettings(actor.organizationId);
  return NextResponse.json({ ok: true, settings });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "payments.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, message: "Invalid body." }, { status: 400 });

  const exchangeRate = Number(body.exchangeRate ?? 1);
  const decimalPlaces = Number(body.decimalPlaces ?? 2);
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    return NextResponse.json({ ok: false, message: "Invalid exchange rate." }, { status: 400 });
  }
  if (!Number.isFinite(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 4) {
    return NextResponse.json({ ok: false, message: "Decimal places must be 0–4." }, { status: 400 });
  }

  const settings = {
    currencyCode: String(body.currencyCode ?? "USD"),
    currencySymbol: String(body.currencySymbol ?? "$"),
    exchangeRate,
    decimalPlaces,
    thousandSeparator: String(body.thousandSeparator ?? ","),
    decimalSeparator: String(body.decimalSeparator ?? "."),
    currencyPosition: body.currencyPosition === "after" ? ("after" as const) : ("before" as const),
  };

  await writeEventPlatformCurrencySettings(actor.organizationId, settings);
  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "currency.settings.updated",
    entityType: "event_platform_settings",
  });

  return NextResponse.json({ ok: true, settings });
}
