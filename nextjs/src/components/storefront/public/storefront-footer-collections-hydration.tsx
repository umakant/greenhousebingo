"use client";

import { useLayoutEffect, useRef } from "react";

type Row = { title: string; slug: string };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function findFooterCollectionsUl(): HTMLUListElement | null {
  const footer = document.querySelector('.footer[aria-label="Footer"]');
  if (!footer) return null;
  for (const details of footer.querySelectorAll("details")) {
    const summary = details.querySelector(":scope > summary");
    const label = summary?.textContent?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
    if (label !== "collections") continue;
    const ul = details.querySelector(":scope > .details__content > ul");
    if (ul instanceof HTMLUListElement) return ul;
  }
  return null;
}

async function fetchCollections(): Promise<Row[]> {
  try {
    const res = await fetch("/api/storefront/public/collections", { credentials: "include" });
    const data = (await res.json()) as {
      ok?: boolean;
      collections?: Array<{ title?: string; slug?: string }>;
    };
    if (!data?.ok || !Array.isArray(data.collections)) return [];
    return data.collections
      .map((c) => ({
        title: String(c.title ?? "").trim(),
        slug: String(c.slug ?? "").trim().toLowerCase(),
      }))
      .filter((c) => c.title.length > 0 && c.slug.length > 0);
  } catch {
    return [];
  }
}

function renderFooterCollectionsList(ul: HTMLUListElement, cols: Row[]): void {
  if (cols.length === 0) return;
  ul.innerHTML = cols
    .slice(0, 24)
    .map(
      (c) =>
        `<li class="inline-flex"><a href="/shop/collections/${encodeURIComponent(c.slug)}" class="block reversed-link text-sm-lg leading-tight">${escapeHtml(c.title)}</a></li>`,
    )
    .join("");
}

/** Footer “Collections” accordion: swap demo links for published `/shop/collections/{slug}` rows. */
export function StorefrontFooterCollectionsHydration() {
  const ran = useRef(false);

  useLayoutEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = () => {
      void fetchCollections().then((cols) => {
        const ul = findFooterCollectionsUl();
        if (ul) renderFooterCollectionsList(ul, cols);
      });
    };

    run();
    const tids = [100, 400, 1200, 2800].map((ms) => window.setTimeout(run, ms));
    return () => tids.forEach((id) => window.clearTimeout(id));
  }, []);

  return null;
}
