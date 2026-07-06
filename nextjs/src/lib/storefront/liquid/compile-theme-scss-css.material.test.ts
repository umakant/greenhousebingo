import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { extractShopifyThemeForLiquid } from "./extract-shopify-theme";
import { compileThemeScssCssIfNeeded } from "./compile-theme-scss-css";

const orgId = 999_003n;
const themeVersionId = 999_004n;
let themeRoot: string;

describe("compileThemeScssCssIfNeeded (Material theme)", () => {
  beforeAll(async () => {
    const zipRel = "/storefront/theme-packages/rt-material-v1.5.2.zip";
    themeRoot = await extractShopifyThemeForLiquid(orgId, themeVersionId, zipRel);
  }, 120_000);

  afterAll(async () => {
    const fs = await import("fs/promises");
    await fs.rm(themeRoot, { recursive: true, force: true });
  });

  it("compiles Shopify-style *.scss.css from assets/*.scss", async () => {
    const css = await compileThemeScssCssIfNeeded({
      themeRoot,
      themeVersionId: themeVersionId.toString(),
      assetBaseUrl: "http://localhost:5000",
      requestedRel: "assets/rt.global.scss.css",
    });
    expect(css).toBeTruthy();
    expect(css!.length).toBeGreaterThan(200);
    expect(css).toMatch(/font-family|color|margin/i);
    expect(css).not.toMatch(/cdn\.shopify\.com\/s\/files\//i);
  });
});
