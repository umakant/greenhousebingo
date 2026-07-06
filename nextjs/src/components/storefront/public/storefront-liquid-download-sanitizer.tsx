"use client";

import * as React from "react";

/**
 * Theme scripts can add `download` after hydration. Removing it stops Chrome from saving the
 * current document as `blank.html` when links point at same-origin `/shop`.
 */
export function StorefrontLiquidDownloadSanitizer({
  bodySelector,
  headHostSelector,
}: {
  bodySelector: string;
  headHostSelector?: string;
}) {
  const strip = React.useCallback(() => {
    const roots: Element[] = [];
    const b = document.querySelector(bodySelector);
    if (b) roots.push(b);
    if (headHostSelector) {
      const h = document.querySelector(headHostSelector);
      if (h) roots.push(h);
    }
    for (const root of roots) {
      root.querySelectorAll("a[download]").forEach((a) => a.removeAttribute("download"));
    }
  }, [bodySelector, headHostSelector]);

  React.useLayoutEffect(() => {
    strip();
    const timers = [50, 200, 800, 2500].map((ms) => setTimeout(strip, ms));

    const roots = () => {
      const out: Element[] = [];
      const b = document.querySelector(bodySelector);
      if (b) out.push(b);
      if (headHostSelector) {
        const h = document.querySelector(headHostSelector);
        if (h) out.push(h);
      }
      return out;
    };

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const obs = new MutationObserver(() => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        strip();
        debounce = null;
      }, 40);
    });
    for (const r of roots()) {
      obs.observe(r, { childList: true, subtree: true, attributes: true, attributeFilter: ["download"] });
    }

    return () => {
      for (const t of timers) clearTimeout(t);
      if (debounce) clearTimeout(debounce);
      obs.disconnect();
    };
  }, [strip, bodySelector, headHostSelector]);

  return null;
}
