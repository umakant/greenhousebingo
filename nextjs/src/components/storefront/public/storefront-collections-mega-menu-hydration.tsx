"use client";

import { useLayoutEffect, useRef } from "react";

import type { PublicStorefrontCollectionListRow } from "@/lib/storefront/public-catalog";
import { buildCollectionsMegaMenuListInnerHtml } from "@/lib/storefront/theme-concept-collections-mega-cards";

async function fetchCollections(): Promise<PublicStorefrontCollectionListRow[]> {
  try {
    const res = await fetch("/api/storefront/public/collections", { credentials: "include" });
    const data = (await res.json()) as {
      ok?: boolean;
      collections?: Array<{
        id?: string;
        title?: string;
        slug?: string;
        description?: string | null;
        productCount?: number;
        featuredImageUrl?: string | null;
      }>;
    };
    if (!data?.ok || !Array.isArray(data.collections)) return [];
    return data.collections
      .map((c) => ({
        id: String(c.id ?? ""),
        title: String(c.title ?? "").trim(),
        slug: String(c.slug ?? "").trim().toLowerCase(),
        description: c.description != null ? String(c.description) : null,
        productCount: typeof c.productCount === "number" ? c.productCount : 0,
        featuredImageUrl: c.featuredImageUrl != null ? String(c.featuredImageUrl) : null,
      }))
      .filter((c) => c.id.length > 0 && c.title.length > 0 && c.slug.length > 0);
  } catch {
    return [];
  }
}

/** Header “Collections” mega-menu: replace demo media cards with `/shop/collections/{slug}` rows. */
export function StorefrontCollectionsMegaMenuHydration() {
  const claimedUls = useRef(new WeakSet<Element>());
  const alive = useRef(true);

  useLayoutEffect(() => {
    alive.current = true;

    const run = () => {
      void fetchCollections().then((rows) => {
        if (!alive.current || !rows.length) return;
        const ul = document.querySelector('ul.mega-menu__list[id*="__header-2-start"]');
        if (!(ul instanceof HTMLUListElement)) return;
        if (ul.getAttribute("data-pf-collections-mega") === "1") return;
        if (claimedUls.current.has(ul)) return;
        claimedUls.current.add(ul);
        const inner = buildCollectionsMegaMenuListInnerHtml(rows, {
          collectionPathPrefix: "/shop/collections",
          maxCollectionCards: 4,
        });
        if (!inner.trim()) return;
        ul.setAttribute("data-pf-collections-mega", "1");
        ul.innerHTML = inner;
      });
    };

    run();
    const tids = [120, 500, 1500, 3200].map((ms) => window.setTimeout(run, ms));
    return () => {
      alive.current = false;
      tids.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return null;
}
