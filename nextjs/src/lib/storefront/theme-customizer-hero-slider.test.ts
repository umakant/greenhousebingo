import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { normalizeThemeCustomizerContentState } from "@/lib/storefront/theme-customizer-content";
import {
  applyHeroSliderToHtml,
  normalizeHeroSlideImageUrlForServedHtml,
} from "@/lib/storefront/theme-customizer-hero-slider";

const SAMPLE_INDEX = path.join(process.cwd(), "storage/storefront-liquid-themes/1000/w-1/index.html");

describe("normalizeHeroSlideImageUrlForServedHtml", () => {
  it("rewrites ./assets paths when theme id is known", () => {
    expect(normalizeHeroSlideImageUrlForServedHtml("./assets/slideshow/a.png", "12")).toBe(
      "/shop/theme-assets/12/assets/slideshow/a.png",
    );
    expect(normalizeHeroSlideImageUrlForServedHtml("assets/slideshow/a.png", "12")).toBe(
      "/shop/theme-assets/12/assets/slideshow/a.png",
    );
  });
  it("leaves absolute and upload URLs unchanged", () => {
    expect(normalizeHeroSlideImageUrlForServedHtml("/uploads/x.png", "12")).toBe("/uploads/x.png");
    expect(normalizeHeroSlideImageUrlForServedHtml("https://cdn.example/x.png", "12")).toBe(
      "https://cdn.example/x.png",
    );
    expect(normalizeHeroSlideImageUrlForServedHtml("./assets/a.png", undefined)).toBe("./assets/a.png");
  });
});

describe("applyHeroSliderToHtml", () => {
  it("normalizes hero slides without id so overrides are not dropped", () => {
    const norm = normalizeThemeCustomizerContentState({
      heroSlider: {
        slides: [
          {
            sortIndex: 0,
            heading: "PHILLY WATER ICES",
            imageUrl: "",
            buttonText: "",
            buttonHref: "",
          },
        ],
      },
    });
    expect(norm.heroSlider?.slides?.length).toBe(1);
    expect(norm.heroSlider?.slides?.[0]?.id).toMatch(/^pf-hero-/);
    expect(norm.heroSlider?.slides?.[0]?.heading).toBe("PHILLY WATER ICES");
  });

  it("replaces Concept split-words hero heading for slide 0", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) {
      return;
    }
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");
    const slides = [
      {
        id: "t1",
        sortIndex: 0,
        imageUrl: "",
        heading: "PHILLY WATER ICES",
        buttonText: "",
        buttonHref: "",
      },
    ];
    const out = applyHeroSliderToHtml(html, slides);
    expect(out).toContain("PHILLY WATER ICES");
    expect(out).not.toMatch(/data-word="ICE"/);
  });

  it("updates slide 1 heading and button when data-index appears before class (browser innerHTML order)", () => {
    const html = `<nav is="slideshow-words" class="slideshow-words">
<div data-index="1" aria-current="false" class="slideshow-word flex"><div class="banner__box"><h2 class="heading"><span data-word="OLD">OLD</span></h2></div>
<a class="button" href="/old"><span class="btn-text">Old CTA</span></a></div></nav>`;
    const slides = [
      {
        id: "s1",
        sortIndex: 1,
        imageUrl: "",
        heading: "FRESH FROM THE TRUCK",
        buttonText: "Find Us",
        buttonHref: "#locations",
      },
    ];
    const out = applyHeroSliderToHtml(html, slides);
    expect(out).toContain("FRESH FROM THE TRUCK");
    expect(out).toContain('href="#locations"');
    expect(out).toContain(">Find Us</span>");
    expect(out).not.toContain("Old CTA");
  });

  it("does not inject ./assets src when slide imageUrl is relative and theme id is passed", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) {
      return;
    }
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");
    const rewritten = html.split("./assets/").join("/shop/theme-assets/99/assets/");
    const slides = [
      {
        id: "t1",
        sortIndex: 0,
        imageUrl: "./assets/slideshow/hero-philly-cups.png",
        heading: "",
        buttonText: "",
        buttonHref: "",
      },
    ];
    const out = applyHeroSliderToHtml(rewritten, slides, "99");
    expect(out).toContain('/shop/theme-assets/99/assets/slideshow/hero-philly-cups.png');
    expect(out).not.toContain('src="./assets/');
  });
});
