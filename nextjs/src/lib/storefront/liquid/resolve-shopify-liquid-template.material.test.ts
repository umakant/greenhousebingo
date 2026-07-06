import path from "path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { extractShopifyThemeForLiquid } from "./extract-shopify-theme";
import { resolveShopifyLiquidInnerTemplate } from "./resolve-shopify-liquid-template";

const orgId = 999_010n;
const themeVersionId = 999_011n;
let themeRoot: string;

describe("resolveShopifyLiquidInnerTemplate (Material theme)", () => {
  beforeAll(async () => {
    const zipRel = "/storefront/theme-packages/rt-material-v1.5.2.zip";
    themeRoot = await extractShopifyThemeForLiquid(orgId, themeVersionId, zipRel);
  }, 120_000);

  afterAll(async () => {
    const fs = await import("fs/promises");
    await fs.rm(themeRoot, { recursive: true, force: true });
  });

  it("resolves common storefront paths to existing templates", async () => {
    expect(path.join(themeRoot, "templates", "index.liquid")).not.toBe(path.join(process.cwd(), "templates", "index.liquid"));

    expect(await resolveShopifyLiquidInnerTemplate(themeRoot, [])).toBe("templates/index.liquid");
    expect(await resolveShopifyLiquidInnerTemplate(themeRoot, ["cart"])).toBe("templates/cart.liquid");
    expect(await resolveShopifyLiquidInnerTemplate(themeRoot, ["collections"])).toBe("templates/list-collections.liquid");
    expect(await resolveShopifyLiquidInnerTemplate(themeRoot, ["collections", "all"])).toBe("templates/collection.all.liquid");
    expect(await resolveShopifyLiquidInnerTemplate(themeRoot, ["collections", "sale"])).toBe("templates/collection.liquid");
    expect(await resolveShopifyLiquidInnerTemplate(themeRoot, ["products", "x"])).toBe("templates/product.liquid");
    expect(await resolveShopifyLiquidInnerTemplate(themeRoot, ["pages", "contact"])).toBe("templates/page.contact.liquid");
    expect(await resolveShopifyLiquidInnerTemplate(themeRoot, ["pages", "unknown"])).toBe("templates/page.liquid");
    expect(await resolveShopifyLiquidInnerTemplate(themeRoot, ["blogs", "news"])).toBe("templates/blog.liquid");
    expect(await resolveShopifyLiquidInnerTemplate(themeRoot, ["blogs", "news", "hello"])).toBe("templates/article.liquid");
    expect(await resolveShopifyLiquidInnerTemplate(themeRoot, ["search"])).toBe("templates/search.liquid");
    expect(await resolveShopifyLiquidInnerTemplate(themeRoot, ["account", "login"])).toBe("templates/customers/login.liquid");
    expect(await resolveShopifyLiquidInnerTemplate(themeRoot, ["account"])).toBe("templates/customers/account.liquid");
  });
});
