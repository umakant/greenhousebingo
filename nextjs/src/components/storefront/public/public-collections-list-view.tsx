import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { PublicStorefrontCollectionListRow } from "@/lib/storefront/public-catalog";
import type { PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";
import { PublishedPageChrome } from "@/components/storefront/public/published-page-view";
import { cn } from "@/lib/utils";

type Props = {
  collections: PublicStorefrontCollectionListRow[];
  publicSettings: PublicStorefrontBrandSettings;
  websiteId: string;
  style?: CSSProperties;
  /** When true, content mounts inside Liquid theme `#pf-react-main-slot` (skip React chrome). */
  themeChrome?: boolean;
};

const UNICODE_SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";

function superscriptCount(n: number): string {
  const s = String(Math.max(0, Math.floor(n)));
  return [...s]
    .map((ch) => {
      const d = ch.charCodeAt(0) - 48;
      return d >= 0 && d <= 9 ? UNICODE_SUP[d]! : ch;
    })
    .join("");
}

/** Shopify-style “All collections” / “All products” tiles: full-bleed media + light text (not grey card + dark type). */
function isAggregateCollectionsHeroCard(c: PublicStorefrontCollectionListRow): boolean {
  const slug = c.slug.trim().toLowerCase();
  const title = c.title.trim().toLowerCase();
  return (
    slug === "all" ||
    slug === "all-products" ||
    slug === "all-collections" ||
    slug === "all_collections" ||
    title === "all products" ||
    title === "all collections" ||
    title === "all collection"
  );
}

function pickFallbackFeaturedImage(
  collections: PublicStorefrontCollectionListRow[],
  excludeId: string,
): string | null {
  for (const x of collections) {
    if (x.id === excludeId) continue;
    const u = x.featuredImageUrl?.trim();
    if (u) return u;
  }
  return null;
}

function collectionBlurb(c: PublicStorefrontCollectionListRow): string {
  const d = c.description?.trim();
  if (d) return d;
  if (isAggregateCollectionsHeroCard(c)) return "Check out all our collections.";
  return "View products in this collection.";
}

type CollectionTileProps = {
  c: PublicStorefrontCollectionListRow;
  href: string;
  hero: boolean;
  /** Hero background: own featured image, another collection’s image, or null (gradient-only). */
  heroImageUrl: string | null;
};

function CollectionTile({ c, href, hero, heroImageUrl }: CollectionTileProps) {
  const label = c.title?.trim() || c.slug;
  const blurb = collectionBlurb(c);
  const sup = superscriptCount(c.productCount);

  if (hero) {
    return (
      <Link
        href={href}
        className={cn(
          "pf-storefront-collection-tile-hero group relative block aspect-[4/5] min-h-[280px] w-full overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5 transition-shadow duration-300",
          "hover:shadow-xl md:min-h-[360px]",
        )}
        style={{ color: "#fff" }}
      >
        {heroImageUrl ? (
          <Image
            src={heroImageUrl}
            alt={label}
            fill
            className="object-cover grayscale transition duration-500 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            unoptimized
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-neutral-700 via-neutral-800 to-neutral-950"
            aria-hidden
          />
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 pb-7 md:p-7 md:pb-8">
          <div className="min-w-0 text-white [&_.heading]:text-white">
            <p className="text-lg font-semibold leading-snug !text-white md:text-xl">
              {c.title}
              <sup className="ml-0.5 align-super text-[0.72em] font-normal tabular-nums !text-white/85">{sup}</sup>
            </p>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed !text-white/90">{blurb}</p>
          </div>
          <ArrowRight className="mb-1 h-5 w-5 shrink-0 !text-white md:h-6 md:w-6" strokeWidth={1.75} aria-hidden />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "pf-storefront-collection-tile-standard group flex h-full min-h-[320px] flex-col overflow-hidden rounded-2xl bg-[#f2f2f2] shadow-sm ring-1 ring-black/[0.06] transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-lg hover:ring-black/10 md:min-h-[360px]",
      )}
      style={{ color: "#171717" }}
    >
      <div className="relative flex min-h-[200px] flex-1 items-center justify-center px-6 pb-2 pt-8 md:min-h-[220px] md:px-8 md:pt-10">
        {c.featuredImageUrl ? (
          <div className="relative h-44 w-full max-w-[220px] md:h-52 md:max-w-[240px]">
            <Image
              src={c.featuredImageUrl}
              alt={label}
              fill
              className="object-contain object-center drop-shadow-[0_12px_24px_rgba(0,0,0,0.12)] transition duration-300 group-hover:drop-shadow-[0_16px_32px_rgba(0,0,0,0.16)]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex h-36 w-full max-w-[200px] items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white/60 text-xs font-medium text-neutral-400">
            No image
          </div>
        )}
      </div>
      <div className="relative px-5 pb-6 pt-1 md:px-6 md:pb-7">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 [&_.heading]:text-inherit">
            <p className="text-base font-semibold leading-snug !text-neutral-950 md:text-[1.05rem]">
              {c.title}
              <sup className="ml-0.5 align-super text-[0.68em] font-normal tabular-nums !text-neutral-500">{sup}</sup>
            </p>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed !text-neutral-600">{blurb}</p>
          </div>
          <ArrowRight
            className="mb-0.5 h-5 w-5 shrink-0 !text-neutral-900 transition group-hover:translate-x-0.5 md:h-6 md:w-6"
            strokeWidth={1.75}
            aria-hidden
          />
        </div>
      </div>
    </Link>
  );
}

export function PublicCollectionsListView({
  collections,
  publicSettings,
  websiteId,
  style,
  themeChrome,
}: Props) {
  const tc = Boolean(themeChrome);

  const inner = (
    <main
      className={cn(
        "pf-storefront-collections-root mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 md:py-12 lg:px-8 lg:py-14",
        !tc && "flex-1",
      )}
      {...(tc && style ? { style } : {})}
    >
      <h1 className="text-4xl font-bold tracking-tight text-neutral-950 md:text-5xl">Collections</h1>

      <ul className="pf-storefront-collections-grid mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:mt-12 lg:grid-cols-4 lg:gap-7">
        {collections.length === 0 ? (
          <li className="col-span-full rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/80 px-8 py-16 text-center text-sm text-neutral-500">
            No published collections yet.
          </li>
        ) : (
          collections.map((c) => {
            const href = `/shop/collections/${encodeURIComponent(c.slug)}`;
            const aggregate = isAggregateCollectionsHeroCard(c);
            const heroImageUrl = aggregate
              ? (c.featuredImageUrl?.trim() || pickFallbackFeaturedImage(collections, c.id))
              : null;
            const hero = aggregate;
            return (
              <li key={c.id} className="min-w-0">
                <CollectionTile c={c} href={href} hero={hero} heroImageUrl={heroImageUrl} />
              </li>
            );
          })
        )}
      </ul>
    </main>
  );

  if (tc) return inner;
  return (
    <PublishedPageChrome publicSettings={publicSettings} title="Collections" websiteId={websiteId} style={style}>
      {inner}
    </PublishedPageChrome>
  );
}
