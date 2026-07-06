import path from "path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { extractShopifyThemeForLiquid } from "./extract-shopify-theme";
import { tryRenderShopifyLiquidStorefront } from "./render-storefront-liquid";

const orgId = 999_001n;
const themeVersionId = 999_002n;
let themeRoot: string;

describe("Material Shopify theme Liquid", () => {
  beforeAll(async () => {
    const zipRel = "/storefront/theme-packages/rt-material-v1.5.2.zip";
    themeRoot = await extractShopifyThemeForLiquid(orgId, themeVersionId, zipRel);
  }, 120_000);

  afterAll(async () => {
    const fs = await import("fs/promises");
    await fs.rm(themeRoot, { recursive: true, force: true });
  });

  it("renders homepage index + layout", async () => {
    const cwd = process.cwd();
    expect(path.join(cwd, "layout", "theme.liquid")).not.toBe(path.join(themeRoot, "layout", "theme.liquid"));

    const r = await tryRenderShopifyLiquidStorefront({
      themeRoot,
      themeVersionId: themeVersionId.toString(),
      protocol: "http:",
      requestAuthority: "localhost:5000",
      requestPath: "/",
      segments: [],
      settingsBrand: {
        storeName: "Test",
        siteTagline: "",
        displaySiteTitleTagline: true,
        supportEmail: "",
        logoUrl: "",
        faviconUrl: "",
        defaultLocale: "en",
        currencyDisplay: "USD",
        seoDefaultTitle: "",
        seoDefaultDescription: "",
        customerAccountsEnabled: false,
        maintenanceMode: false,
        checkoutBrandPrimary: "",
        checkoutBrandAccent: "",
        stripePublishableKey: "",
        catalogCurrencyCode: "USD",
      },
      productsCount: 0,
      product: null,
      collection: null,
      cmsPageLiquid: null,
      searchQuery: "",
    });

    if (!r) {
      throw new Error("tryRenderShopifyLiquidStorefront returned null (file missing or skipped)");
    }
    expect(r.html.length).toBeGreaterThan(500);
    expect(r.html).toContain("<!doctype html>");
  });
});
