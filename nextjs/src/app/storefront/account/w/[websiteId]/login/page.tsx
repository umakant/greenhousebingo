import type { CSSProperties } from "react";
import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { StorefrontAccountLoginClient } from "@/components/storefront/storefront-account-login-client";
import { StorefrontLiquidReactChrome } from "@/components/storefront/public/storefront-liquid-react-chrome";
import { getStorefrontCustomerSessionForWebsite } from "@/lib/storefront-customer-server";
import { isStorefrontAppHost, joinStorefrontPublicPath } from "@/lib/storefront/custom-domain-hosts";
import { resolveStorefrontShellContextForWebsite } from "@/lib/storefront/resolve-storefront-shell-context";
import { storefrontHostnameForLookup } from "@/lib/storefront/storefront-host-header";

export default async function StorefrontAccountLoginPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  const existing = await getStorefrontCustomerSessionForWebsite(websiteId);
  if (existing) {
    redirect(`/storefront/account/w/${websiteId}/dashboard`);
  }

  const shell = await resolveStorefrontShellContextForWebsite(websiteId);

  const h = await headers();
  const hostname = storefrontHostnameForLookup(h.get("x-forwarded-host") ?? h.get("host") ?? "");
  const customDomain = Boolean(hostname && !isStorefrontAppHost(hostname));
  const publicAccountPath = joinStorefrontPublicPath(customDomain, "account");

  const loginInner = (
    <Suspense fallback={<p className="px-4 py-12 text-sm text-neutral-600">Loading…</p>}>
      <StorefrontAccountLoginClient
        websiteId={websiteId}
        themeChrome={Boolean(shell?.themeChromeHtml)}
        style={(shell?.cssVars ?? {}) as CSSProperties}
        publicAccountPath={publicAccountPath}
      />
    </Suspense>
  );

  if (shell?.themeChromeHtml) {
    return (
      <StorefrontLiquidReactChrome
        html={shell.themeChromeHtml}
        style={shell.cssVars as CSSProperties}
        storefrontCurrency={shell.publicSettings.currencyDisplay?.trim() || "USD"}
      >
        {loginInner}
      </StorefrontLiquidReactChrome>
    );
  }

  return loginInner;
}
