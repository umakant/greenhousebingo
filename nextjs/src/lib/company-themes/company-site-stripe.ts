import "server-only";

import { getSettingsForOwner, getSuperadminId } from "@/lib/settings-service";

export type CompanySiteStripeConfig = {
  enabled: boolean;
  secretKey: string;
  publishableKey: string;
  mode: "sandbox" | "live";
  source: "storefront" | "platform" | "env" | "none";
};

async function readStorefrontStripe(
  ownerId: bigint,
): Promise<{ secretKey: string; publishableKey: string; mode: "sandbox" | "live" } | null> {
  try {
    const sf = await getSettingsForOwner(ownerId);
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
    /* fall through */
  }
  return null;
}

/**
 * Stripe credentials for public company website checkout.
 *
 * Resolution order:
 *  1. Company owner Storefront → Payments keys (`sf_stripe_*`)
 *  2. Platform Settings → Stripe (`stripe_key` / `stripe_secret`)
 *  3. Environment (`STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
 */
export async function resolveCompanySiteStripe(ownerId: bigint): Promise<CompanySiteStripeConfig> {
  const sf = await readStorefrontStripe(ownerId);
  if (sf) {
    return { enabled: true, ...sf, source: "storefront" };
  }

  try {
    const platform = await getSettingsForOwner(await getSuperadminId());
    const enabled = (platform.stripe_enabled ?? "").trim().toLowerCase() === "on";
    const secretKey = (platform.stripe_secret ?? "").trim();
    const publishableKey = (platform.stripe_key ?? "").trim();
    if (enabled && secretKey && publishableKey) {
      return { enabled: true, secretKey, publishableKey, mode: "sandbox", source: "platform" };
    }
  } catch {
    /* fall through */
  }

  const envSecret = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  const envPub = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").trim();
  if (envSecret && envPub) {
    return { enabled: true, secretKey: envSecret, publishableKey: envPub, mode: "sandbox", source: "env" };
  }

  return { enabled: false, secretKey: "", publishableKey: "", mode: "sandbox", source: "none" };
}
