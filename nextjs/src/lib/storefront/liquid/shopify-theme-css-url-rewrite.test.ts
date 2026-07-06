import { describe, expect, it } from "vitest";

import {
  normalizeShopThemeAssetUnderscoreUrls,
  rewriteRelativeThemeAssetUrlsInHtml,
  rewriteShopifyCdnAssetUrlsInCss,
  themeAssetsPublicBase,
} from "./shopify-theme-css-url-rewrite";

describe("rewriteShopifyCdnAssetUrlsInCss", () => {
  it("rewrites /s/files/…/assets/ URLs to theme-assets base", () => {
    const base = themeAssetsPublicBase("http://localhost:5000", "2");
    const css = `src:url(//cdn.shopify.com/s/files/1/0885/9170/t/8/assets/myfont.ttf?2258);`;
    expect(rewriteShopifyCdnAssetUrlsInCss(css, base)).toBe(
      "src:url(http://localhost:5000/shop/theme-assets/2/assets/myfont.ttf);",
    );
  });

  it("rewrites /s/f/ short CDN paths", () => {
    const base = themeAssetsPublicBase("https://x.test", "9");
    const css = `a{font: url(//cdn.shopify.com/s/f/font_bold.ttf?1)}`;
    expect(rewriteShopifyCdnAssetUrlsInCss(css, base)).toBe(
      "a{font: url(https://x.test/shop/theme-assets/9/assets/font_bold.ttf)}",
    );
  });

  it("strips svg fragment before resolving file", () => {
    const base = themeAssetsPublicBase("http://h", "1");
    const css = `url(//cdn.shopify.com/s/files/1/1/1/t/1/assets/payment-webfont.svg%23x?9)`;
    const out = rewriteShopifyCdnAssetUrlsInCss(css, base);
    expect(out).toContain("/assets/payment-webfont.svg)");
  });
});

describe("normalizeShopThemeAssetUnderscoreUrls", () => {
  it("maps theme_assets to theme-assets", () => {
    expect(normalizeShopThemeAssetUnderscoreUrls(`src="/shop/theme_assets/6/a.webp"`)).toBe(`src="/shop/theme-assets/6/a.webp"`);
  });
});

describe("rewriteRelativeThemeAssetUrlsInHtml", () => {
  it("rewrites unquoted ./assets/ in srcset (comma-separated)", () => {
    const html = `srcset="/shop/theme-assets/6/assets/a.webp 180w, ./assets/remote/b.webp?v=1&amp;width=360 360w"`;
    expect(rewriteRelativeThemeAssetUrlsInHtml(html, "6")).toBe(
      `srcset="/shop/theme-assets/6/assets/a.webp 180w, /shop/theme-assets/6/assets/remote/b.webp?v=1&amp;width=360 360w"`,
    );
  });

  it("no-ops when theme id empty", () => {
    const s = "srcset=\"./assets/x.png 1x\"";
    expect(rewriteRelativeThemeAssetUrlsInHtml(s, "  ")).toBe(s);
  });
});
