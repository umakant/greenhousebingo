"use client";

import { useLayoutEffect, useRef } from "react";

import type { ConceptFeaturedTabsCollection } from "@/lib/storefront/public-catalog";
import { buildShopMegaMenuTabsListInnerHtml } from "@/lib/storefront/theme-concept-shop-mega-menu";

async function fetchMegaMenuCollections(): Promise<ConceptFeaturedTabsCollection[]> {
  try {
    const res = await fetch("/api/storefront/public/mega-menu", { credentials: "include" });
    const data = (await res.json()) as {
      ok?: boolean;
      collections?: ConceptFeaturedTabsCollection[];
    };
    if (!data?.ok || !Array.isArray(data.collections)) return [];
    return data.collections
      .filter((c) => c.title?.trim() && c.slug?.trim())
      .map((c) => {
        const productCount = typeof c.productCount === "number" ? c.productCount : (c.products?.length ?? 0);
        const featuredImageUrl =
          typeof c.featuredImageUrl === "string" && c.featuredImageUrl.trim()
            ? c.featuredImageUrl.trim()
            : (c.products?.map((p) => (p.image ?? "").trim()).find(Boolean) ?? null) || null;
        return { ...c, productCount, featuredImageUrl };
      });
  } catch {
    return [];
  }
}

/** Header “Shop” mega-menu: replace demo tabs + product rows with published collections (client fallback). */
export function StorefrontShopMegaMenuHydration() {
  const claimedUls = useRef(new WeakSet<Element>());
  const alive = useRef(true);

  useLayoutEffect(() => {
    alive.current = true;

    const run = () => {
      void fetchMegaMenuCollections().then((cols) => {
        if (!alive.current || !cols.length) return;
        const ul = document.querySelector("ul.mega-menu__list.mega-menu__list--tabs");
        if (!(ul instanceof HTMLUListElement)) return;
        if (ul.getAttribute("data-pf-shop-mega") === "1") return;
        if (claimedUls.current.has(ul)) return;
        claimedUls.current.add(ul);
        const inner = buildShopMegaMenuTabsListInnerHtml(cols, {
          productPathPrefix: "/shop/products",
          collectionPathPrefix: "/shop/collections",
        });
        if (!inner.trim()) return;
        ul.setAttribute("data-pf-shop-mega", "1");
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
