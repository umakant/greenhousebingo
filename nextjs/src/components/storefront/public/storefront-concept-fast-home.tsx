import type { CSSProperties } from "react";
import Link from "next/link";

import type { PublicStorefrontCollectionListRow } from "@/lib/storefront/public-catalog";
import type { PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";

import { ConceptStorefrontChrome } from "./concept-storefront-chrome";

/**
 * Minimal `/shop` homepage: no multi‑MB Concept `index.html`, no theme `vendor.js` / `theme.js`.
 * Enable with `SHOP_FAST_HOME=1`. Append `?legacy_concept=1` to load the full static theme instead.
 */
export function StorefrontConceptFastHome({
  publicSettings,
  websiteId,
  collections,
  style,
}: {
  publicSettings: PublicStorefrontBrandSettings;
  websiteId: string;
  collections: PublicStorefrontCollectionListRow[];
  style?: CSSProperties;
}) {
  const name = publicSettings.storeName?.trim() || "Shop";
  return (
    <ConceptStorefrontChrome publicSettings={publicSettings} websiteId={websiteId} title={name} style={style}>
      <main className="flex-1">
        <section className="border-b bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 px-4 py-14 text-white">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{name}</h1>
            <p className="mt-3 text-sm text-white/90 sm:text-base">
              Fast storefront view — browse collections below or open the full theme when you need every section.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/shop/collections/all"
                className="inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-blue-900 shadow hover:bg-blue-50"
              >
                Shop all products
              </Link>
              <Link
                href="/shop?legacy_concept=1"
                className="inline-flex rounded-full border border-white/40 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
              >
                Full theme homepage
              </Link>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-lg font-semibold tracking-tight">Collections</h2>
          {collections.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No published collections yet. Add them under Storefronts → Collections.
            </p>
          ) : (
            <ul className="mt-5 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
              {collections.slice(0, 12).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/shop/collections/${encodeURIComponent(c.slug)}`}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition hover:border-primary"
                  >
                    <div className="aspect-[4/3] bg-muted">
                      {c.featuredImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- remote catalog URLs
                        <img
                          src={c.featuredImageUrl}
                          alt=""
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <span className="font-medium leading-snug">{c.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.productCount} {c.productCount === 1 ? "product" : "products"}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="mx-auto max-w-6xl px-4 pb-10 text-center text-xs text-muted-foreground">
          Fast home (<code className="rounded bg-muted px-1">SHOP_FAST_HOME=1</code>) —{" "}
          <Link href="/shop?legacy_concept=1" className="text-primary underline">
            Open full theme homepage
          </Link>
        </p>
      </main>
    </ConceptStorefrontChrome>
  );
}
