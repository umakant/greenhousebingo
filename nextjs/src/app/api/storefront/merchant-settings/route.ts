import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { upsertOwnerSettings } from "@/lib/settings-service";
import { logStorefrontAudit, STOREFRONT_AUDIT_EVENTS } from "@/lib/storefront/storefront-audit";
import { resolveMerchantSettingsForOrganization } from "@/lib/storefront/resolve-merchant-settings";
import {
  STOREFRONT_MERCHANT_SETTING_KEYS,
  STOREFRONT_MERCHANT_SETTING_PRIVATE_KEYS,
} from "@/lib/storefront/storefront-settings-keys";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.SETTINGS_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const resolved = await resolveMerchantSettingsForOrganization(org.organizationId);
  return NextResponse.json({
    ok: true,
    data: resolved.data,
    availableLanguages: resolved.availableLanguages,
    defaultCurrency: resolved.defaultCurrency,
  });
}

export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.SETTINGS_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const items: { key: string; value: string }[] = [];
  for (const k of STOREFRONT_MERCHANT_SETTING_KEYS) {
    if (k in body) {
      items.push({ key: k, value: String(body[k] ?? "") });
    }
  }
  if (items.length === 0) {
    return NextResponse.json({ ok: false, message: "No valid keys." }, { status: 400 });
  }

  const privateSet = new Set<string>(STOREFRONT_MERCHANT_SETTING_PRIVATE_KEYS);
  await upsertOwnerSettings(
    org.organizationId,
    items.map((it) => ({ key: it.key, value: it.value, isPublic: !privateSet.has(it.key) })),
  );

  await logStorefrontAudit({
    organizationId: org.organizationId,
    eventType: STOREFRONT_AUDIT_EVENTS.SETTINGS_UPDATE,
    actorUserId: org.userId,
    resourceType: "merchant_settings",
    resourceId: org.organizationId.toString(),
    message: "Storefront merchant settings updated",
    metadata: { keys: items.map((i) => i.key) },
    saas: { ...saasActorFromRequest(req) },
  });

  const resolved = await resolveMerchantSettingsForOrganization(org.organizationId);
  return NextResponse.json({
    ok: true,
    data: resolved.data,
    availableLanguages: resolved.availableLanguages,
    defaultCurrency: resolved.defaultCurrency,
  });
}
