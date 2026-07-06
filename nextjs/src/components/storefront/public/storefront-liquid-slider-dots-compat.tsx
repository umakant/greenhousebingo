"use client";

import * as React from "react";

function collectSlides(slider: HTMLElement): HTMLElement[] {
  let slides = Array.from(
    slider.querySelectorAll('[id^="Slide-"], .slideshow__slide, [class*="slider__slide"]'),
  ).filter((el): el is HTMLElement => el instanceof HTMLElement);
  if (slides.length === 0) {
    slides = Array.from(slider.children).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && !el.classList.contains("slider-buttons"),
    );
  }
  return slides;
}

function slideScrollStep(slider: HTMLElement, slides: HTMLElement[]): number {
  if (slides.length > 0) return Math.max(1, slides[0].offsetWidth);
  return Math.max(200, Math.floor(slider.clientWidth * 0.88));
}

/**
 * Off-platform Liquid in React: OS2 / Concept / Horizon slideshow JS often expects Shopify
 * section wiring (`select()`, section events). Dots and prev/next then throw or no-op.
 *
 * Capture-phase handlers on `document` (scoped to `.shopify-liquid-root`) scroll the real
 * `[id^="Slider-"]` strip so dots, arrows, and native horizontal drag keep working.
 */
export function StorefrontLiquidSliderDotsCompat({ rootSelector }: { rootSelector: string }) {
  React.useLayoutEffect(() => {
    const root = document.querySelector(rootSelector);
    if (!root) return;

    const swallow = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    };

    const onCaptureClick = (ev: MouseEvent) => {
      if (!(ev.target instanceof Element) || !root.contains(ev.target)) return;

      /** --- 1) `<slider-dots>` pagination --- */
      const path = ev.composedPath();
      let dotHost: Element | null = null;
      for (const n of path) {
        if (!(n instanceof Element) || !root.contains(n)) continue;
        const h = n.closest("slider-dots");
        if (h && root.contains(h)) {
          dotHost = h;
          break;
        }
      }
      if (dotHost) {
        const tgt = ev.target instanceof Element ? ev.target : null;
        const button = tgt?.closest("button");
        if (!(button instanceof HTMLButtonElement) || !dotHost.contains(button)) return;

        const slideshow =
          dotHost.closest("slideshow-component") ||
          dotHost.closest("slideshow-section") ||
          dotHost.closest(".shopify-section");
        if (!(slideshow instanceof HTMLElement) || !root.contains(slideshow)) {
          swallow(ev);
          return;
        }

        const slider = slideshow.querySelector('[id^="Slider-"]') as HTMLElement | null;
        if (!slider) {
          swallow(ev);
          return;
        }

        const dots = Array.from(dotHost.querySelectorAll("button")).filter(
          (b): b is HTMLButtonElement => b instanceof HTMLButtonElement && root.contains(b),
        );
        const idx = dots.indexOf(button);
        if (idx < 0) {
          swallow(ev);
          return;
        }

        const slides = collectSlides(slider);
        swallow(ev);
        const target = slides[idx] ?? slides[Math.min(idx, Math.max(0, slides.length - 1))];
        if (target) {
          target.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
        }
        return;
      }

      /** --- 2) `slideshow-component` prev / next (`button` / `a`, name, class, or aria-label) --- */
      const navSelector = [
        'slideshow-component button[name="next"]',
        'slideshow-component button[name="previous"]',
        'slideshow-component button[name="prev"]',
        "slideshow-component .slider-button--next",
        "slideshow-component .slider-button--prev",
      ].join(", ");
      let nav: HTMLElement | null =
        ev.target instanceof Element ? (ev.target.closest(navSelector) as HTMLElement | null) : null;
      if (!nav && ev.target instanceof Element) {
        const generic = ev.target.closest(
          "slideshow-component .slider-buttons button, slideshow-component .slideshow__controls button",
        ) as HTMLElement | null;
        if (generic && !generic.closest(".slideshow__autoplay") && !generic.closest("slider-dots")) {
          nav = generic;
        }
      }
      if (!nav || !root.contains(nav)) return;
      if (nav.closest("slider-dots")) return;

      const slideshow = nav.closest("slideshow-component");
      if (!(slideshow instanceof HTMLElement) || !root.contains(slideshow)) return;

      const name = nav.getAttribute("name");
      const aria = (nav.getAttribute("aria-label") || "").toLowerCase();
      const isNext =
        name === "next" ||
        nav.classList.contains("slider-button--next") ||
        (aria.includes("next") && !aria.includes("network"));
      const isPrev =
        name === "previous" ||
        name === "prev" ||
        nav.classList.contains("slider-button--prev") ||
        aria.includes("previous") ||
        /\bprev\b/i.test(aria);
      if (!isNext && !isPrev) return;

      const slider = slideshow.querySelector('[id^="Slider-"]') as HTMLElement | null;
      if (!slider) return;

      const slides = collectSlides(slider);
      const step = slideScrollStep(slider, slides);
      const delta = isNext ? step : -step;

      swallow(ev);
      slider.scrollBy({ left: delta, behavior: "smooth" });
    };

    document.addEventListener("click", onCaptureClick, true);
    return () => document.removeEventListener("click", onCaptureClick, true);
  }, [rootSelector]);

  return null;
}
