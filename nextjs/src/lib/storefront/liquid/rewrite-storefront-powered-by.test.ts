import { describe, expect, it } from "vitest";

import {
  injectConceptFooterSocialStack,
  injectStorefrontReactMainSlotThemeCss,
  rewritePoweredByShopifyAttribution,
} from "./rewrite-storefront-powered-by";

describe("rewritePoweredByShopifyAttribution", () => {
  it("replaces common footer copy", () => {
    expect(rewritePoweredByShopifyAttribution(`<span>Powered by Shopify</span>`)).toBe(
      `<span>powerd by WaterIceExpress</span>`,
    );
  });

  it("handles non-breaking space and case", () => {
    expect(rewritePoweredByShopifyAttribution(`POWERED\u00a0BY\u00a0SHOPIFY`)).toBe("powerd by WaterIceExpress");
  });
});

describe("injectConceptFooterSocialStack", () => {
  it("injects footer layout fixes once", () => {
    const html = "<html><head></head><body></body></html>";
    const out = injectConceptFooterSocialStack(html);
    expect(out).toContain('id="pf-concept-footer-social-stack"');
    expect(out).toContain(".footer__socials.align-self-end");
    expect(out).toContain("html:has(#pf-react-main-slot) .newsletter-bar");
    expect(injectConceptFooterSocialStack(out)).toBe(out);
  });
});

describe("injectStorefrontReactMainSlotThemeCss", () => {
  it("injects main-slot and footer styles when slot is present", () => {
    const html = `<html><head></head><body><div id="pf-react-main-slot"></div></body></html>`;
    const out = injectStorefrontReactMainSlotThemeCss(html);
    expect(out).toContain('id="pf-react-main-slot-theme"');
    expect(out).toContain('id="pf-concept-footer-social-stack"');
    expect(out).toContain("flex: 0 1 auto");
  });
});
