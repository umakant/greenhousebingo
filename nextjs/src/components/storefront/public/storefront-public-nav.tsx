"use client";

import * as React from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import type { PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";

type Props = {
  publicSettings: PublicStorefrontBrandSettings;
  websiteId?: string;
};

export function StorefrontPublicNav({ publicSettings, websiteId }: Props) {
  const [cartQty, setCartQty] = React.useState(0);
  const [accountHref, setAccountHref] = React.useState<string | null>(null);
  const [accountLinkLabel, setAccountLinkLabel] = React.useState("Account");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/storefront/public/cart", { credentials: "include" });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          cart?: { lines?: { quantity: number }[] };
        };
        if (cancelled || !data?.ok || !data.cart?.lines) return;
        const n = data.cart.lines.reduce((s, l) => s + (l.quantity ?? 0), 0);
        setCartQty(n);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!websiteId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/storefront/public/account-nav", { credentials: "include" });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          href?: string | null;
          ariaLabel?: string | null;
        };
        if (cancelled || !data?.ok || !data.href?.trim()) return;
        setAccountHref(data.href.trim());
        if (data.ariaLabel?.trim()) setAccountLinkLabel(data.ariaLabel.trim());
      } catch {
        /* ignore */
      }
    };
    void load();
    const onSync = () => void load();
    window.addEventListener("pf:account:sync", onSync);
    return () => {
      cancelled = true;
      window.removeEventListener("pf:account:sync", onSync);
    };
  }, [websiteId]);

  const label = publicSettings.storeName?.trim() || "Store";
  const showTitleBlock = publicSettings.displaySiteTitleTagline !== false;
  const tagline = showTitleBlock ? publicSettings.siteTagline?.trim() ?? "" : "";
  const accountBase = websiteId ? true : null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/shop" className="flex min-w-0 items-center gap-2 text-lg font-semibold" aria-label={label}>
          {publicSettings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={publicSettings.logoUrl} alt="" className="h-9 w-auto max-w-[120px] object-contain" />
          ) : null}
          {(showTitleBlock || !publicSettings.logoUrl?.trim()) && (
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate">{label}</span>
              {tagline ? <span className="truncate text-xs font-normal text-muted-foreground">{tagline}</span> : null}
            </span>
          )}
        </Link>
        <nav className="flex shrink-0 items-center gap-4 text-sm">
          <Link href="/shop" className="text-muted-foreground hover:text-foreground">
            Shop
          </Link>
          <Link
            href="/shop/cart"
            className="relative inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
            <span>Cart</span>
            {cartQty > 0 ? (
              <span className="absolute -right-3 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-medium text-primary-foreground">
                {cartQty > 99 ? "99+" : cartQty}
              </span>
            ) : null}
          </Link>
          {accountBase ? (
            <Link
              href={accountHref ?? "/shop/account/login"}
              className="text-muted-foreground hover:text-foreground"
              aria-label={accountLinkLabel}
            >
              {accountLinkLabel}
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
