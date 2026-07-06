import "server-only";

import { prisma } from "@/lib/prisma";
import { getSettingsForOwner, getSuperadminId } from "@/lib/settings-service";
import { getPublicStorefrontContextFromHost } from "@/lib/storefront/public-host-context";
import { resolveWaterIceStoreContext } from "@/lib/waterice/waterice-store-org";

export type WaterIceContext = {
  organizationId: bigint;
  websiteId: bigint;
  hostname: string;
};

/**
 * Resolve the Water Ice Express org/website. The landing store is owned by the
 * dedicated superadmin store org, so its checkout/orders attach there (keeping the
 * superadmin Store's Products and Orders on the same org). Falls back to host-based
 * resolution, then the seed org (1000), for safety.
 */
export async function resolveWaterIceContext(host: string | null): Promise<WaterIceContext | null> {
  const store = await resolveWaterIceStoreContext();
  if (store) return { ...store, hostname: host ?? "" };

  const ctx = await getPublicStorefrontContextFromHost(host);
  if (ctx) return ctx;
  const orgId = BigInt((process.env.PHILLY_SEED_ORG_ID ?? "1000").trim() || "1000");
  const website = await prisma.website.findFirst({
    where: { organizationId: orgId },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (!website) return null;
  return { organizationId: orgId, websiteId: website.id, hostname: host ?? "" };
}

export type WaterIceStripeConfig = WaterIceContext & {
  enabled: boolean;
  secretKey: string;
  publishableKey: string;
  mode: "sandbox" | "live";
  /** Where the active credentials came from. */
  source: "storefront" | "platform" | "env" | "none";
};

/**
 * Stripe credentials for the Water Ice Express landing checkout.
 *
 * Resolution order (first complete pair wins):
 *  1. Storefront → Payments keys for this org (`sf_stripe_*`) — the phillywaterice
 *     merchant settings, so the landing checkout reuses the same keys as the shop.
 *  2. Platform Settings → Stripe (`stripe_key` / `stripe_secret`).
 *  3. Environment (`STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).
 */
/** Read storefront (`sf_stripe_*`) Stripe keys for a single organization, if enabled & complete. */
async function readStorefrontStripe(
  orgId: bigint,
): Promise<{ secretKey: string; publishableKey: string; mode: "sandbox" | "live" } | null> {
  try {
    const sf = await getSettingsForOwner(orgId);
    const sfEnabled = (sf.sf_stripe_enabled ?? "").trim() === "1";
    if (!sfEnabled) return null;
    const mode: "sandbox" | "live" =
      (sf.sf_stripe_mode ?? "").trim().toLowerCase() === "live" ? "live" : "sandbox";
    const secretKey = (
      (mode === "live" ? sf.sf_stripe_secret_key_live : sf.sf_stripe_secret_key_sandbox) ?? ""
    ).trim();
    const publishableKey = (
      (mode === "live" ? sf.sf_stripe_publishable_key_live : sf.sf_stripe_publishable_key_sandbox) ?? ""
    ).trim();
    if (secretKey && publishableKey) return { secretKey, publishableKey, mode };
  } catch {
    /* ignore — caller falls through */
  }
  return null;
}

export async function resolveWaterIceStripe(host: string | null): Promise<WaterIceStripeConfig | null> {
  const ctx = await resolveWaterIceContext(host);
  if (!ctx) return null;

  const base = { ...ctx };

  // 1) Storefront merchant keys (Storefront → System Setup → Payments).
  //    Check the resolved store org first, then the host storefront org (e.g. the
  //    phillywaterice shop), so the membership checkout reuses the same keys the
  //    storefront /checkout already uses on this domain.
  const candidateOrgIds: bigint[] = [ctx.organizationId];
  try {
    const hostCtx = await getPublicStorefrontContextFromHost(host);
    if (hostCtx && !candidateOrgIds.some((id) => id === hostCtx.organizationId)) {
      candidateOrgIds.push(hostCtx.organizationId);
    }
  } catch {
    /* host context optional */
  }

  for (const orgId of candidateOrgIds) {
    const sf = await readStorefrontStripe(orgId);
    if (sf) {
      return { ...base, enabled: true, secretKey: sf.secretKey, publishableKey: sf.publishableKey, mode: sf.mode, source: "storefront" };
    }
  }

  // 2) Platform Stripe settings (Settings → Stripe).
  try {
    const platform = await getSettingsForOwner(await getSuperadminId());
    const enabled = (platform.stripe_enabled ?? "").trim().toLowerCase() === "on";
    const secretKey = (platform.stripe_secret ?? "").trim();
    const publishableKey = (platform.stripe_key ?? "").trim();
    if (enabled && secretKey && publishableKey) {
      return { ...base, enabled: true, secretKey, publishableKey, mode: "sandbox", source: "platform" };
    }
  } catch {
    /* fall through to env */
  }

  // 3) Environment fallback.
  const envSecret = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  const envPub = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").trim();
  if (envSecret && envPub) {
    return { ...base, enabled: true, secretKey: envSecret, publishableKey: envPub, mode: "sandbox", source: "env" };
  }

  return { ...base, enabled: false, secretKey: "", publishableKey: "", mode: "sandbox", source: "none" };
}
