"use client";

import * as React from "react";

const COMPARISON_SELECTOR = 'image-comparison.image-comparison[data-layout="horizontal"]';

const SETUP_DELAY_MS = 220;

/** Same pixel inset as Concept `ImageComparison.scrollIt` (`max = distance - 20`, min x = 20). */
const EDGE_PX = 20;

/**
 * Usable `--percent` range so the divider can travel the full image width (theme clamps drag to
 * ~20px from each edge, expressed as % of `clientWidth`).
 */
function comparisonPercentExtents(host: HTMLElement): { min: number; max: number } {
  const w = host.clientWidth;
  if (w <= EDGE_PX * 2 + 1) {
    return { min: 3, max: 97 };
  }
  return {
    min: (EDGE_PX / w) * 100,
    max: ((w - EDGE_PX) / w) * 100,
  };
}

function scrollProgress01(rect: DOMRectReadOnly, viewportH: number): number {
  const h = Math.max(1, rect.height);
  const span = viewportH + h;
  const raw = (viewportH - rect.top) / span;
  return Math.max(0, Math.min(1, raw));
}

function applyScrollLinkedPercent(host: HTMLElement) {
  if (host.classList.contains("scrolling")) return;

  const { min, max } = comparisonPercentExtents(host);

  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  if (reduce) {
    host.style.setProperty("--percent", `${(min + max) / 2}%`);
    return;
  }

  const rect = host.getBoundingClientRect();
  const t = scrollProgress01(rect, window.innerHeight);
  // t = 0 → max (handle at right); t = 1 → min (handle at left) — full usable width.
  const p = max + (min - max) * t;
  host.style.setProperty("--percent", `${p}%`);
}

/**
 * Concept OS2 `<image-comparison>`: `--percent` tracks scroll so the divider sweeps the **full**
 * width the theme allows (same 20px edge rule as native drag). Scroll down → right to left;
 * scroll up → left to right. Skips updates while the user drags (`.scrolling`).
 */
export function StorefrontImageComparisonScrollAnimation({ rootSelector }: { rootSelector: string }) {
  React.useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let detach: (() => void) | undefined;

    const tid = window.setTimeout(() => {
      if (cancelled) return;
      const root = document.querySelector(rootSelector);
      if (!root) return;

      const hosts = Array.from(root.querySelectorAll(COMPARISON_SELECTOR)).filter(
        (n): n is HTMLElement => n instanceof HTMLElement,
      );
      if (hosts.length === 0) return;

      for (const host of hosts) {
        host.removeAttribute("animate");
        host.classList.remove("animated");
      }

      const tick = () => {
        raf = 0;
        if (cancelled) return;
        for (const host of hosts) {
          if (!root.contains(host)) continue;
          applyScrollLinkedPercent(host);
        }
      };

      const schedule = () => {
        if (raf !== 0) return;
        raf = window.requestAnimationFrame(tick);
      };

      tick();
      window.addEventListener("scroll", schedule, { passive: true, capture: true });
      window.addEventListener("resize", schedule, { passive: true });

      detach = () => {
        window.removeEventListener("scroll", schedule, { capture: true } as AddEventListenerOptions);
        window.removeEventListener("resize", schedule);
        if (raf !== 0) {
          window.cancelAnimationFrame(raf);
          raf = 0;
        }
      };
    }, SETUP_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(tid);
      detach?.();
      if (raf !== 0) window.cancelAnimationFrame(raf);
    };
  }, [rootSelector]);

  return null;
}
