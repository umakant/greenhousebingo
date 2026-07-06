import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { getSettingsForOwner, upsertOwnerSettings } from "@/lib/settings-service";
import { logStorefrontAudit, STOREFRONT_AUDIT_EVENTS } from "@/lib/storefront/storefront-audit";
import { STOREFRONT_MERCHANT_SETTINGS_DEFAULTS, type StorefrontMerchantSettingKey } from "@/lib/storefront/storefront-settings-keys";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";

export const dynamic = "force-dynamic";

/** Subset of merchant settings editable from Storefront → Checkout (Shopify-style checkout admin). */
const CHECKOUT_SETTING_KEYS = [
  "sf_checkout_brand_primary",
  "sf_checkout_brand_accent",
  "sf_customer_accounts_enabled",
  "sf_support_email",
] as const satisfies readonly StorefrontMerchantSettingKey[];

type CheckoutSettingsPayload = Record<(typeof CHECKOUT_SETTING_KEYS)[number], string>;

function normalizePayload(body: Record<string, unknown>): { ok: true; data: CheckoutSettingsPayload } | { ok: false; message: string } {
  const out: Partial<CheckoutSettingsPayload> = {};
  for (const k of CHECKOUT_SETTING_KEYS) {
    if (!(k in body)) continue;
    const raw = body[k];
    const s = raw == null ? "" : String(raw).trim();
    if (k === "sf_customer_accounts_enabled") {
      out[k] = s === "0" || s.toLowerCase() === "false" ? "0" : "1";
    } else if (k === "sf_support_email") {
      if (s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
        return { ok: false, message: "Invalid support email." };
      }
      out[k] = s;
    } else {
      out[k] = s;
    }
  }
  if (Object.keys(out).length === 0) {
    return { ok: false, message: "No valid fields to update." };
  }
  return { ok: true, data: out as CheckoutSettingsPayload };
}

export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: [STOREFRONT_PERMISSION.CHECKOUT_MANAGE, STOREFRONT_PERMISSION.SETTINGS_MANAGE],
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const all = await getSettingsForOwner(org.organizationId);
  const data: CheckoutSettingsPayload = {
    sf_checkout_brand_primary: all.sf_checkout_brand_primary ?? STOREFRONT_MERCHANT_SETTINGS_DEFAULTS.sf_checkout_brand_primary,
    sf_checkout_brand_accent: all.sf_checkout_brand_accent ?? STOREFRONT_MERCHANT_SETTINGS_DEFAULTS.sf_checkout_brand_accent,
    sf_customer_accounts_enabled:
      all.sf_customer_accounts_enabled ?? STOREFRONT_MERCHANT_SETTINGS_DEFAULTS.sf_customer_accounts_enabled,
    sf_support_email: all.sf_support_email ?? STOREFRONT_MERCHANT_SETTINGS_DEFAULTS.sf_support_email,
  };
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: [STOREFRONT_PERMISSION.CHECKOUT_MANAGE, STOREFRONT_PERMISSION.SETTINGS_MANAGE],
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = normalizePayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: parsed.message }, { status: 400 });
  }

  await upsertOwnerSettings(
    org.organizationId,
    Object.entries(parsed.data).map(([key, value]) => ({ key, value, isPublic: true })),
  );

  await logStorefrontAudit({
    organizationId: org.organizationId,
    eventType: STOREFRONT_AUDIT_EVENTS.SETTINGS_UPDATE,
    actorUserId: org.userId,
    resourceType: "checkout_settings",
    resourceId: org.organizationId.toString(),
    message: "Checkout settings updated",
    metadata: { keys: Object.keys(parsed.data) },
    saas: { ...saasActorFromRequest(req) },
  });

  const all = await getSettingsForOwner(org.organizationId);
  const data: CheckoutSettingsPayload = {
    sf_checkout_brand_primary: all.sf_checkout_brand_primary ?? STOREFRONT_MERCHANT_SETTINGS_DEFAULTS.sf_checkout_brand_primary,
    sf_checkout_brand_accent: all.sf_checkout_brand_accent ?? STOREFRONT_MERCHANT_SETTINGS_DEFAULTS.sf_checkout_brand_accent,
    sf_customer_accounts_enabled:
      all.sf_customer_accounts_enabled ?? STOREFRONT_MERCHANT_SETTINGS_DEFAULTS.sf_customer_accounts_enabled,
    sf_support_email: all.sf_support_email ?? STOREFRONT_MERCHANT_SETTINGS_DEFAULTS.sf_support_email,
  };
  return NextResponse.json({ ok: true, data });
}
