import type { Prisma } from "@prisma/client";

import type { StorefrontWebsiteSetupFlags } from "@/lib/storefront/setup-types";

const SETUP_KEY = "setup";

export function parseStorefrontWebsiteSetup(
  metadata: Prisma.JsonValue | null | undefined,
): Required<StorefrontWebsiteSetupFlags> {
  if (metadata === null || metadata === undefined) {
    return {
      firstProductCreated: false,
      paymentConfigured: false,
      shippingConfigured: false,
      taxesConfigured: false,
      customerAccountsEnabled: false,
    };
  }
  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    return {
      firstProductCreated: false,
      paymentConfigured: false,
      shippingConfigured: false,
      taxesConfigured: false,
      customerAccountsEnabled: false,
    };
  }
  const raw = (metadata as Record<string, unknown>)[SETUP_KEY];
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      firstProductCreated: false,
      paymentConfigured: false,
      shippingConfigured: false,
      taxesConfigured: false,
      customerAccountsEnabled: false,
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    firstProductCreated: o.firstProductCreated === true,
    paymentConfigured: o.paymentConfigured === true,
    shippingConfigured: o.shippingConfigured === true,
    taxesConfigured: o.taxesConfigured === true,
    customerAccountsEnabled: o.customerAccountsEnabled === true,
  };
}

export function mergeStorefrontWebsiteSetup(
  metadata: Prisma.JsonValue | null | undefined,
  patch: Partial<StorefrontWebsiteSetupFlags>,
): Prisma.InputJsonValue {
  const base =
    metadata !== null && metadata !== undefined && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  const prevSetup = parseStorefrontWebsiteSetup(metadata);
  const nextSetup: Required<StorefrontWebsiteSetupFlags> = { ...prevSetup, ...patch };
  base[SETUP_KEY] = { ...nextSetup };
  return base as Prisma.InputJsonValue;
}
