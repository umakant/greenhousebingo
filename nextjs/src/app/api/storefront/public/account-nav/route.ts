import { NextRequest, NextResponse } from "next/server";

import { isStorefrontAppHost } from "@/lib/storefront/custom-domain-hosts";
import { getStorefrontCustomerFromRequest } from "@/lib/storefront-customer-api-guard";
import { getPublicStorefrontContextFromHost } from "@/lib/storefront/public-host-context";
import {
  storefrontAccountDashboardPath,
  storefrontAccountLoginPath,
} from "@/lib/storefront/storefront-account-public-paths";

export const dynamic = "force-dynamic";

/**
 * Resolves storefront account entry URL for the current host + session (used to hydrate theme header icons).
 */
export async function GET(req: NextRequest) {
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const ctx = await getPublicStorefrontContextFromHost(host);
    if (!ctx) {
      return NextResponse.json({ ok: false, error: "Store not found for this host" }, { status: 404 });
    }

    const hostname = (host ?? "").split(":")[0]?.trim().toLowerCase() ?? "";
    const customDomain = Boolean(hostname && !isStorefrontAppHost(hostname));
    const widStr = ctx.websiteId.toString();

    const customer = await getStorefrontCustomerFromRequest(req, ctx.websiteId);
    if (customer) {
      return NextResponse.json({
        ok: true,
        websiteId: widStr,
        customerAccountsEnabled: true,
        signedIn: true,
        href: storefrontAccountDashboardPath(customDomain),
        ariaLabel: "Your account",
      });
    }

    return NextResponse.json({
      ok: true,
      websiteId: widStr,
      customerAccountsEnabled: true,
      signedIn: false,
      href: storefrontAccountLoginPath(customDomain),
      ariaLabel: "Log in",
    });
  } catch (e) {
    console.error("[storefront/public/account-nav] GET failed:", e);
    const message = e instanceof Error ? e.message : "Failed to load account nav.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
