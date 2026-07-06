import { describe, expect, it } from "vitest";

import { stripShopifyHostedRuntimeAssetRefs } from "./strip-shopify-hosted-runtime-scripts";

describe("stripShopifyHostedRuntimeAssetRefs", () => {
  it("removes download on anchors including href\"download glued form", () => {
    const html = `<body><a href="/shop"download="">x</a><a data-download="1" href="/x">y</a></body>`;
    const out = stripShopifyHostedRuntimeAssetRefs(html);
    const shopTag = out.match(/<a[^>]*href="\/shop"[^>]*>/i)?.[0] ?? "";
    expect(shopTag).not.toMatch(/download/i);
    expect(out).toContain('data-download="1"');
  });

  it("strips content-disposition meta", () => {
    const html = `<head><meta http-equiv="Content-Disposition" content="attachment; filename=x.html"></head><body></body>`;
    const out = stripShopifyHostedRuntimeAssetRefs(html);
    expect(out).not.toMatch(/content-disposition/i);
  });

  it("keeps theme-assets scripts/remote so client can load OS2 bundles", () => {
    const html = `<script src="/shop/theme-assets/6/assets/scripts/main.js"></script>`;
    expect(stripShopifyHostedRuntimeAssetRefs(html)).toContain("theme-assets/6/assets/scripts");
  });

  it("strips Shopify CDN assets/scripts tags", () => {
    const html = `<script src="https://cdn.shopify.com/s/files/1/2/3/t/4/assets/scripts/vendors.js"></script>`;
    expect(stripShopifyHostedRuntimeAssetRefs(html)).not.toMatch(/assets\/scripts/i);
  });
});
