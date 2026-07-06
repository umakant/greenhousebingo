import Stripe from "stripe";

let stripeSingleton: Stripe | null | undefined;

/** Storefront checkout only — never use for SaaS subscription billing. */
export function getStorefrontStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (stripeSingleton === undefined) {
    stripeSingleton = new Stripe(key);
  }
  return stripeSingleton;
}

export function storefrontStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim();
}

function activeStorefrontStripeSecretFromSettings(settings: Record<string, string>): string {
  const mode = (settings.sf_stripe_mode ?? "").trim().toLowerCase() === "live" ? "live" : "sandbox";
  const key =
    mode === "live"
      ? (settings.sf_stripe_secret_key_live ?? "").trim()
      : (settings.sf_stripe_secret_key_sandbox ?? "").trim();
  return key;
}

/**
 * Checkout PaymentIntents: use Storefront → Payments keys when Stripe is enabled there;
 * otherwise fall back to `STRIPE_SECRET_KEY` (single-tenant / legacy).
 * When Stripe is enabled in merchant settings but the secret is missing, returns null (do not silently use env).
 */
export function getStorefrontStripeForCheckout(settings: Record<string, string>): Stripe | null {
  const merchantOn = (settings.sf_stripe_enabled ?? "").trim() === "1";
  if (merchantOn) {
    const sk = activeStorefrontStripeSecretFromSettings(settings);
    if (!sk) return null;
    return new Stripe(sk, { typescript: true });
  }
  return getStorefrontStripe();
}
